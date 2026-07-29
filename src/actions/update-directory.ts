'use server';

import { getDb } from '@/db';
import { directory } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateDirectorySchema = z.object({
  directoryId: z.string().min(1, 'Directory ID is required'),
  pricing: z.enum(['free', 'paid', 'mixed']).optional(),
  category: z
    .enum([
      'AI Tools',
      'Anything',
      'Dev Tools',
      'Boilerplates',
      'Open Source',
      'Directories',
    ])
    .optional(),
  dofollow: z.boolean().optional(),
  account: z.boolean().optional(),
  status: z.enum(['active', 'pending', 'rejected']).optional(),
  rejectedReason: z.string().optional().nullable(),
});

/**
 * Update directory information (admin only)
 */
export const updateDirectoryAction = adminActionClient
  .schema(updateDirectorySchema)
  .action(async ({ parsedInput }) => {
    try {
      const {
        directoryId,
        pricing,
        category,
        dofollow,
        account,
        status,
        rejectedReason,
      } = parsedInput;
      const db = await getDb();

      // Check if directory exists
      const existingDirectory = await db
        .select()
        .from(directory)
        .where(eq(directory.id, directoryId))
        .limit(1);

      if (existingDirectory.length === 0) {
        return {
          success: false,
          error: 'Directory not found',
        };
      }

      // Build update object with only provided fields
      const updateData: {
        pricing?: string;
        category?: string;
        dofollow?: boolean;
        account?: boolean;
        status?: string;
        rejectedReason?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (pricing !== undefined) {
        updateData.pricing = pricing;
      }
      if (category !== undefined) {
        updateData.category = category;
      }
      if (dofollow !== undefined) {
        updateData.dofollow = dofollow;
      }
      if (account !== undefined) {
        updateData.account = account;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
      if (rejectedReason !== undefined) {
        updateData.rejectedReason = rejectedReason;
      }

      // Update directory
      const updatedDirectory = await db
        .update(directory)
        .set(updateData)
        .where(eq(directory.id, directoryId))
        .returning();

      return {
        success: true,
        data: updatedDirectory[0],
      };
    } catch (error) {
      console.error('Update directory error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update directory',
      };
    }
  });
