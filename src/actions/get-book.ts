'use server';

import { getDb } from '@/db';
import { book, bookCharacter, bookStory } from '@/db/schema';
import { authActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Get a single book by ID with character and story data
 *
 * Only returns books belonging to the current user
 */
const getBookSchema = z.object({
  bookId: z.string().uuid(),
});

export const getBookAction = authActionClient
  .schema(getBookSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.user.id;
    const db = await getDb();

    const result = await db
      .select()
      .from(book)
      .leftJoin(bookCharacter, eq(book.characterId, bookCharacter.id))
      .leftJoin(bookStory, eq(book.storyId, bookStory.id))
      .where(and(eq(book.id, parsedInput.bookId), eq(book.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    return {
      book: row.book,
      character: row.book_character,
      story: row.book_story,
    };
  });