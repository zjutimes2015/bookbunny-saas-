'use server';

import { getDb } from '@/db';
import { dealEvent, productDeal } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteDealEventSchema = z.object({
  dealEventId: z.string().min(1, 'Deal event ID is required'),
});

export const deleteDealEventAction = adminActionClient
  .schema(deleteDealEventSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { dealEventId } = parsedInput;

      const db = await getDb();

      // Check if there are any product deals associated with this event
      const existingProductDeals = await db
        .select({ id: productDeal.id })
        .from(productDeal)
        .where(eq(productDeal.dealEventId, dealEventId))
        .limit(1);

      if (existingProductDeals.length > 0) {
        return {
          success: false,
          error:
            'Cannot delete deal event with associated products. Please remove all products from this deal first.',
        };
      }

      // Delete deal event
      const [deleted] = await db
        .delete(dealEvent)
        .where(eq(dealEvent.id, dealEventId))
        .returning();

      if (!deleted) {
        return {
          success: false,
          error: 'Deal event not found',
        };
      }

      return {
        success: true,
        data: deleted,
      };
    } catch (error) {
      console.error('delete deal event error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete deal event',
      };
    }
  });
