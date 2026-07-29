import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../../src/db/index.js';
import { domain, directory } from '../../src/db/schema.js';

// Load environment variables
// Supports ENV_FILE env var or defaults to .env
// For production: ENV_FILE=.env.production tsx scripts/backlinks/import-directories.ts
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile, override: true });
// Also try .env.prod as fallback for production
if (envFile === '.env.production' || envFile === '.env.prod') {
  dotenv.config({ path: '.env.prod', override: true });
  dotenv.config({ path: '.env.production', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimum DR threshold for importing directories
const MIN_DR_THRESHOLD = 20;

interface CSVRow {
  name: string;
  url: string;
  dr: string;
  traffic: string;
  pricing: string;
  category: string;
  dofollow: string;
  account: string;
  submission: string;
}

/**
 * Normalize URL to domain only (e.g., https://www.example.com -> example.com)
 */
function normalizeDomain(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .toLowerCase()
    .trim();
}

/**
 * Parse traffic string to number (e.g., "248K" -> 248000, "45M" -> 45000000)
 */
function parseTraffic(traffic: string): number | null {
  if (!traffic || traffic === '0' || traffic.trim() === '') return null;

  const cleaned = traffic.trim().toUpperCase();
  const match = cleaned.match(/^([\d.]+)([KM]?)$/);

  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2];

  if (unit === 'K') {
    return Math.round(value * 1000);
  }
  if (unit === 'M') {
    return Math.round(value * 1000000);
  }

  return Math.round(value);
}

/**
 * Parse DR string to number
 */
function parseDR(dr: string): number | null {
  if (!dr || dr.trim() === '') return null;
  const parsed = Number.parseInt(dr.trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Convert dofollow string to boolean
 */
function parseDofollow(dofollow: string): boolean {
  return dofollow.trim().toLowerCase() === 'dofollow';
}

/**
 * Convert account string to boolean
 */
function parseAccount(account: string): boolean {
  return account.trim().toLowerCase() === 'required';
}

/**
 * Parse CSV file
 */
function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  const rows: CSVRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField); // Add last field

    if (fields.length >= 9) {
      rows.push({
        name: fields[0]?.trim() || '',
        url: fields[1]?.trim() || '',
        dr: fields[2]?.trim() || '',
        traffic: fields[3]?.trim() || '',
        pricing: fields[4]?.trim() || '',
        category: fields[5]?.trim() || '',
        dofollow: fields[6]?.trim() || '',
        account: fields[7]?.trim() || '',
        submission: fields[8]?.trim() || '',
      });
    }
  }

  return rows;
}

/**
 * Main import function
 */
async function importDirectories() {
  try {
    // Verify database connection
    const db = await getDb();

    // Test database connection by querying a simple table
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

    // Process directory-list.csv
    const directoryListPath = path.join(__dirname, 'directory-list.csv');
    console.log(`📖 Reading ${directoryListPath}...`);
    const directoryRows = parseCSV(directoryListPath);
    console.log(`✅ Found ${directoryRows.length} directories`);

    // Process launch-platforms.csv
    const launchPlatformsPath = path.join(__dirname, 'launch-platforms.csv');
    console.log(`📖 Reading ${launchPlatformsPath}...`);
    const platformRows = parseCSV(launchPlatformsPath);
    console.log(`✅ Found ${platformRows.length} launch platforms`);

    const allRows = [...directoryRows, ...platformRows];
    console.log(`\n📊 Total records to import: ${allRows.length}\n`);

    let domainCreated = 0;
    let directoryCreated = 0;
    let directorySkipped = 0;
    let errors = 0;

    // Process each row
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const progress = `[${i + 1}/${allRows.length}]`;

      try {
        // Normalize domain
        const normalizedDomain = normalizeDomain(row.url);
        if (!normalizedDomain) {
          console.log(`${progress} ⚠️  Skipping ${row.name}: invalid URL`);
          directorySkipped++;
          continue;
        }

        // Parse values
        const dr = parseDR(row.dr);
        const traffic = parseTraffic(row.traffic);
        const dofollow = parseDofollow(row.dofollow);
        const account = parseAccount(row.account);

        // Skip if DR is below threshold
        if (dr === null || dr < MIN_DR_THRESHOLD) {
          console.log(
            `${progress} ⚠️  Skipping ${row.name}: DR ${dr ?? 'N/A'} is below threshold (${MIN_DR_THRESHOLD})`
          );
          directorySkipped++;
          continue;
        }

        // Check if directory already exists (by url) - skip if exists
        const existingDirectory = await db
          .select()
          .from(directory)
          .where(eq(directory.url, normalizedDomain))
          .limit(1);

        if (existingDirectory.length > 0) {
          // Skip existing directory, don't update
          console.log(
            `${progress} ⏭️  Skipping ${row.name}: directory already exists (${normalizedDomain})`
          );
          directorySkipped++;
          continue;
        }

        // Find or create domain
        const existingDomain = await db
          .select()
          .from(domain)
          .where(eq(domain.url, normalizedDomain))
          .limit(1);

        let domainId: string;

        if (existingDomain.length > 0) {
          // Use existing domain, don't update
          domainId = existingDomain[0].id;
        } else {
          // Create new domain
          domainId = nanoid();
          await db.insert(domain).values({
            id: domainId,
            url: normalizedDomain,
            domainRating: dr,
            traffic: traffic,
          });
          domainCreated++;
        }

        // Create new directory
        const directoryId = nanoid();
        await db.insert(directory).values({
          id: directoryId,
          domainId: domainId,
          url: normalizedDomain,
          name: row.name,
          description: null,
          logo: null,
          ogImage: null,
          source: 'system',
          productId: null,
          status: 'active',
          rejectedReason: null,
          pricing: row.pricing || null,
          category: row.category || null,
          dofollow: dofollow,
          account: account,
        });
        directoryCreated++;
        console.log(
          `${progress} ✅ Created: ${row.name} (${normalizedDomain}, DR: ${dr})`
        );
      } catch (error) {
        errors++;
        console.error(
          `${progress} ❌ Error processing ${row.name}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Summary
    console.log('\n📈 Import Summary:');
    console.log(`   Domains created: ${domainCreated}`);
    console.log(`   Directories created: ${directoryCreated}`);
    console.log(`   Directories skipped: ${directorySkipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n📋 DR Threshold: ${MIN_DR_THRESHOLD}+`);
    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importDirectories().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
