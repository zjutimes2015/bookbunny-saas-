'use server';

import { getDb } from '@/db';
import { directory, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const cancelDirectoryApplicationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Cancel directory application by deleting pending directory record
 */
export const cancelDirectoryApplicationAction = userActionClient
  .schema(cancelDirectoryApplicationSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const { productId } = parsedInput;
      const db = await getDb();

      // Verify product exists and belongs to current user
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

      // Find pending or rejected directory for this domain that belongs to this product
      // Only user-sourced directories can be cancelled
      const existingDirectory = await db
        .select()
        .from(directory)
        .where(
          and(
            eq(directory.domainId, productData.domainId),
            eq(directory.source, 'user'),
            eq(directory.productId, productData.id)
          )
        )
        .limit(1);

      if (existingDirectory.length === 0) {
        return {
          success: false,
          error: 'No application found to cancel',
        };
      }

      const directoryRecord = existingDirectory[0];

      // Only allow cancelling pending or rejected applications
      if (
        directoryRecord.status !== 'pending' &&
        directoryRecord.status !== 'rejected'
      ) {
        return {
          success: false,
          error: 'Only pending or rejected applications can be cancelled',
        };
      }

      // Delete the pending directory record
      await db
        .delete(directory)
        .where(eq(directory.id, existingDirectory[0].id));

      return {
        success: true,
        data: {
          directoryId: existingDirectory[0].id,
        },
      };
    } catch (error) {
      console.error('Cancel directory application error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to cancel directory application',
      };
    }
  });
