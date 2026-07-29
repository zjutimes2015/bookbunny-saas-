'use server';

import { getDb } from '@/db';
import { dealEvent } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createDealEventSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const createDealEventAction = adminActionClient
  .schema(createDealEventSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { name, type, description, status, startDate, endDate } =
        parsedInput;

      const db = await getDb();

      // Create deal event
      const [created] = await db
        .insert(dealEvent)
        .values({
          id: nanoid(),
          name,
          type,
          description: description || null,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      console.error('create deal event error:', error);
      // Check for unique constraint violation on type
      if (
        error instanceof Error &&
        error.message.includes('unique constraint')
      ) {
        return {
          success: false,
          error: 'A deal event with this type already exists',
        };
      }
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create deal event',
      };
    }
  });
