'use server';

import { getDb } from '@/db';
import { dealEvent } from '@/db/schema';
import { desc } from 'drizzle-orm';

export type DealEvent = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
};

/**
 * Get all deal events for public display
 * Returns list of deal events ordered by createdAt desc
 */
export async function getPublicDealEventsAction() {
  try {
    const db = await getDb();

    const items = await db
      .select({
        id: dealEvent.id,
        name: dealEvent.name,
        type: dealEvent.type,
        description: dealEvent.description,
        status: dealEvent.status,
        startDate: dealEvent.startDate,
        endDate: dealEvent.endDate,
        createdAt: dealEvent.createdAt,
      })
      .from(dealEvent)
      .orderBy(desc(dealEvent.createdAt));

    return {
      success: true,
      data: items as DealEvent[],
    };
  } catch (error) {
    console.error('get public deal events error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch deal events',
      data: [],
    };
  }
}
