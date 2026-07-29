'use server';

import { getDb } from '@/db';
import { dealEvent, product, productCategory, productDeal } from '@/db/schema';
import { and, asc, count as countFn, eq } from 'drizzle-orm';
import { cache } from 'react';

export type CategoryWithCount = {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  order: number;
  productCount: number;
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
 * Get categories with product count for a specific deal event
 * Used in layout to render category sidebar
 */
export async function getDealCategoriesByEventAction(eventType: string) {
  try {
    const db = await getDb();

    // First, find the deal event by type (cached)
    const event = await getDealEvent(eventType);

    if (!event) {
      return {
        success: false,
        error: 'Deal event not found',
        data: null,
      };
    }

    // Optimize: Use subquery to count deals per category instead of leftJoin + groupBy
    // This is more efficient as it avoids expensive joins and grouping
    const categoryCounts = await db
      .select({
        categoryId: product.categoryId,
        productCount: countFn(productDeal.id).as('product_count'),
      })
      .from(productDeal)
      .innerJoin(product, eq(productDeal.productId, product.id))
      .where(eq(productDeal.dealEventId, event.id))
      .groupBy(product.categoryId);

    // Create a map for quick lookup
    const countMap = new Map(
      categoryCounts.map((c) => [c.categoryId, Number(c.productCount)])
    );

    // Get all categories ordered by order
    const allCategories = await db
      .select({
        id: productCategory.id,
        name: productCategory.name,
        emoji: productCategory.emoji,
        slug: productCategory.slug,
        order: productCategory.order,
      })
      .from(productCategory)
      .orderBy(asc(productCategory.order));

    // Combine categories with their counts
    const categoriesWithCount = allCategories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat.id) || 0,
    }));

    // Calculate total deals count
    const totalDealsCount = categoriesWithCount.reduce(
      (sum, cat) => sum + cat.productCount,
      0
    );

    return {
      success: true,
      data: {
        event,
        categories: categoriesWithCount.map((cat) => ({
          ...cat,
          productCount: Number(cat.productCount),
        })) as CategoryWithCount[],
        totalDealsCount,
      },
    };
  } catch (error) {
    console.error('get deal categories by event error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch deal categories',
      data: null,
    };
  }
}
