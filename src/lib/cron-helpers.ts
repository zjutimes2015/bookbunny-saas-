import { getDb } from '@/db';
import { domain } from '@/db/schema';

export interface DomainInfo {
  id: string;
  url: string;
}

/**
 * Get all domains from the domain table
 * Used by cron jobs to process domain updates
 */
export async function getAllDomains(): Promise<DomainInfo[]> {
  const db = await getDb();

  const domains = await db
    .select({
      id: domain.id,
      url: domain.url,
    })
    .from(domain);

  return domains;
}
