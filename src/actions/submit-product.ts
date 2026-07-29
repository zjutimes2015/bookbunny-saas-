'use server';

import { uploadImageFromUrl } from '@/actions/upload-image-from-url';
import { getDb } from '@/db';
import { domain, product, productCategory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { extractDomain } from '@/lib/urls/urls';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const submitProductSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(24, 'Name must not exceed 24 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(256, 'Description must not exceed 256 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  logo: z.string().optional(),
  ogImage: z.string().optional(),
  markdown: z.string().optional(),
});

/**
 * Server action to submit and save product information
 */
export const submitProductAction = userActionClient
  .schema(submitProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Normalize URL
      const normalizedUrl = extractDomain(parsedInput.url);

      // Check if domain already exists
      // Domain metrics should already be saved during fetch phase
      const existingDomain = await db
        .select()
        .from(domain)
        .where(eq(domain.url, normalizedUrl))
        .limit(1);

      let domainId: string;

      if (existingDomain.length > 0) {
        domainId = existingDomain[0].id;
      } else {
        // Create new domain if it doesn't exist (shouldn't happen if fetch was successful)
        domainId = nanoid();
        await db.insert(domain).values({
          id: domainId,
          url: normalizedUrl,
        });
      }

      // Check if user already has a product with this domain
      const existingProduct = await db
        .select()
        .from(product)
        .where(and(eq(product.userId, userId), eq(product.domainId, domainId)))
        .limit(1);

      if (existingProduct.length > 0) {
        return {
          success: false,
          error: 'You have already submitted a product with this domain',
        };
      }

      // Verify category exists - support both ID and slug
      const categoryId = parsedInput.categoryId;
      // const categoryById = await db
      //   .select()
      //   .from(productCategory)
      //   .where(eq(productCategory.id, categoryId))
      //   .limit(1);

      // // If not found by ID, try to find by slug
      // if (categoryById.length === 0) {
      //   const categoryBySlug = await db
      //     .select()
      //     .from(productCategory)
      //     .where(eq(productCategory.slug, categoryId))
      //     .limit(1);

      //   if (categoryBySlug.length === 0) {
      //     return {
      //       success: false,
      //       error: 'Invalid category selected',
      //     };
      //   }
      //   categoryId = categoryBySlug[0].id;
      // } else {
      //   categoryId = categoryById[0].id;
      // }

      // Upload images to storage if they are external URLs
      let logoUrl = parsedInput.logo || null;
      let ogImageUrl = parsedInput.ogImage || null;

      if (logoUrl) {
        const uploadedLogoUrl = await uploadImageFromUrl(
          logoUrl,
          'products/logos'
        );
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        } else {
          console.warn('Failed to upload logo, using original URL:', logoUrl);
        }
      }

      if (ogImageUrl) {
        const uploadedOgImageUrl = await uploadImageFromUrl(
          ogImageUrl,
          'products/og-images'
        );
        if (uploadedOgImageUrl) {
          ogImageUrl = uploadedOgImageUrl;
        } else {
          console.warn(
            'Failed to upload OG image, using original URL:',
            ogImageUrl
          );
        }
      }

      // Create new product
      const productId = nanoid();
      await db.insert(product).values({
        id: productId,
        userId,
        domainId,
        categoryId: categoryId,
        url: normalizedUrl,
        name: parsedInput.name,
        description: parsedInput.description || null,
        logo: logoUrl,
        ogImage: ogImageUrl,
        markdown: parsedInput.markdown || null,
      });

      return {
        success: true,
        data: {
          productId,
          domainId,
        },
      };
    } catch (error) {
      console.error('Submit product error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to submit product',
      };
    }
  });
