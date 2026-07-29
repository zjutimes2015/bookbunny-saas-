'use server';

import { getDb } from '@/db';
import { domain, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const getProductByIdSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

/**
 * Get product by ID for current user
 */
export const getProductByIdAction = userActionClient
  .schema(getProductByIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      const result = await db
        .select({
          id: product.id,
          url: product.url,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          logo: product.logo,
          ogImage: product.ogImage,
          private: product.private,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          domainId: product.domainId,
          domainRating: domain.domainRating,
          ahRank: domain.ahRank,
          traffic: domain.traffic,
        })
        .from(product)
        .innerJoin(domain, eq(product.domainId, domain.id))
        .where(
          and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
        )
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      return {
        success: true,
        data: result[0],
      };
    } catch (error) {
      console.error('Get product by ID error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch product',
      };
    }
  });
