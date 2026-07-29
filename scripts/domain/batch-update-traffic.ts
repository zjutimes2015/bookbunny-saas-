import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../../src/db/index.js';
import { domain, domainTrafficHistory } from '../../src/db/schema.js';
import { fetchSimilarwebData } from '../../src/lib/similarweb.js';

// Load environment variables
// Supports ENV_FILE env var or defaults to .env
// For production: ENV_FILE=.env.production tsx scripts/dr/batch-update-traffic.ts
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile, override: true });
// Also try .env.prod as fallback for production
if (envFile === '.env.production' || envFile === '.env.prod') {
  dotenv.config({ path: '.env.prod', override: true });
  dotenv.config({ path: '.env.production', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Progress file path
const PROGRESS_FILE = path.join(
  __dirname,
  'batch-update-traffic-progress.json'
);

interface ProgressData {
  processedDomainIds: string[];
  lastUpdated: string;
}

interface DomainItem {
  id: string;
  url: string;
}

/**
 * Load progress from file
 */
function loadProgress(): ProgressData | null {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    return JSON.parse(content) as ProgressData;
  } catch (error) {
    console.error('❌ Failed to load progress file:', error);
    return null;
  }
}

/**
 * Save progress to file
 */
function saveProgress(processedDomainIds: string[]): void {
  const progress: ProgressData = {
    processedDomainIds,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Failed to save progress file:', error);
  }
}

/**
 * Clear progress file
 */
function clearProgress(): void {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('✅ Progress file cleared\n');
    } catch (error) {
      console.error('❌ Failed to clear progress file:', error);
    }
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = {
    domain: null as string | null,
    resume: false,
    clearProgress: false,
  };

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--domain' && i + 1 < process.argv.length) {
      args.domain = process.argv[i + 1];
      i++; // Skip next argument as it's the value
    } else if (arg === '--resume') {
      args.resume = true;
    } else if (arg === '--clear-progress') {
      args.clearProgress = true;
    }
  }

  return args;
}

/**
 * Main batch update function
 */
