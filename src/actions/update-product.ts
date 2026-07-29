'use server';

import { uploadImageFromUrl } from '@/actions/upload-image-from-url';
import { getDb } from '@/db';
import { product, productCategory } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
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
});

/**
 * Server action to update product information
 */
export const updateProductAction = userActionClient
  .schema(updateProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Check if product exists and belongs to user
      const existingProduct = await db
        .select()
        .from(product)
        .where(and(eq(product.id, parsedInput.id), eq(product.userId, userId)))
        .limit(1);

      if (existingProduct.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission to edit it',
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

      // Update product
      await db
        .update(product)
        .set({
          name: parsedInput.name,
          description: parsedInput.description || null,
          categoryId: categoryId,
          logo: logoUrl,
          ogImage: ogImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(product.id, parsedInput.id));

      return {
        success: true,
        data: {
          id: parsedInput.id,
        },
      };
    } catch (error) {
      console.error('Update product error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update product',
      };
    }
  });
