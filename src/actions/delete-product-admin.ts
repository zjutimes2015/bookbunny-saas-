'use server';

import { getDb } from '@/db';
import { product } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteProductAdminSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Server action to delete a product (admin only)
 */
export const deleteProductAdminAction = adminActionClient
  .schema(deleteProductAdminSchema)
  .action(async ({ parsedInput }) => {
    try {
      const db = await getDb();

      // Check if product exists
      const existingProduct = await db
        .select()
        .from(product)
        .where(eq(product.id, parsedInput.productId))
        .limit(1);

      if (existingProduct.length === 0) {
        return {
          success: false,
          error: 'Product not found',
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
      console.error('Delete product admin error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete product',
      };
    }
  });
