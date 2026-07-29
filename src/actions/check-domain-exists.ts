'use server';

import { getDb } from '@/db';
import { domain, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { extractDomain } from '@/lib/urls/urls';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const checkDomainExistsSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

/**
 * Check if current user already has a product with the same domain
 */
export const checkDomainExistsAction = userActionClient
  .schema(checkDomainExistsSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Normalize URL
      const normalizedUrl = extractDomain(parsedInput.url);

      // Find domain by URL
      const existingDomain = await db
        .select()
        .from(domain)
        .where(eq(domain.url, normalizedUrl))
        .limit(1);

      if (existingDomain.length === 0) {
        // Domain doesn't exist, so user doesn't have a product with this domain
        return {
          success: true,
          data: {
            exists: false,
          },
        };
      }

      const domainId = existingDomain[0].id;

      // Check if user already has a product with this domain
      const existingProduct = await db
        .select()
        .from(product)
        .where(and(eq(product.userId, userId), eq(product.domainId, domainId)))
        .limit(1);

      return {
        success: true,
        data: {
          exists: existingProduct.length > 0,
          product: existingProduct.length > 0 ? existingProduct[0] : null,
        },
      };
    } catch (error) {
      console.error('Check domain exists error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to check domain',
      };
    }
  });
