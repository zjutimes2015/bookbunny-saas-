'use server';

import { getDb } from '@/db';
import { dealEvent } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { desc } from 'drizzle-orm';

export type DealEventOption = {
  id: string;
  name: string;
  type: string;
};

/**
 * Get all deal events for admin filter options
 * Returns list of deal events ordered by createdAt desc
 */
export const getAllDealEventsAction = adminActionClient.action(async () => {
  try {
    const db = await getDb();

    const items = await db
      .select({
        id: dealEvent.id,
        name: dealEvent.name,
        type: dealEvent.type,
      })
      .from(dealEvent)
      .orderBy(desc(dealEvent.createdAt));

    return {
      success: true,
      data: items as DealEventOption[],
    };
  } catch (error) {
    console.error('get all deal events error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch deal events',
      data: [],
    };
  }
});
