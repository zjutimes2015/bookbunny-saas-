'use server';

import { getDb } from '@/db';
import { dealEvent, product, productCategory, productDeal } from '@/db/schema';
import { and, count as countFn, desc, eq } from 'drizzle-orm';
import { cache } from 'react';

export type CategoryWithCount = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  order: number;
  productCount: number;
};

export type DealWithProduct = {
  id: string;
  price: number;
  originalPrice: number | null;
  discount: string | null;
  couponCode: string | null;
  featured: boolean;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    url: string;
  };
  category: {
    id: string;
    name: string;
    emoji: string;
    slug: string;
  };
};

/**
 * Get deal event by type (cached)
 */
const getDealEvent = cache(async (eventType: string) => {
  const db = await getDb();
  const [event] = await db
    .select()
    .from(dealEvent)
    .where(eq(dealEvent.type, eventType))
    .limit(1);
  return event;
});

/**
 * Get deals by event type with category filter and pagination
 * Returns deals with product info for a specific event
 */
export async function getDealsByEventAction(input: {
  eventType: string;
  category?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  try {
    const db = await getDb();
    const { eventType, category, pageIndex = 0, pageSize = 20 } = input;
    const offset = pageIndex * pageSize;

    // First, find the deal event by type (cached)
    const event = await getDealEvent(eventType);

    if (!event) {
      return {
        success: false,
        error: 'Deal event not found',
        data: null,
      };
    }

    // Build where condition for deals count and query
    // Optimize: directly filter by category slug in join condition to avoid extra query
    const baseCondition = eq(productDeal.dealEventId, event.id);
    const dealsWhereCondition = category
      ? and(baseCondition, eq(productCategory.slug, category))
      : baseCondition;

    // Get total count for pagination
    // Optimize: join order matters - start from productDeal (smallest), then product, then category
    const [{ count: totalCount }] = await db
      .select({ count: countFn() })
      .from(productDeal)
      .innerJoin(product, eq(productDeal.productId, product.id))
      .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
      .where(dealsWhereCondition);

    // Get deals for this event with pagination
    // Order by featured first (true first), then by createdAt desc
    // Optimize: same join order as count query for consistency
    const deals = await db
      .select({
        id: productDeal.id,
        price: productDeal.price,
        originalPrice: productDeal.originalPrice,
        discount: productDeal.discount,
        couponCode: productDeal.couponCode,
        featured: productDeal.featured,
        createdAt: productDeal.createdAt,
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        productLogo: product.logo,
        productUrl: product.url,
        categoryId: productCategory.id,
        categoryName: productCategory.name,
        categoryEmoji: productCategory.emoji,
        categorySlug: productCategory.slug,
      })
      .from(productDeal)
      .innerJoin(product, eq(productDeal.productId, product.id))
      .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
      .where(dealsWhereCondition)
      .orderBy(desc(productDeal.featured), desc(productDeal.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Transform to expected format
    const formattedDeals: DealWithProduct[] = deals.map((deal) => ({
      id: deal.id,
      price: deal.price,
      originalPrice: deal.originalPrice,
      discount: deal.discount,
      couponCode: deal.couponCode,
      featured: deal.featured,
      createdAt: deal.createdAt,
      product: {
        id: deal.productId,
        name: deal.productName,
        description: deal.productDescription,
        logo: deal.productLogo,
        url: deal.productUrl,
      },
      category: {
        id: deal.categoryId,
        name: deal.categoryName,
        emoji: deal.categoryEmoji,
        slug: deal.categorySlug,
      },
    }));

    return {
      success: true,
      data: {
        event,
        deals: formattedDeals,
        total: Number(totalCount),
        page: pageIndex,
        pageSize,
      },
    };
  } catch (error) {
    console.error('get public deals by event error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deals',
      data: null,
    };
  }
}
