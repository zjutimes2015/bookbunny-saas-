'use server';

import { getDb } from '@/db';
import { productDirectory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const updateProductDirectoryStatusSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  directoryId: z.string().min(1, 'Directory ID is required'),
  status: z.enum(['unknown', 'submitted', 'approved', 'rejected']),
  notes: z.string().optional(),
});

/**
 * Update product directory status
 */
export const updateProductDirectoryStatusAction = userActionClient
  .schema(updateProductDirectoryStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const { productId, directoryId, status, notes } = parsedInput;

      const db = await getDb();

      // Verify product belongs to current user
      // const productRecord = await db
      //   .select()
      //   .from(product)
      //   .where(and(eq(product.id, productId), eq(product.userId, userId)))
      //   .limit(1);

      // if (productRecord.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Product not found or you do not have permission',
      //   };
      // }

      // Check if productDirectory record exists
      const existingRecord = await db
        .select()
        .from(productDirectory)
        .where(
          and(
            eq(productDirectory.productId, productId),
            eq(productDirectory.directoryId, directoryId)
          )
        )
        .limit(1);

      if (status === 'unknown') {
        // If status is unknown, delete the record if it exists
        // (unknown is the default state, no need to store it)
        if (existingRecord.length > 0) {
          await db
            .delete(productDirectory)
            .where(
              and(
                eq(productDirectory.productId, productId),
                eq(productDirectory.directoryId, directoryId)
              )
            );
        }
        // If record doesn't exist, do nothing (null is the default)
      } else {
        // For non-unknown statuses, update or create the record
        if (existingRecord.length > 0) {
          // Update existing record
          await db
            .update(productDirectory)
            .set({
              status,
              notes: notes ?? existingRecord[0].notes,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(productDirectory.productId, productId),
                eq(productDirectory.directoryId, directoryId)
              )
            );
        } else {
          // Create new record
          await db.insert(productDirectory).values({
            id: nanoid(),
            productId,
            directoryId,
            status,
            notes: notes ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return {
        success: true,
        data: {
          productId,
          directoryId,
          status,
          notes: notes ?? null,
        },
      };
    } catch (error) {
      console.error('Update product directory status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update product directory status',
      };
    }
  });
