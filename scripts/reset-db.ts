import dotenv from 'dotenv';
import { reset } from 'drizzle-seed';
import { getDb } from '../src/db';
import * as schema from '../src/db/schema';

dotenv.config();

async function main() {
  const db = await getDb();
  await reset(db, schema);
  console.log('Database reset successfully');
}

main();
