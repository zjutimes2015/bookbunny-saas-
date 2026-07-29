'use server';

import { getDb } from '@/db';
import { domain, domainDrHistory } from '@/db/schema';
import { fetchDomainRating } from '@/lib/ahrefs';
import { userActionClient } from '@/lib/safe-action';
import { extractDomain } from '@/lib/urls/urls';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const fetchDomainRatingSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  forceRefresh: z.boolean().optional().default(false),
});

/**
 * Server action to fetch domain rating from Ahrefs and save to database
 */
export const fetchDomainRatingAction = userActionClient
  .schema(fetchDomainRatingSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { url, forceRefresh } = parsedInput;
      const db = await getDb();

      // Normalize URL
      const normalizedUrl = extractDomain(url);

      // Check if domain exists in database (before API call to reduce race conditions)
      let existingDomain = await db
        .select()
        .from(domain)
        .where(eq(domain.url, normalizedUrl))
        .limit(1);

      let domainId: string;

      if (existingDomain.length > 0) {
        domainId = existingDomain[0].id;
      } else {
        // Create new domain if it doesn't exist
        // Handle potential race condition if both metrics are fetched simultaneously
        try {
          domainId = nanoid();
          await db.insert(domain).values({
            id: domainId,
            url: normalizedUrl,
          });
        } catch (error) {
          // If insert fails due to unique constraint, domain was created by another request
          // Re-query to get the domain ID
          existingDomain = await db
            .select()
            .from(domain)
            .where(eq(domain.url, normalizedUrl))
            .limit(1);
          if (existingDomain.length > 0) {
            domainId = existingDomain[0].id;
          } else {
            throw new Error('Failed to create or find domain');
          }
        }
      }

      // Check if we already have recent DR data (within last 7 days)
      // Skip cache check if forceRefresh is true
      if (!forceRefresh) {
        const recentDrData = await db
          .select()
          .from(domainDrHistory)
          .where(eq(domainDrHistory.domain, normalizedUrl))
          .orderBy(desc(domainDrHistory.createdAt))
          .limit(1);

        // If we have recent data (within 7 days), return it instead of fetching from API
        if (recentDrData.length > 0) {
          const latestRecord = recentDrData[0];
          const daysSinceUpdate =
            (Date.now() - latestRecord.createdAt.getTime()) /
            (1000 * 60 * 60 * 24);

          if (daysSinceUpdate < 7) {
            // Return cached data
            return {
              success: true,
              data: {
                domainRating: latestRecord.domainRating,
                ahRank: latestRecord.ahRank,
              },
            };
          }
        }
      }

      // Fetch domain metrics from Ahrefs API
      const metrics = await fetchDomainRating(normalizedUrl);

      // Round domainRating to integer (API may return decimals like 3.7, 4.4)
      const roundedDomainRating = metrics.domainRating
        ? Math.round(metrics.domainRating)
        : null;

      // Update domain table with latest values
      await db
        .update(domain)
        .set({
          domainRating: roundedDomainRating,
          ahRank: metrics.ahRank,
          updatedAt: new Date(),
        })
        .where(eq(domain.id, domainId));

      // Insert into domain_dr_history table for historical tracking
      await db.insert(domainDrHistory).values({
        id: nanoid(),
        domainId,
        domain: normalizedUrl,
        domainRating: roundedDomainRating,
        ahRank: metrics.ahRank,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: {
          domainRating: roundedDomainRating,
          ahRank: metrics.ahRank,
        },
      };
    } catch (error) {
      console.error('Fetch domain rating error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch domain rating',
      };
    }
  });
