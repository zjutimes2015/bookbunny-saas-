'use server';

import { getDb } from '@/db';
import { domain, directory, product } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { sendDirectoryApplicationNotification } from '@/notification/discord';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createDirectoryApplicationSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  pricing: z.enum(['free', 'paid', 'mixed']).optional(),
  category: z
    .enum([
      'AI Tools',
      'Anything',
      'Dev Tools',
      'Boilerplates',
      'Open Source',
      'Directories',
    ])
    .optional(),
  dofollow: z.boolean().optional(),
  account: z.boolean().optional(),
});

/**
 * Create directory application to convert product to directory
 */
export const createDirectoryApplicationAction = userActionClient
  .schema(createDirectoryApplicationSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const { productId, pricing, category, dofollow, account } = parsedInput;
      const db = await getDb();

      // Verify product exists and belongs to current user, and get domain rating
      const productRecord = await db
        .select({
          id: product.id,
          userId: product.userId,
          domainId: product.domainId,
          url: product.url,
          name: product.name,
          description: product.description,
          logo: product.logo,
          ogImage: product.ogImage,
          domainRating: domain.domainRating,
        })
        .from(product)
        .innerJoin(domain, eq(product.domainId, domain.id))
        .where(and(eq(product.id, productId), eq(product.userId, userId)))
        .limit(1);

      if (productRecord.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission',
        };
      }

      const productData = productRecord[0];

      // Check if DR value is greater than 30
      if (productData.domainRating === null || productData.domainRating <= 30) {
        return {
          success: false,
          error:
            'Only products with DR value greater than 30 can apply as directory',
        };
      }

      // First check: if there's a system-sourced directory for this domain,
      // reject the application regardless of status
      // const systemDirectory = await db
      //   .select()
      //   .from(directory)
      //   .where(
      //     and(
      //       eq(directory.domainId, productData.domainId),
      //       eq(directory.source, 'system')
      //     )
      //   )
      //   .limit(1);

      // if (systemDirectory.length > 0) {
      //   return {
      //     success: false,
      //     error:
      //       'This domain is already managed by the system and cannot be submitted',
      //   };
      // }

      // Second check: if there's an active directory for this domain,
      // reject the application (only one active directory per domain)
      const activeDirectory = await db
        .select()
        .from(directory)
        .where(
          and(
            eq(directory.domainId, productData.domainId),
            eq(directory.status, 'active')
          )
        )
        .limit(1);

      if (activeDirectory.length > 0) {
        return {
          success: false,
          error: 'This domain is already listed as an active directory',
        };
      }

      // Third check: check if current user already has a pending or rejected application
      // for this specific product
      const userDirectory = await db
        .select()
        .from(directory)
        .where(
          and(
            eq(directory.domainId, productData.domainId),
            eq(directory.productId, productData.id)
          )
        )
        .limit(1);

      let directoryId: string;
      let finalDirectory: Array<typeof directory.$inferSelect>;

      if (userDirectory.length > 0) {
        const existing = userDirectory[0];
        if (existing.status === 'pending') {
          return {
            success: false,
            error: 'Your application is already pending review',
          };
        }
        // If rejected, allow re-application by updating the existing record
        if (existing.status === 'rejected') {
          directoryId = existing.id;
          finalDirectory = await db
            .update(directory)
            .set({
              domainId: productData.domainId,
              url: productData.url,
              name: productData.name,
              description: productData.description,
              logo: productData.logo,
              ogImage: productData.ogImage,
              productId: productData.id,
              status: 'pending',
              rejectedReason: null,
              pricing: pricing ?? 'free',
              category: category ?? 'Anything',
              dofollow: dofollow ?? false,
              account: account ?? false,
              updatedAt: new Date(),
            })
            .where(eq(directory.id, directoryId))
            .returning();
        } else {
          // This should not happen as we've already checked for active and system
          console.error('Unexpected directory status', existing.status);
          return {
            success: false,
            error: 'Unexpected directory status',
          };
        }
      } else {
        // Create new directory record with product information
        // Multiple users can submit applications for the same domain,
        // each will have their own directory record with different productId
        directoryId = nanoid();
        finalDirectory = await db
          .insert(directory)
          .values({
            id: directoryId,
            domainId: productData.domainId,
            url: productData.url,
            name: productData.name,
            description: productData.description,
            logo: productData.logo,
            ogImage: productData.ogImage,
            source: 'user',
            productId: productData.id,
            status: 'pending',
            dofollow: dofollow ?? false,
            account: account ?? false,
            pricing: pricing ?? 'free',
            category: category ?? 'Anything',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
      }

      // Send Discord notification to admin
      await sendDirectoryApplicationNotification({
        directoryId,
        productName: productData.name,
        productUrl: productData.url,
        userName: currentUser.name || currentUser.email,
        userId: currentUser.id,
      });

      return {
        success: true,
        data: {
          directoryId: finalDirectory[0].id,
          status: finalDirectory[0].status,
        },
      };
    } catch (error) {
      console.error('Create directory application error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to submit directory application',
      };
    }
  });
