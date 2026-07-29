import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../../src/db/index.js';
import { productCategory } from '../../src/db/schema.js';

// Load environment variables
// Supports ENV_FILE env var or defaults to .env
// For production: ENV_FILE=.env.production tsx scripts/categories/import-categories.ts
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile, override: true });
// Also try .env.prod as fallback for production
if (envFile === '.env.production' || envFile === '.env.prod') {
  dotenv.config({ path: '.env.prod', override: true });
  dotenv.config({ path: '.env.production', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CategoryData {
  name: string;
  emoji: string;
  slug: string;
  order: number;
}

/**
 * Read categories from JSON file
 */
function readCategoriesFromJSON(): CategoryData[] {
  const jsonPath = path.join(__dirname, 'product-categories.json');
  console.log(`📖 Reading ${jsonPath}...`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(jsonPath, 'utf-8');
  const categories: CategoryData[] = JSON.parse(content);

  // Validate categories
  for (const category of categories) {
    if (
      !category.name ||
      !category.emoji ||
      !category.slug ||
      typeof category.order !== 'number'
    ) {
      console.error(`❌ Invalid category data: ${JSON.stringify(category)}`);
      process.exit(1);
    }
  }

  console.log(`✅ Found ${categories.length} categories in JSON file\n`);
  return categories;
}

/**
 * Main import function
 */
async function importProductCategories() {
  try {
    // Verify database connection
    const db = await getDb();

    // Test database connection
    try {
      await db.select().from(productCategory).limit(1);
      console.log('✅ Database connection verified\n');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Database connection failed:', errorMessage);

      if (errorMessage.includes('does not exist')) {
        console.error('\n⚠️  The "product_category" table does not exist.');
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

    // Read categories from JSON
    const jsonCategories = readCategoriesFromJSON();

    // Get all existing categories from database
    const existingCategories = await db.select().from(productCategory);
    console.log(
      `📊 Found ${existingCategories.length} existing categories in database\n`
    );

    const existingBySlug = new Map(
      existingCategories.map((cat) => [cat.slug, cat])
    );

    let created = 0;
    let updated = 0;
    const deleted = 0;
    let skipped = 0;

    // Process each category from JSON
    for (const jsonCategory of jsonCategories) {
      const existing = existingBySlug.get(jsonCategory.slug);

      if (existing) {
        // Check if update is needed
        const needsUpdate =
          existing.name !== jsonCategory.name ||
          existing.emoji !== jsonCategory.emoji ||
          existing.order !== jsonCategory.order;

        if (needsUpdate) {
          await db
            .update(productCategory)
            .set({
              name: jsonCategory.name,
              emoji: jsonCategory.emoji,
              order: jsonCategory.order,
              updatedAt: new Date(),
            })
            .where(eq(productCategory.id, existing.id));
          updated++;
          console.log(
            `✅ Updated: ${jsonCategory.emoji} ${jsonCategory.name} (slug: ${jsonCategory.slug})`
          );
        } else {
          skipped++;
          console.log(
            `⏭️  Skipped: ${jsonCategory.emoji} ${jsonCategory.name} (no changes)`
          );
        }
      } else {
        // Create new category
        const categoryId = nanoid();
        await db.insert(productCategory).values({
          id: categoryId,
          name: jsonCategory.name,
          emoji: jsonCategory.emoji,
          slug: jsonCategory.slug,
          order: jsonCategory.order,
        });
        created++;
        console.log(
          `✅ Created: ${jsonCategory.emoji} ${jsonCategory.name} (slug: ${jsonCategory.slug})`
        );
      }
    }

    // Find categories in database that are not in JSON (to be deleted)
    const jsonSlugs = new Set(jsonCategories.map((cat) => cat.slug));
    const toDelete = existingCategories.filter(
      (cat) => !jsonSlugs.has(cat.slug)
    );

    if (toDelete.length > 0) {
      console.log(
        `\n⚠️  Found ${toDelete.length} categories in database not in JSON:`
      );
      for (const cat of toDelete) {
        console.log(`   - ${cat.emoji} ${cat.name} (slug: ${cat.slug})`);
      }
      console.log(
        '\n⚠️  These categories will NOT be deleted automatically for safety.'
      );
      console.log(
        '   If you want to delete them, please do it manually in the database.'
      );
    }

    // Summary
    console.log('\n📈 Import Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    if (toDelete.length > 0) {
      console.log(`   Orphaned (not deleted): ${toDelete.length}`);
    }
    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importProductCategories().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
