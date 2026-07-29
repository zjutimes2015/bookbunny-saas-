'use server';

import { getDb } from '@/db';
import { dealEvent } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateDealEventSchema = z.object({
  dealEventId: z.string().min(1, 'Deal event ID is required'),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const updateDealEventAction = adminActionClient
  .schema(updateDealEventSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { dealEventId, name, description, status, startDate, endDate } =
        parsedInput;

      const db = await getDb();

      // Build update data
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        updateData.name = name;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
      if (startDate !== undefined) {
        updateData.startDate = startDate;
      }
      if (endDate !== undefined) {
        updateData.endDate = endDate;
      }

      // Update deal event
      const [updated] = await db
        .update(dealEvent)
        .set(updateData)
        .where(eq(dealEvent.id, dealEventId))
        .returning();

      if (!updated) {
        return {
          success: false,
          error: 'Deal event not found',
        };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      console.error('update deal event error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update deal event',
      };
    }
  });
