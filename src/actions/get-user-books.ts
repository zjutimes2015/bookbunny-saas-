'use server';

import { getDb } from '@/db';
import { book, bookCharacter, bookStory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { desc, sql } from 'drizzle-orm';

/**
 * Get all books for the current authenticated user.
 *
 * Returns books joined with character and story info.
 */
export const getUserBooksAction = userActionClient.action(
  async ({ ctx }) => {
    const currentUser = (ctx as { user: User }).user;
    const userId = currentUser.id;
    const db = await getDb();

    const rows = await db
      .select({
        id: book.id,
        title: book.title,
        status: book.status,
        format: book.format,
        pageImageUrls: book.pageImageUrls,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        characterName: bookCharacter.name,
        characterImageUrl: bookCharacter.imageUrl,
        storyContent: bookStory.content,
        ageGroup: bookStory.ageGroup,
        theme: bookStory.theme,
      })
      .from(book)
      .leftJoin(bookCharacter, sql`${book.characterId} = ${bookCharacter.id}`)
      .leftJoin(bookStory, sql`${book.storyId} = ${bookStory.id}`)
      .where(sql`${book.userId} = ${userId}`)
      .orderBy(desc(book.createdAt));

    return { success: true, books: rows };
  }
);

/**
 * Get a single book by ID (ensuring it belongs to the current user).
 */
export const getBookByIdAction = userActionClient.action(
  async ({ ctx, parsedInput }) => {
    const currentUser = (ctx as { user: User }).user;
    const userId = currentUser.id;
    const bookId = (parsedInput as { bookId: string }).bookId;

    const db = await getDb();

    const [row] = await db
      .select({
        id: book.id,
        title: book.title,
        status: book.status,
        format: book.format,
        pageImageUrls: book.pageImageUrls,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        characterName: bookCharacter.name,
        characterImageUrl: bookCharacter.imageUrl,
        characterStyle: bookCharacter.style,
        storyContent: bookStory.content,
        ageGroup: bookStory.ageGroup,
        theme: bookStory.theme,
      })
      .from(book)
      .leftJoin(bookCharacter, sql`${book.characterId} = ${bookCharacter.id}`)
      .leftJoin(bookStory, sql`${book.storyId} = ${bookStory.id}`)
      .where(sql`${book.id} = ${bookId} AND ${book.userId} = ${userId}`)
      .limit(1);

    if (!row) {
      return { success: false, error: 'Book not found' };
    }

    return { success: true, book: row };
  }
);
