import { getDb } from '@/db';
import { domain, domainDrHistory } from '@/db/schema';
import { fetchDomainRating } from '@/lib/ahrefs';
import { unauthorizedResponse, validateBasicAuth } from '@/lib/cron-auth';
import { getAllDomains } from '@/lib/cron-helpers';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

/**
 * Update domain rating (DR) and AhRank for all domains
 * This endpoint is designed to be called by a cron job
 *
 * Process:
 * 1. Fetches all domains from domain table
 * 2. Fetches domain metrics from Ahrefs API for each domain
 * 3. Updates domain table with latest DR and AhRank values
 * 4. Stores historical data in domain_dr_history table
 */
export async function GET(request: Request) {
  // Validate basic authentication
  if (!validateBasicAuth(request)) {
    return unauthorizedResponse('update domain rating');
  }

  const jobName = 'update-domain-rating';
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
        // Fetch domain metrics from Ahrefs API
        const domainMetrics = await fetchDomainRating(domainItem.url);

        // Round domainRating to integer (API may return decimals like 3.7, 4.4)
        const roundedDomainRating = domainMetrics.domainRating
          ? Math.round(domainMetrics.domainRating)
          : null;

        // Update domain table with latest values
        await db
          .update(domain)
          .set({
            domainRating: roundedDomainRating,
            ahRank: domainMetrics.ahRank,
            updatedAt: new Date(),
          })
          .where(eq(domain.id, domainItem.id));

        // Insert into domain_dr_history table for historical tracking
        await db.insert(domainDrHistory).values({
          id: nanoid(),
          domainId: domainItem.id,
          domain: domainItem.url, // Store domain URL for optimized queries
          domainRating: roundedDomainRating,
          ahRank: domainMetrics.ahRank,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        processedCount++;
        console.log(`Updated DR for ${domainItem.url}: ${roundedDomainRating}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `Error updating domain rating for ${domainItem.url}:`,
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
      message: `Update domain rating completed, processed: ${processedCount}, errors: ${errorCount}`,
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
            : 'Failed to update domain rating',
      },
      { status: 500 }
    );
  }
}
