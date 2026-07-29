import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Story generation options
 */
interface StoryOptions {
  theme: string;
  ageGroup: string;
  characterName: string;
  pages?: number;
}

/**
 * Story generation result
 */
interface StoryResult {
  title: string;
  pages: string[];
}

/**
 * Story schema for structured AI output
 */
const storySchema = z.object({
  title: z.string().describe('The title of the children story'),
  pages: z
    .array(z.string())
    .describe('Array of page texts, one short sentence per page'),
});

/**
 * Generate a children's story using AI
 *
 * Migrated from BookBunny's lib/api/story.ts
 * Now uses AI SDK (generateObject) instead of raw fetch for type safety
 *
 * @param options - Story generation options
 * @returns Generated story with title and pages
 */
export async function generateStory(
  options: StoryOptions
): Promise<StoryResult> {
  const pageCount = options.pages || 20;

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const prompt = `You are a professional children's book author. Write a children's story with the following parameters:

- Theme: ${options.theme}
- Target Age: ${options.ageGroup}
- Main Character: ${options.characterName}
- Number of pages: ${pageCount}

Write EXACTLY ${pageCount} short sentences, one per page. Each sentence should be 10-20 words, simple, engaging, and age-appropriate.

The story should have a clear beginning, middle, and end. Each page should be visually descriptive so an illustrator can draw it.`;

  const { object } = await generateObject({
    model: openrouter.chat('deepseek/deepseek-chat'),
    schema: storySchema,
    system:
      "You are a children's book author. Respond only with valid JSON containing a title and an array of page texts.",
    prompt,
    temperature: 0.8,
    maxOutputTokens: 4000,
  });

  return object;
}
