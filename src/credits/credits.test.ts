import { beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeCredits } from './credits';
import { CREDIT_TRANSACTION_TYPE } from './types';

// Mock the db module
vi.mock('@/db', () => ({
  getDb: vi.fn(),
}));

import { getDb } from '@/db';

describe('consumeCredits', () => {
  const mockTx = {
    select: vi.fn(() => mockTx),
    from: vi.fn(() => mockTx),
    where: vi.fn(() => mockTx),
    for: vi.fn(() => mockTx),
    limit: vi.fn(() => mockTx),
    orderBy: vi.fn(() => mockTx),
    update: vi.fn(() => mockTx),
    set: vi.fn(() => mockTx),
    insert: vi.fn(() => mockTx),
    values: vi.fn(() => Promise.resolve()),
    and: vi.fn(() => mockTx),
    or: vi.fn(() => mockTx),
    eq: vi.fn(() => mockTx),
    gt: vi.fn(() => mockTx),
    not: vi.fn(() => mockTx),
    asc: vi.fn(() => mockTx),
    isNull: vi.fn(() => mockTx),
  };

  const mockDb = {
    transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) =>
      fn(
        mockTx as unknown as Parameters<typeof mockDb.transaction>[0] extends (
          tx: infer T
        ) => unknown
          ? T
          : never
      )
    ),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);
  });

  it('should reject invalid parameters', async () => {
    await expect(
      consumeCredits({ userId: '', amount: 10, description: 'test' })
    ).rejects.toThrow('Invalid params');

    await expect(
      consumeCredits({ userId: 'user1', amount: 0, description: 'test' })
    ).rejects.toThrow('Invalid amount');
  });

  it('should execute inside a transaction and lock userCredit row', async () => {
    // Setup: user has 100 credits
    mockTx.limit.mockResolvedValueOnce([{ currentCredits: 100 }]);
    // Setup: one credit transaction with 100 remaining
    mockTx.orderBy.mockResolvedValueOnce([{ id: 'tx1', remainingAmount: 100 }]);

    await consumeCredits({
      userId: 'user1',
      amount: 50,
      description: 'Test consumption',
    });

    // Verify transaction was used
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);

    // Verify row-level locking via FOR UPDATE
    expect(mockTx.for).toHaveBeenCalledWith('update');

    // Verify balance check happened inside transaction
    expect(mockTx.select).toHaveBeenCalled();
    expect(mockTx.from).toHaveBeenCalled();

    // Verify credit transaction was updated
    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        remainingAmount: 50,
      })
    );

    // Verify user credit balance was updated
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        currentCredits: 50,
      })
    );

    // Verify usage record was inserted inside transaction
    expect(mockTx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user1',
        type: CREDIT_TRANSACTION_TYPE.USAGE,
        amount: -50,
      })
    );
  });

  it('should throw when balance is insufficient inside transaction', async () => {
    mockTx.limit.mockResolvedValueOnce([{ currentCredits: 10 }]);

    await expect(
      consumeCredits({
        userId: 'user1',
        amount: 50,
        description: 'Overdraft attempt',
      })
    ).rejects.toThrow('Insufficient credits');

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.for).toHaveBeenCalledWith('update');
  });

  it('should detect credit inconsistency and throw', async () => {
    // User has 100 credits according to userCredit table
    mockTx.limit.mockResolvedValueOnce([{ currentCredits: 100 }]);
    // But transactions only sum to 30 (inconsistency)
    mockTx.orderBy.mockResolvedValueOnce([{ id: 'tx1', remainingAmount: 30 }]);

    await expect(
      consumeCredits({
        userId: 'user1',
        amount: 50,
        description: 'Inconsistent data',
      })
    ).rejects.toThrow('Credit transaction inconsistency detected');
  });
});
