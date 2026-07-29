'use server';

import { getDb } from '@/db';
import { directory } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateDirectoryStatusSchema = z.object({
  directoryId: z.string().min(1, 'Directory ID is required'),
  status: z.enum(['active', 'pending', 'rejected']),
});

/**
 * Update directory status (admin only)
 */
export const updateDirectoryStatusAction = adminActionClient
  .schema(updateDirectoryStatusSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { directoryId, status } = parsedInput;
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

      // Update directory status
      await db
        .update(directory)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(directory.id, directoryId));

      return {
        success: true,
        data: {
          directoryId,
          status,
        },
      };
    } catch (error) {
      console.error('Update directory status error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update directory status',
      };
    }
  });
