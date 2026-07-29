import * as fs from 'node:fs';
import * as path from 'node:path';
import { JSDOM } from 'jsdom';

interface LaunchPlatform {
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
 * Parse launch platform data from HTML file
 */
function parseLaunchPlatforms(htmlContent: string): LaunchPlatform[] {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  const platforms: LaunchPlatform[] = [];

  // Find all tbody rows
  const rows = document.querySelectorAll('tbody tr');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');

    // Skip if not enough cells (should have 11 cells based on the structure)
    if (cells.length < 10) {
      continue;
    }

    // Cell 0: checkbox
    // Cell 1: name (has anchor tag with platform name and url)
    const nameCell = cells[1];
    const nameAnchor = nameCell?.querySelector('a');
    const nameLink = nameAnchor?.querySelector('span');
    const name = nameLink?.textContent?.trim() || '';
    const url = nameAnchor?.getAttribute('href') || '';

    // Cell 2: status - skip this field

    // Cell 3: DR (has div with number)
    const drCell = cells[3];
    const drText = drCell?.textContent?.trim() || '';
    // Extract just the number (remove whitespace)
    const dr = drText.replace(/\s+/g, '');

    // Cell 4: traffic
    const trafficCell = cells[4];
    const traffic = trafficCell?.textContent?.trim().replace(/\s+/g, '') || '';

    // Cell 5: pricing
    const pricingCell = cells[5];
    const pricing = pricingCell?.textContent?.trim() || '';

    // Cell 6: category (has span with category text)
    const categoryCell = cells[6];
    const categorySpan = categoryCell?.querySelector('span');
    const category = categorySpan?.textContent?.trim() || '';

    // Cell 7: dofollow (has div with text)
    const dofollowCell = cells[7];
    const dofollowText = dofollowCell?.textContent?.trim() || '';
    // Extract Dofollow or Nofollow
    const dofollow = dofollowText.includes('Dofollow')
      ? 'Dofollow'
      : 'Nofollow';

    // Cell 8: account (has div with text)
    const accountCell = cells[8];
    const account = accountCell?.textContent?.trim() || '';

    // Cell 9: submission link (has anchor with "Open" text)
    const submissionCell = cells[9];
    const submissionLink = submissionCell?.querySelector('a');
    const submissionUrl = submissionLink?.getAttribute('href') || '';
    const submission = submissionUrl;

    // Only add if name is not empty
    if (name) {
      platforms.push({
        name,
        url,
        dr,
        traffic,
        pricing,
        category,
        dofollow,
        account,
        submission,
      });
    }
  }

  return platforms;
}

/**
 * Convert platforms data to CSV format
 */
function convertToCSV(platforms: LaunchPlatform[]): string {
  // CSV header
  const headers = [
    'Name',
    'URL',
    'DR',
    'Traffic',
    'Pricing',
    'Category',
    'Dofollow',
    'Account',
    'Submission',
  ];

  // Escape CSV field
  const escapeField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // Build CSV content
  const rows = [headers.join(',')];

  for (const platform of platforms) {
    const row = [
      escapeField(platform.name),
      escapeField(platform.url),
      escapeField(platform.dr),
      escapeField(platform.traffic),
      escapeField(platform.pricing),
      escapeField(platform.category),
      escapeField(platform.dofollow),
      escapeField(platform.account),
      escapeField(platform.submission),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const inputFile = path.join(__dirname, 'list-8.html');
    const outputFile = path.join(__dirname, 'launchplatforms.csv');

    console.log('Reading HTML file...');
    const htmlContent = fs.readFileSync(inputFile, 'utf-8');

    console.log('Parsing launch platforms...');
    const platforms = parseLaunchPlatforms(htmlContent);

    console.log(`Found ${platforms.length} platforms`);

    console.log('Converting to CSV...');
    const csvContent = convertToCSV(platforms);

    console.log('Writing CSV file...');
    fs.writeFileSync(outputFile, csvContent, 'utf-8');

    console.log(`✅ Successfully exported to ${outputFile}`);
    console.log(`Total platforms: ${platforms.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
