'use server';

import { getDb } from '@/db';
import { dealEvent, product, productDeal } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteProductDealSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  dealEventId: z.string().min(1, 'Deal event ID is required'),
});

/**
 * Delete product deal for current user
 */
export const deleteProductDealAction = userActionClient
  .schema(deleteProductDealSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Verify product belongs to current user
      const productRecord = await db
        .select()
        .from(product)
        .where(
          and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
        )
        .limit(1);

      if (productRecord.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission',
        };
      }

      // Check if deal event exists and is active (only allow deletion if active)
      const eventRecord = await db
        .select()
        .from(dealEvent)
        .where(eq(dealEvent.id, parsedInput.dealEventId))
        .limit(1);

      if (eventRecord.length === 0) {
        return {
          success: false,
          error: 'Deal event not found',
        };
      }

      if (eventRecord[0].status !== 'active') {
        return {
          success: false,
          error: 'Cannot delete deal from inactive event',
        };
      }

      // Check if deal exists
      const existingDeal = await db
        .select()
        .from(productDeal)
        .where(
          and(
            eq(productDeal.productId, parsedInput.productId),
            eq(productDeal.dealEventId, parsedInput.dealEventId)
          )
        )
        .limit(1);

      if (existingDeal.length === 0) {
        return {
          success: false,
          error: 'Deal not found',
        };
      }

      // Delete deal
      await db
        .delete(productDeal)
        .where(eq(productDeal.id, existingDeal[0].id));

      return {
        success: true,
        data: {
          productId: parsedInput.productId,
          dealEventId: parsedInput.dealEventId,
        },
      };
    } catch (error) {
      console.error('Delete product deal error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete product deal',
      };
    }
  });