async function batchUpdateDomainTraffic() {
  try {
    // Parse command line arguments
    const args = parseArgs();

    if (args.clearProgress) {
      clearProgress();
    }

    // Verify database connection
    const db = await getDb();

    // Test database connection
    try {
      await db.select().from(domain).limit(1);
      console.log('✅ Database connection verified\n');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Database connection failed:', errorMessage);

      if (errorMessage.includes('does not exist')) {
        console.error('\n⚠️  The "domain" table does not exist.');
        console.error('Please run database migrations first:');
        console.error('   pnpm db:migrate');
        console.error('\nOr if you need to generate migrations first:');
        console.error('   pnpm db:generate');
        console.error('   pnpm db:migrate');
      } else {
        console.error('\nPlease ensure:');
        console.error('1. DATABASE_URL is set in .env file');
        console.error('2. Database migrations have been run (pnpm db:migrate)');
        console.error('3. The database is accessible');
      }
      process.exit(1);
    }

    // Check API key
    if (!process.env.RAPIDAPI_SIMILARWEB_KEY) {
      console.error('❌ RAPIDAPI_SIMILARWEB_KEY is not configured');
      console.error('Please set RAPIDAPI_SIMILARWEB_KEY in your .env file');
      process.exit(1);
    }

    let allDomains: DomainItem[];
    let domainsToProcess: DomainItem[];

    // If --domain is specified, only process that domain
    if (args.domain) {
      console.log(`🎯 Single domain mode: processing ${args.domain}\n`);

      const targetDomain = await db
        .select({
          id: domain.id,
          url: domain.url,
        })
        .from(domain)
        .where(eq(domain.url, args.domain))
        .limit(1);

      if (targetDomain.length === 0) {
        console.error(`❌ Domain "${args.domain}" not found in database`);
        console.error('💡 Make sure the domain exists in the domain table');
        process.exit(1);
      }

      allDomains = targetDomain;
      domainsToProcess = targetDomain;
      console.log(`📊 Found domain: ${args.domain}\n`);
    } else {
      // Batch mode: get all domains from database
      allDomains = await db
        .select({
          id: domain.id,
          url: domain.url,
        })
        .from(domain);

      if (allDomains.length === 0) {
        console.log('⚠️  No domains found in database');
        process.exit(0);
      }

      console.log(`📊 Found ${allDomains.length} domains in database\n`);

      // Load progress if resuming
      let processedDomainIds: Set<string> = new Set();
      if (args.resume) {
        const progress = loadProgress();
        if (progress) {
          processedDomainIds = new Set(progress.processedDomainIds);
          console.log(
            `📂 Resuming from progress: ${processedDomainIds.size} domains already processed\n`
          );
        }
      }

      // Filter out already processed domains
      domainsToProcess = allDomains.filter(
        (d) => !processedDomainIds.has(d.id)
      );

      if (domainsToProcess.length === 0) {
        console.log('✅ All domains have been processed');
        if (args.resume) {
          console.log('💡 Use --clear-progress to start fresh');
        }
        process.exit(0);
      }

      console.log(
        `🔄 Processing ${domainsToProcess.length} domains (${allDomains.length - domainsToProcess.length} already processed)\n`
      );
    }

    // Rate limiting configuration
    // Default: 1 request per second (1000ms delay)
    // Can be overridden with RATE_LIMIT_MS env var
    const rateLimitMs = Number.parseInt(
      process.env.RATE_LIMIT_MS || '1000',
      10
    );

    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ domain: string; error: string }> = [];
    const currentProcessedIds: string[] = args.domain
      ? []
      : Array.from(new Set<string>());

    // Process each domain
    for (let i = 0; i < domainsToProcess.length; i++) {
      const domainItem = domainsToProcess[i];
      const progress = `[${i + 1}/${domainsToProcess.length}]`;

      try {
        console.log(
          `${progress} Fetching traffic data for ${domainItem.url}...`
        );

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
        await db.insert(domainTrafficHistory).values({
          id: nanoid(),
          domainId: domainItem.id,
          domain: domainItem.url,
          data: apiData, // Store complete API response as JSONB
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        processedCount++;
        if (!args.domain) {
          currentProcessedIds.push(domainItem.id);
          // Save progress every 10 domains or at the end (only in batch mode)
          if (processedCount % 10 === 0 || i === domainsToProcess.length - 1) {
            saveProgress(currentProcessedIds);
          }
        }

        console.log(
          `✅ ${progress} Updated traffic for ${domainItem.url}: ${latestTraffic ?? 'N/A'} visits`
        );

        // Rate limiting: wait before next request (except for last item)
        if (i < domainsToProcess.length - 1) {
          await sleep(rateLimitMs);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `❌ ${progress} Error updating domain traffic for ${domainItem.url}:`,
          errorMessage
        );
        errors.push({ domain: domainItem.url, error: errorMessage });
        errorCount++;

        // Save progress even on error to avoid reprocessing (only in batch mode)
        if (!args.domain) {
          currentProcessedIds.push(domainItem.id);
          saveProgress(currentProcessedIds);
        }

        // If it's a rate limit error, wait longer before continuing
        if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429') ||
          errorMessage.includes('Too Many Requests')
        ) {
          console.log(
            `⏸️  Rate limit detected, waiting ${rateLimitMs * 5}ms before continuing...`
          );
          await sleep(rateLimitMs * 5);
        }
      }
    }

    // Summary
    console.log('\n📈 Update Summary:');
    if (args.domain) {
      console.log(`   Domain: ${args.domain}`);
      console.log(
        `   Status: ${errorCount === 0 ? '✅ Success' : '❌ Failed'}`
      );
    } else {
      console.log(`   Total domains: ${allDomains.length}`);
      console.log(`   Processed: ${processedCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(
        `   Already processed: ${allDomains.length - domainsToProcess.length}`
      );
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.slice(0, 10).forEach((err) => {
        console.log(`   - ${err.domain}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    // Clear progress file if all domains processed successfully (only in batch mode)
    if (!args.domain) {
      if (
        errorCount === 0 &&
        currentProcessedIds.length === allDomains.length
      ) {
        clearProgress();
        console.log(
          '\n✅ All domains processed successfully! Progress file cleared.'
        );
      } else {
        console.log(
          '\n💡 Progress saved. Use --resume to continue from where you left off.'
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run batch update
batchUpdateDomainTraffic().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
