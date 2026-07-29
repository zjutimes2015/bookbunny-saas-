'use server';

import { getDb } from '@/db';
import { dealEvent, productDeal } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { count as countFn, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

const getDealEventsSchema = z.object({
  pageIndex: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
});

export const getDealEventsAction = adminActionClient
  .schema(getDealEventsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { pageIndex, pageSize, search } = parsedInput;
      const offset = pageIndex * pageSize;

      const db = await getDb();

      // Build search condition
      const searchCondition = search
        ? or(
            ilike(dealEvent.name, `%${search}%`),
            ilike(dealEvent.type, `%${search}%`),
            ilike(dealEvent.description, `%${search}%`)
          )
        : undefined;

      // Subquery to count products for each deal event
      const productCountSubquery = db
        .select({
          dealEventId: productDeal.dealEventId,
          count: countFn().as('product_count'),
        })
        .from(productDeal)
        .groupBy(productDeal.dealEventId)
        .as('product_counts');

      // Main query with left join to get product count
      const [items, [{ count }]] = await Promise.all([
        db
          .select({
            id: dealEvent.id,
            name: dealEvent.name,
            type: dealEvent.type,
            description: dealEvent.description,
            status: dealEvent.status,
            startDate: dealEvent.startDate,
            endDate: dealEvent.endDate,
            createdAt: dealEvent.createdAt,
            updatedAt: dealEvent.updatedAt,
            productCount:
              sql<number>`COALESCE(${productCountSubquery.count}, 0)`.as(
                'product_count'
              ),
          })
          .from(dealEvent)
          .leftJoin(
            productCountSubquery,
            eq(dealEvent.id, productCountSubquery.dealEventId)
          )
          .where(searchCondition)
          .orderBy(desc(dealEvent.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: countFn() }).from(dealEvent).where(searchCondition),
      ]);

      return {
        success: true,
        data: {
          items,
          total: Number(count),
        },
      };
    } catch (error) {
      console.error('get deal events error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch deal events',
      };
    }
  });
