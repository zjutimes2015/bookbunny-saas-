'use server';

import { getDb } from '@/db';
import { domain, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { asc, eq } from 'drizzle-orm';

/**
 * Get current user's products
 */
export const getProductsAction = userActionClient.action(async ({ ctx }) => {
  try {
    const currentUser = (ctx as { user: User }).user;
    const userId = currentUser.id;
    const db = await getDb();

    const products = await db
      .select({
        id: product.id,
        url: product.url,
        name: product.name,
        description: product.description,
        logo: product.logo,
        ogImage: product.ogImage,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        domainRating: domain.domainRating,
      })
      .from(product)
      .innerJoin(domain, eq(product.domainId, domain.id))
      .where(eq(product.userId, userId))
      .orderBy(asc(product.createdAt));

    return {
      success: true,
      data: products,
    };
  } catch (error) {
    console.error('Get products error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch products',
    };
  }
});
