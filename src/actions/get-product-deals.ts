'use server';

import { getDb } from '@/db';
import { dealEvent, product, productDeal } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

const getProductDealsSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

/**
 * Get all deal events with product deal participation status
 * Returns paginated list of deal events, ordered by createdAt desc
 */
export const getProductDealsAction = userActionClient
  .schema(getProductDealsSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Verify product belongs to current user
      // const productRecord = await db
      //   .select()
      //   .from(product)
      //   .where(
      //     and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
      //   )
      //   .limit(1);

      // if (productRecord.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Product not found or you do not have permission',
      //   };
      // }

      // Build search condition
      const searchCondition = parsedInput.search
        ? or(
            ilike(dealEvent.name, `%${parsedInput.search}%`),
            ilike(dealEvent.type, `%${parsedInput.search}%`)
          )
        : undefined;

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(dealEvent)
        .where(searchCondition);

      const total = countResult[0]?.count ?? 0;

      // Get events with product deal info
      const offset = parsedInput.page * parsedInput.pageSize;

      const events = await db
        .select({
          id: dealEvent.id,
          name: dealEvent.name,
          type: dealEvent.type,
          description: dealEvent.description,
          status: dealEvent.status,
          startDate: dealEvent.startDate,
          endDate: dealEvent.endDate,
          createdAt: dealEvent.createdAt,
          // Product deal fields
          productDealId: productDeal.id,
          price: productDeal.price,
          originalPrice: productDeal.originalPrice,
          discount: productDeal.discount,
          couponCode: productDeal.couponCode,
          productDealCreatedAt: productDeal.createdAt,
        })
        .from(dealEvent)
        .leftJoin(
          productDeal,
          and(
            eq(productDeal.dealEventId, dealEvent.id),
            eq(productDeal.productId, parsedInput.productId)
          )
        )
        .where(searchCondition)
        .orderBy(desc(dealEvent.createdAt))
        .limit(parsedInput.pageSize)
        .offset(offset);

      return {
        success: true,
        data: {
          items: events,
          total,
          page: parsedInput.page,
          pageSize: parsedInput.pageSize,
        },
      };
    } catch (error) {
      console.error('Get product deals error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch product deals',
      };
    }
  });
