'use server';

import { getDb } from '@/db';
import { productCategory } from '@/db/schema';
import { asc } from 'drizzle-orm';

/**
 * Get all product categories sorted by order
 */
export async function getProductCategoriesAction() {
  try {
    const db = await getDb();

    const categories = await db
      .select()
      .from(productCategory)
      .orderBy(asc(productCategory.order));

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('Get product categories error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch product categories',
      data: [],
    };
  }
}
