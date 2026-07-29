'use server';

import { getDb } from '@/db';
import { domain, directory, product, productDirectory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { z } from 'zod';

const getProductBacklinksSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
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
  source: directory.source,
  backlinkStatus: productDirectory.status,
  createdAt: directory.createdAt,
} as const;

export const getProductBacklinksAction = userActionClient
  .schema(getProductBacklinksSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const { productId, pageIndex, pageSize, search, sorting, filters } =
        parsedInput;
      const offset = pageIndex * pageSize;

      const db = await getDb();

      // Verify product belongs to current user
      // const productRecord = await db
      //   .select()
      //   .from(product)
      //   .where(and(eq(product.id, productId), eq(product.userId, userId)))
      //   .limit(1);

      // if (productRecord.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Product not found',
      //   };
      // }

      // Build where conditions - only show active directories
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

      // Track backlinkStatus filter separately (needs special handling with leftJoin)
      let backlinkStatusFilterValue: string | null = null;

      // Filter conditions
      for (const filter of filters) {
        if (!filter.value) continue;

        // Handle array filter values (from DataTableFacetedFilter)
        const filterValue = Array.isArray(filter.value)
          ? filter.value[0]
          : filter.value;

        if (!filterValue) continue;

        switch (filter.id) {
          case 'pricing':
            conditions.push(eq(directory.pricing, filterValue));
            break;
          case 'category':
            conditions.push(eq(directory.category, filterValue));
            break;
          case 'dofollow':
            conditions.push(eq(directory.dofollow, filterValue === 'true'));
            break;
          case 'account':
            conditions.push(eq(directory.account, filterValue === 'true'));
            break;
          case 'source':
            conditions.push(eq(directory.source, filterValue));
            break;
          case 'backlinkStatus':
            // Store backlinkStatus filter to apply after join
            backlinkStatusFilterValue = filterValue;
            break;
        }
      }

      // Get the sort configuration
      const sortConfig = sorting[0];
      const sortId = sortConfig?.id;
      const isDesc = sortConfig?.desc ?? false;

      // Query with join
      // status: directory.status (always 'active' due to filter condition)
      // backlinkStatus: productDirectory.status (nullable, unknown/submitted/approved/rejected)
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
          status: directory.status, // directory.status (always 'active')
          source: directory.source,
          createdAt: directory.createdAt,
          backlinkStatus: productDirectory.status, // productDirectory.status (nullable)
          backlinkNotes: productDirectory.notes, // productDirectory.notes (nullable)
        })
        .from(directory)
        .leftJoin(domain, eq(directory.domainId, domain.id))
        .leftJoin(
          productDirectory,
          and(
            eq(productDirectory.productId, productId),
            eq(productDirectory.directoryId, directory.id)
          )
        );

      // Build final where condition (include backlinkStatus filter after join)
      const finalWhereConditions = [...conditions];
      if (backlinkStatusFilterValue) {
        if (backlinkStatusFilterValue === 'unknown') {
          finalWhereConditions.push(isNull(productDirectory.status));
        } else {
          finalWhereConditions.push(
            eq(productDirectory.status, backlinkStatusFilterValue)
          );
        }
      }

      const finalWhereCondition =
        finalWhereConditions.length > 0
          ? and(...finalWhereConditions)
          : undefined;

      const queryWithWhere = finalWhereCondition
        ? query.where(finalWhereCondition)
        : query;

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
      } else if (sortId === 'backlinkStatus') {
        // backlinkStatus can be null (unknown state), use NULLS LAST
        orderByClauses.push(
          isDesc
            ? sql`${productDirectory.status} DESC NULLS LAST`
            : sql`${productDirectory.status} ASC NULLS LAST`
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

      const countQuery = db
        .select({ count: countFn() })
        .from(directory)
        .leftJoin(domain, eq(directory.domainId, domain.id))
        .leftJoin(
          productDirectory,
          and(
            eq(productDirectory.productId, productId),
            eq(productDirectory.directoryId, directory.id)
          )
        );

      const countQueryWithWhere = finalWhereCondition
        ? countQuery.where(finalWhereCondition)
        : countQuery;

      const [items, [{ count }]] = await Promise.all([
        queryWithWhere
          .orderBy(...orderByClauses)
          .limit(pageSize)
          .offset(offset),
        countQueryWithWhere,
      ]);

      return {
        success: true,
        data: {
          items,
          total: Number(count),
        },
      };
    } catch (error) {
      console.error('get product backlinks error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch product backlinks',
      };
    }
  });
