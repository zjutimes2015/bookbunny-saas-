import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load production environment variables
// Supports .env.production or .env.prod
// Use override: true to ensure production env vars take precedence
dotenv.config({ path: '.env.production', override: true });
dotenv.config({ path: '.env.prod', override: true });
// console.log('DATABASE_URL', process.env.DATABASE_URL);

/**
 * Production database migration configuration
 * https://orm.drizzle.team/docs/drizzle-kit-migrate
 */
export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
