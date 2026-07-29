'use server';

import { getDb } from '@/db';
import {
  domain,
  dealEvent,
  product,
  productCategory,
  productDeal,
  user,
} from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
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

const getProductsAdminSchema = z.object({
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
  // Simple filters: { id: 'category', value: 'category-id' }
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
  name: product.name,
  url: product.url,
  dr: domain.domainRating,
  traffic: domain.traffic,
  category: productCategory.name,
  private: product.private,
  createdAt: product.createdAt,
} as const;

export const getProductsAdminAction = adminActionClient
  .schema(getProductsAdminSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { pageIndex, pageSize, search, sorting, filters } = parsedInput;
      const offset = pageIndex * pageSize;

      // Build where conditions
      const conditions = [];

      // Search condition: search by name, url, and user email
      if (search) {
        conditions.push(
          or(
            ilike(product.name, `%${search}%`),
            ilike(product.url, `%${search}%`),
            ilike(user.email, `%${search}%`),
            ilike(domain.url, `%${search}%`)
          )
        );
      }

      // Filter conditions
      let dealTypeFilter: string | null = null;
      for (const filter of filters) {
        if (!filter.value) continue;

        switch (filter.id) {
          case 'category':
            conditions.push(eq(product.categoryId, filter.value));
            break;
          case 'deal':
            dealTypeFilter = filter.value;
            break;
        }
      }

      // Get the sort configuration
      const sortConfig = sorting[0];
      const sortId = sortConfig?.id;
      const isDesc = sortConfig?.desc ?? false;

      const db = await getDb();

      // Build query with conditional joins
      const selectFields = {
        id: product.id,
        name: product.name,
        url: product.url,
        logo: product.logo,
        description: product.description,
        private: product.private,
        domain: domain.url,
        dr: domain.domainRating,
        traffic: domain.traffic,
        category: productCategory.name,
        categoryId: product.categoryId,
        userId: product.userId,
        userEmail: user.email,
        userName: user.name,
        userImage: user.image,
        userTwitter: user.twitter,
        createdAt: product.createdAt,
      };

      // Build query with conditional joins
      if (dealTypeFilter) {
        conditions.push(eq(dealEvent.type, dealTypeFilter));
      }

      const finalWhere = conditions.length > 0 ? and(...conditions) : undefined;

      // Build base query
      const baseQuery = db
        .select(selectFields)
        .from(product)
        .innerJoin(domain, eq(product.domainId, domain.id))
        .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
        .innerJoin(user, eq(product.userId, user.id));

      // Apply conditional joins and where clause
      const query = dealTypeFilter
        ? baseQuery
            .innerJoin(productDeal, eq(product.id, productDeal.productId))
            .innerJoin(dealEvent, eq(productDeal.dealEventId, dealEvent.id))
            .where(finalWhere)
        : baseQuery.where(finalWhere);

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
        const searchLower = search.toLowerCase();
        const searchPatternStart = `${searchLower}%`;
        const searchPatternContains = `%${searchLower}%`;
        orderByClauses.push(
          sql`CASE
            WHEN LOWER(${product.name}) = ${searchLower} THEN 1
            WHEN LOWER(${product.name}) LIKE ${searchPatternStart} THEN 2
            WHEN LOWER(${product.name}) LIKE ${searchPatternContains} THEN 3
            WHEN LOWER(${product.url}) = ${searchLower} THEN 1
            WHEN LOWER(${product.url}) LIKE ${searchPatternStart} THEN 2
            WHEN LOWER(${product.url}) LIKE ${searchPatternContains} THEN 3
            WHEN LOWER(${domain.url}) = ${searchLower} THEN 1
            WHEN LOWER(${domain.url}) LIKE ${searchPatternStart} THEN 2
            WHEN LOWER(${domain.url}) LIKE ${searchPatternContains} THEN 3
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
      } else if (sortId === 'category') {
        const sortField = productCategory.name;
        const sortDirection = isDesc ? desc : asc;
        orderByClauses.push(sortDirection(sortField));
      } else {
        // For non-nullable fields, use regular sorting
        const sortField =
          sortId && sortId in sortFieldMap
            ? sortFieldMap[sortId as keyof typeof sortFieldMap]
            : product.createdAt;
        const sortDirection = isDesc ? desc : asc;
        orderByClauses.push(sortDirection(sortField));
      }

      // Build count query with same joins
      let countQuery = db
        .select({ count: countFn() })
        .from(product)
        .innerJoin(domain, eq(product.domainId, domain.id))
        .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
        .innerJoin(user, eq(product.userId, user.id));

      if (dealTypeFilter) {
        countQuery = countQuery
          .innerJoin(productDeal, eq(product.id, productDeal.productId))
          .innerJoin(dealEvent, eq(productDeal.dealEventId, dealEvent.id));
      }

      const [items, [{ count }]] = await Promise.all([
        query
          .orderBy(...orderByClauses)
          .limit(pageSize)
          .offset(offset),
        countQuery.where(finalWhere),
      ]);

      return {
        success: true,
        data: {
          items,
          total: Number(count),
        },
      };
    } catch (error) {
      console.error('get products admin error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch products',
      };
    }
  });
