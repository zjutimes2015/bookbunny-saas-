'use server';

import { getDb } from '@/db';
import { product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProductPrivacySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  private: z.boolean(),
});

/**
 * Server action to update product privacy setting
 * When private is true, the product won't appear in leaderboard
 */
export const updateProductPrivacyAction = userActionClient
  .schema(updateProductPrivacySchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Check if product exists and belongs to user
      const existingProduct = await db
        .select({ id: product.id })
        .from(product)
        .where(
          and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
        )
        .limit(1);

      if (existingProduct.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission to edit it',
        };
      }

      // Update product privacy
      await db
        .update(product)
        .set({
          private: parsedInput.private,
          updatedAt: new Date(),
        })
        .where(eq(product.id, parsedInput.productId));

      return {
        success: true,
        data: {
          id: parsedInput.productId,
          private: parsedInput.private,
        },
      };
    } catch (error) {
      console.error('Update product privacy error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update product privacy',
      };
    }
  });
