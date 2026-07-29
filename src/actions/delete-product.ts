'use server';

import { getDb } from '@/db';
import { product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteProductSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Server action to delete a product
 */
export const deleteProductAction = userActionClient
  .schema(deleteProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Check if product exists and belongs to user
      const existingProduct = await db
        .select()
        .from(product)
        .where(
          and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
        )
        .limit(1);

      if (existingProduct.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission to delete it',
        };
      }

      // Delete product
      await db.delete(product).where(eq(product.id, parsedInput.productId));

      return {
        success: true,
        data: {
          productId: parsedInput.productId,
        },
      };
    } catch (error) {
      console.error('Delete product error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete product',
      };
    }
  });
