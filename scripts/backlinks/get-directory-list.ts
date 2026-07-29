import * as fs from 'node:fs';
import * as path from 'node:path';
import { JSDOM } from 'jsdom';

interface Directory {
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
 * Parse directory data from HTML file
 */
function parseDirectories(htmlContent: string): Directory[] {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  const directories: Directory[] = [];

  // Find all tbody rows
  const rows = document.querySelectorAll('tbody tr');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');

    // Skip if not enough cells (should have 12 cells based on the structure)
    if (cells.length < 11) {
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

    // Cell 5: spam score - skip this field

    // Cell 6: pricing
    const pricingCell = cells[6];
    const pricing = pricingCell?.textContent?.trim() || '';

    // Cell 7: category (has span with category text)
    const categoryCell = cells[7];
    const categorySpan = categoryCell?.querySelector('span');
    const category = categorySpan?.textContent?.trim() || '';

    // Cell 8: dofollow (has div with text)
    const dofollowCell = cells[8];
    const dofollowText = dofollowCell?.textContent?.trim() || '';
    // Extract Dofollow or Nofollow
    const dofollow = dofollowText.includes('Dofollow')
      ? 'Dofollow'
      : 'Nofollow';

    // Cell 9: account (has div with text)
    const accountCell = cells[9];
    const account = accountCell?.textContent?.trim() || '';

    // Cell 10: submission link (has anchor with "Open" text)
    const submissionCell = cells[10];
    const submissionLink = submissionCell?.querySelector('a');
    const submissionUrl = submissionLink?.getAttribute('href') || '';
    const submission = submissionUrl;

    // Only add if name is not empty
    if (name) {
      directories.push({
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

  return directories;
}

/**
 * Convert directories data to CSV format
 */
function convertToCSV(directories: Directory[]): string {
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

  for (const directory of directories) {
    const row = [
      escapeField(directory.name),
      escapeField(directory.url),
      escapeField(directory.dr),
      escapeField(directory.traffic),
      escapeField(directory.pricing),
      escapeField(directory.category),
      escapeField(directory.dofollow),
      escapeField(directory.account),
      escapeField(directory.submission),
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
    const outputFile = path.join(__dirname, 'directorylist.csv');
    const allDirectories: Directory[] = [];

    // Process files from list-1.html to list-7.html
    for (let i = 1; i <= 7; i++) {
      const inputFile = path.join(__dirname, `list-${i}.html`);

      console.log(`Reading ${inputFile}...`);

      // Check if file exists
      if (!fs.existsSync(inputFile)) {
        console.warn(`⚠️  File not found: ${inputFile}, skipping...`);
        continue;
      }

      const htmlContent = fs.readFileSync(inputFile, 'utf-8');

      console.log(`Parsing directories from list-${i}.html...`);
      const directories = parseDirectories(htmlContent);

      console.log(`Found ${directories.length} directories in list-${i}.html`);
      allDirectories.push(...directories);
    }

    console.log(`\nTotal directories found: ${allDirectories.length}`);

    // Remove duplicates based on name and url
    const uniqueDirectories = allDirectories.filter(
      (directory, index, self) =>
        index ===
        self.findIndex(
          (d) => d.name === directory.name && d.url === directory.url
        )
    );

    console.log(
      `Unique directories after deduplication: ${uniqueDirectories.length}`
    );

    console.log('Converting to CSV...');
    const csvContent = convertToCSV(uniqueDirectories);

    console.log('Writing CSV file...');
    fs.writeFileSync(outputFile, csvContent, 'utf-8');

    console.log(`✅ Successfully exported to ${outputFile}`);
    console.log(`Total unique directories: ${uniqueDirectories.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
