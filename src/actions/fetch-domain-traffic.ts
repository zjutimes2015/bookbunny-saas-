'use server';

import { getDb } from '@/db';
import { domain, domainTrafficHistory } from '@/db/schema';
import { userActionClient } from '@/lib/safe-action';
import { fetchSimilarwebData } from '@/lib/similarweb';
import { extractDomain } from '@/lib/urls/urls';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const fetchDomainTrafficSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  forceRefresh: z.boolean().optional().default(false),
});

/**
 * Server action to fetch domain traffic from Similarweb and save to database
 */
export const fetchDomainTrafficAction = userActionClient
  .schema(fetchDomainTrafficSchema)
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

      // Check if we already have recent traffic data (within last 30 days)
      // Skip cache check if forceRefresh is true
      if (!forceRefresh) {
        const recentTraffic = await db
          .select()
          .from(domainTrafficHistory)
          .where(eq(domainTrafficHistory.domain, normalizedUrl))
          .orderBy(desc(domainTrafficHistory.createdAt))
          .limit(1);

        // If we have recent data (within 30 days), extract and return it
        if (recentTraffic.length > 0) {
          const latestRecord = recentTraffic[0];
          const daysSinceUpdate =
            (Date.now() - latestRecord.createdAt.getTime()) /
            (1000 * 60 * 60 * 24);

          if (daysSinceUpdate < 30) {
            // Extract traffic from cached data
            const apiData = latestRecord.data as {
              Traffic?: { Visits?: Record<string, number> };
            };
            const visits = apiData.Traffic?.Visits || {};
            const sortedDates = Object.keys(visits).sort();
            const latestTraffic =
              sortedDates.length > 0
                ? (visits[sortedDates[sortedDates.length - 1]] ?? null)
                : null;

            // Update domain table with the extracted traffic value
            if (latestTraffic !== null) {
              await db
                .update(domain)
                .set({
                  traffic: latestTraffic,
                  updatedAt: new Date(),
                })
                .where(eq(domain.id, domainId));
            }

            // Return cached data
            return {
              success: true,
              data: {
                traffic: latestTraffic,
              },
            };
          }
        }
      }

      // Fetch traffic metrics from Similarweb API
      const apiData = await fetchSimilarwebData(normalizedUrl);

      // Extract traffic data for domain table update
      const visits = apiData.Traffic?.Visits || {};
      const sortedDates = Object.keys(visits).sort();
      const latestTraffic =
        sortedDates.length > 0
          ? (visits[sortedDates[sortedDates.length - 1]] ?? null)
          : null;

      // Update domain table with latest traffic value
      await db
        .update(domain)
        .set({
          traffic: latestTraffic,
          updatedAt: new Date(),
        })
        .where(eq(domain.id, domainId));

      // Insert complete API response into domain_traffic_history table
      await db.insert(domainTrafficHistory).values({
        id: nanoid(),
        domainId,
        domain: normalizedUrl,
        data: apiData, // Store complete API response as JSONB
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        data: {
          traffic: latestTraffic,
        },
      };
    } catch (error) {
      console.error('Fetch domain traffic error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch domain traffic',
      };
    }
  });
