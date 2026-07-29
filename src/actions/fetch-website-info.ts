'use server';

import { fetchWebsiteInfo } from '@/lib/firecrawl';
import { userActionClient } from '@/lib/safe-action';
import { z } from 'zod';

const fetchWebsiteInfoSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

/**
 * Server action to fetch website information using Firecrawl
 */
export const fetchWebsiteInfoAction = userActionClient
  .schema(fetchWebsiteInfoSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { url } = parsedInput;
      const info = await fetchWebsiteInfo(url);

      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error('Fetch website info error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch website info',
      };
    }
  });
