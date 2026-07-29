'use server';

import { getDb } from '@/db';
import { book, bookCharacter, bookStory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Schema for saving a character
 */
const saveCharacterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  imageUrl: z.string().optional(),
  style: z.string().default('watercolor'),
  refSeed: z.number().optional(),
  promptTemplate: z.string().optional(),
});

/**
 * Schema for saving a story
 */
const saveStorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.array(z.string()),
  ageGroup: z.string().default('3-5'),
  theme: z.string().default(''),
});

/**
 * Schema for saving a book
 */
const saveBookSchema = z.object({
  character: saveCharacterSchema,
  story: saveStorySchema,
  pageImageUrls: z.array(z.string()).optional(),
  status: z.enum(['draft', 'generating', 'ready', 'exported']).default('draft'),
  format: z.string().default('8.5x8.5'),
});

/**
 * Save a complete book with character, story, and images.
 *
 * Returns the created book ID on success.
 */
export const saveBookAction = userActionClient
  .schema(saveBookSchema)
  .action(async ({ parsedInput, ctx }) => {
    const currentUser = (ctx as { user: User }).user;
    const userId = currentUser.id;
    const db = await getDb();

    // 1. Save character
    const [character] = await db
      .insert(bookCharacter)
      .values({
        userId,
        name: parsedInput.character.name,
        imageUrl: parsedInput.character.imageUrl ?? null,
        style: parsedInput.character.style,
        refSeed: parsedInput.character.refSeed ?? null,
        promptTemplate: parsedInput.character.promptTemplate ?? null,
      })
      .returning();

    // 2. Save story
    const [story] = await db
      .insert(bookStory)
      .values({
        userId,
        title: parsedInput.story.title,
        content: parsedInput.story.content,
        ageGroup: parsedInput.story.ageGroup,
        theme: parsedInput.story.theme,
      })
      .returning();

    // 3. Save book linking character + story
    const [savedBook] = await db
      .insert(book)
      .values({
        userId,
        title: parsedInput.story.title,
        characterId: character.id,
        storyId: story.id,
        pageImageUrls: parsedInput.pageImageUrls ?? null,
        status: parsedInput.status,
        format: parsedInput.format,
      })
      .returning();

    return {
      success: true,
      bookId: savedBook.id,
      characterId: character.id,
      storyId: story.id,
    };
  });

/**
 * Update book status (e.g. after generation completes or user exports)
 */
const updateBookStatusSchema = z.object({
  bookId: z.string().uuid(),
  status: z.enum(['draft', 'generating', 'ready', 'exported']),
  pageImageUrls: z.array(z.string()).optional(),
});

export const updateBookStatusAction = userActionClient
  .schema(updateBookStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const currentUser = (ctx as { user: User }).user;
    const userId = currentUser.id;
    const db = await getDb();

    const updates: Record<string, unknown> = {
      status: parsedInput.status,
      updatedAt: new Date(),
    };
    if (parsedInput.pageImageUrls !== undefined) {
      updates.pageImageUrls = parsedInput.pageImageUrls;
    }

    await db
      .update(book)
      .set(updates)
      .where(
        sql`${book.id} = ${parsedInput.bookId} AND ${book.userId} = ${userId}`
      );

    return { success: true };
  });
