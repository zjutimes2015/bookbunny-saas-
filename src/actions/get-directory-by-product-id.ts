'use server';

import { getDb } from '@/db';
import { directory, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const getDirectoryByProductIdSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Get directory by product ID for current user
 * This checks if the product's domain already exists in the directory table
 */
export const getDirectoryByProductIdAction = userActionClient
  .schema(getDirectoryByProductIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const { productId } = parsedInput;
      const db = await getDb();

      // Verify product belongs to current user
      const productRecord = await db
        .select()
        .from(product)
        .where(and(eq(product.id, productId), eq(product.userId, userId)))
        .limit(1);

      if (productRecord.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission',
        };
      }

      const productData = productRecord[0];

      // Get directory by domain ID and product ID
      // Priority:
      // 1. User's own directory for this product
      // 2. System directory for this domain
      // 3. Any other directory for this domain
      const userDirectory = await db
        .select()
        .from(directory)
        .where(
          and(
            eq(directory.domainId, productData.domainId),
            eq(directory.productId, productData.id)
          )
        )
        .limit(1);

      if (userDirectory.length > 0) {
        return {
          success: true,
          data: userDirectory[0],
        };
      }

      // Check for system directory
      const systemDirectory = await db
        .select()
        .from(directory)
        .where(
          and(
            eq(directory.domainId, productData.domainId),
            eq(directory.source, 'system')
          )
        )
        .limit(1);

      if (systemDirectory.length > 0) {
        return {
          success: true,
          data: systemDirectory[0],
        };
      }

      // Check for any other directory (from other users)
      const anyDirectory = await db
        .select()
        .from(directory)
        .where(eq(directory.domainId, productData.domainId))
        .limit(1);

      if (anyDirectory.length > 0) {
        return {
          success: true,
          data: anyDirectory[0],
        };
      }

      return {
        success: true,
        data: null,
      };
    } catch (error) {
      console.error('Get directory by product ID error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch directory status',
      };
    }
  });
