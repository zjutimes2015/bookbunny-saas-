'use server';

import { getDb } from '@/db';
import { domain, directory } from '@/db/schema';
import { actionClient } from '@/lib/safe-action';
import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  or,
  sql,
} from 'drizzle-orm';
import { z } from 'zod';

const getPublicBacklinksSchema = z.object({
  pageIndex: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  // Simple sorting: { id: 'createdAt', desc: true }
  sorting: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      })
    )
    .optional()
    .default([]),
  // Simple filters: { id: 'role', value: 'admin' }
  filters: z
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .default([]),
});

// Define sort field mapping
const sortFieldMap = {
  name: directory.name,
  url: directory.url,
  dr: domain.domainRating,
  traffic: domain.traffic,
  pricing: directory.pricing,
  category: directory.category,
  dofollow: directory.dofollow,
  account: directory.account,
  createdAt: directory.createdAt,
} as const;

/**
 * Get public backlinks action
 *
 * This action is used to fetch public backlinks (only active ones) for the marketing page.
 * Unlike the admin action, this one doesn't require authentication.
 */
export const getPublicBacklinksAction = actionClient
  .schema(getPublicBacklinksSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { pageIndex, pageSize, search, sorting, filters } = parsedInput;
      const offset = pageIndex * pageSize;

      // Build where conditions - always filter for active status
      const conditions = [eq(directory.status, 'active')];

      // Search condition: search by name and url
      if (search) {
        conditions.push(
          or(
            ilike(directory.name, `%${search}%`),
            ilike(directory.url, `%${search}%`)
          )!
        );
      }

      // Filter conditions
      for (const filter of filters) {
        if (!filter.value) continue;

        switch (filter.id) {
          case 'pricing':
            conditions.push(eq(directory.pricing, filter.value));
            break;
          case 'category':
            conditions.push(eq(directory.category, filter.value));
            break;
          case 'dofollow':
            conditions.push(eq(directory.dofollow, filter.value === 'true'));
            break;
          case 'account':
            conditions.push(eq(directory.account, filter.value === 'true'));
            break;
        }
      }

      const where = and(...conditions);

      // Get the sort configuration
      const sortConfig = sorting[0];
      const sortId = sortConfig?.id;
      const isDesc = sortConfig?.desc ?? false;

      const db = await getDb();

      // Query with join
      const query = db
        .select({
          id: directory.id,
          name: directory.name,
          url: directory.url,
          dr: domain.domainRating,
          traffic: domain.traffic,
          pricing: directory.pricing,
          category: directory.category,
          dofollow: directory.dofollow,
          account: directory.account,
          createdAt: directory.createdAt,
        })
        .from(directory)
        .leftJoin(domain, eq(directory.domainId, domain.id))
        .where(where);

      // Build order by clause with NULLS LAST for nullable fields
      // When search is active, prioritize search relevance first
      const orderByClauses: Array<
        | ReturnType<typeof desc>
        | ReturnType<typeof asc>
        | ReturnType<typeof sql<unknown>>
      > = [];

      // If search is active, add relevance sorting first
      if (search) {
        // Order by: exact match > starts with > contains
        // Use CASE to prioritize matches: exact match = 1, starts with = 2, contains = 3
        const searchLower = search.toLowerCase();
        const searchPatternStart = `${searchLower}%`;
        const searchPatternContains = `%${searchLower}%`;
        orderByClauses.push(
          sql`CASE
            WHEN LOWER(${directory.name}) = ${searchLower} THEN 1
            WHEN LOWER(${directory.name}) LIKE ${searchPatternStart} THEN 2
            WHEN LOWER(${directory.name}) LIKE ${searchPatternContains} THEN 3
            WHEN LOWER(${directory.url}) = ${searchLower} THEN 1
            WHEN LOWER(${directory.url}) LIKE ${searchPatternStart} THEN 2
            WHEN LOWER(${directory.url}) LIKE ${searchPatternContains} THEN 3
            ELSE 4
          END ASC`
        );
      }

      // Then apply the user's selected sort
      if (sortId === 'dr') {
        orderByClauses.push(
          isDesc
            ? sql`${domain.domainRating} DESC NULLS LAST`
            : sql`${domain.domainRating} ASC NULLS LAST`
        );
      } else if (sortId === 'traffic') {
        orderByClauses.push(
          isDesc
            ? sql`${domain.traffic} DESC NULLS LAST`
            : sql`${domain.traffic} ASC NULLS LAST`
        );
      } else {
        // For non-nullable fields, use regular sorting
        const sortField =
          sortId && sortId in sortFieldMap
            ? sortFieldMap[sortId as keyof typeof sortFieldMap]
            : directory.createdAt;
        const sortDirection = isDesc ? desc : asc;
        orderByClauses.push(sortDirection(sortField));
      }

      const [items, [{ count }]] = await Promise.all([
        query
          .orderBy(...orderByClauses)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: countFn() })
          .from(directory)
          .leftJoin(domain, eq(directory.domainId, domain.id))
          .where(where),
      ]);

      return {
        success: true,
        data: {
          items,
          total: Number(count),
        },
      };
    } catch (error) {
      console.error('get public backlinks error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch backlinks',
      };
    }
  });
