import { getDb } from '@/db';
import { domain, domainTrafficHistory } from '@/db/schema';
import { unauthorizedResponse, validateBasicAuth } from '@/lib/cron-auth';
import { getAllDomains } from '@/lib/cron-helpers';
import { fetchSimilarwebData } from '@/lib/similarweb';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

/**
 * Update domain traffic metrics for all domains
 * This endpoint is designed to be called by a cron job (monthly)
 *
 * Process:
 * 1. Fetches all domains from domain table
 * 2. Fetches complete Similarweb API response for each domain
 * 3. Updates domain table with latest traffic value
 * 4. Stores complete API response in domain_traffic_history table
 */
export async function GET(request: Request) {
  // Validate basic authentication
  if (!validateBasicAuth(request)) {
    return unauthorizedResponse('update domain traffic');
  }

  const jobName = 'update-domain-traffic';
  console.log(`>>> ${jobName} start`);

  try {
    const db = await getDb();

    // Get all domains from domain table
    const domains = await getAllDomains();

    if (domains.length === 0) {
      console.log('No domains found to update');
      return NextResponse.json({
        message: 'No domains found to update',
        processedCount: 0,
        errorCount: 0,
        totalDomains: 0,
      });
    }

    console.log(`Found ${domains.length} domains to update`);

    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ domain: string; error: string }> = [];

    // Process each domain
    for (const domainItem of domains) {
      // Only update mksaas.com domains for development
      if (
        process.env.NODE_ENV === 'development' &&
        !domainItem.url.includes('mksaas.com')
      ) {
        continue;
      }
      try {
        // Fetch complete API response from Similarweb API
        const apiData = await fetchSimilarwebData(domainItem.url);

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
          .where(eq(domain.id, domainItem.id));

        // Insert complete API response into domain_traffic_history table
        // SnapshotDate is already included in data, no need to store separately
        await db.insert(domainTrafficHistory).values({
          id: nanoid(),
          domainId: domainItem.id,
          domain: domainItem.url, // Store domain URL for optimized queries
          data: apiData, // Store complete API response as JSONB (includes SnapshotDate)
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        processedCount++;
        console.log(`Updated domain traffic for ${domainItem.url}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `Error updating domain traffic for ${domainItem.url}:`,
          errorMessage
        );
        errors.push({ domain: domainItem.url, error: errorMessage });
        errorCount++;
      }
    }

    console.log(
      `>>> ${jobName} end, processed: ${processedCount}, errors: ${errorCount}`
    );

    return NextResponse.json({
      success: true,
      message: `Update domain traffic completed, processed: ${processedCount}, errors: ${errorCount}`,
      totalDomains: domains.length,
      processedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error(`Error in ${jobName}:`, error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update domain traffic',
      },
      { status: 500 }
    );
  }
}
