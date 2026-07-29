'use server';

import { getDb } from '@/db';
import { dealEvent, product, productDeal } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { sendProductDealNotification } from '@/notification/discord';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createProductDealSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  dealEventId: z.string().min(1, 'Deal event ID is required'),
  price: z.number().int().positive('Price must be a positive integer'),
  originalPrice: z.number().int().positive().optional(),
  discount: z.string().optional(),
  couponCode: z.string().optional(),
});

/**
 * Create or update product deal for current user
 */
export const createProductDealAction = userActionClient
  .schema(createProductDealSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const currentUser = (ctx as { user: User }).user;
      const userId = currentUser.id;
      const db = await getDb();

      // Verify product belongs to current user
      const productRecord = await db
        .select()
        .from(product)
        .where(
          and(eq(product.id, parsedInput.productId), eq(product.userId, userId))
        )
        .limit(1);

      if (productRecord.length === 0) {
        return {
          success: false,
          error: 'Product not found or you do not have permission',
        };
      }

      // Verify deal event exists and is active
      const eventRecord = await db
        .select()
        .from(dealEvent)
        .where(eq(dealEvent.id, parsedInput.dealEventId))
        .limit(1);

      if (eventRecord.length === 0) {
        return {
          success: false,
          error: 'Deal event not found',
        };
      }

      if (eventRecord[0].status !== 'active') {
        return {
          success: false,
          error: 'This deal event is no longer active',
        };
      }

      // Check if deal already exists
      const existingDeal = await db
        .select()
        .from(productDeal)
        .where(
          and(
            eq(productDeal.productId, parsedInput.productId),
            eq(productDeal.dealEventId, parsedInput.dealEventId)
          )
        )
        .limit(1);

      if (existingDeal.length > 0) {
        // Update existing deal
        await db
          .update(productDeal)
          .set({
            price: parsedInput.price,
            originalPrice: parsedInput.originalPrice ?? null,
            discount: parsedInput.discount ?? null,
            couponCode: parsedInput.couponCode ?? null,
            updatedAt: new Date(),
          })
          .where(eq(productDeal.id, existingDeal[0].id));

        return {
          success: true,
          data: {
            id: existingDeal[0].id,
            ...parsedInput,
          },
        };
      }

      // Create new deal
      const dealId = nanoid();
      await db.insert(productDeal).values({
        id: dealId,
        productId: parsedInput.productId,
        dealEventId: parsedInput.dealEventId,
        price: parsedInput.price,
        originalPrice: parsedInput.originalPrice ?? null,
        discount: parsedInput.discount ?? null,
        couponCode: parsedInput.couponCode ?? null,
      });

      // Send Discord notification to admin
      await sendProductDealNotification({
        productName: productRecord[0].name,
        productUrl: productRecord[0].url,
        dealEventName: eventRecord[0].name,
        price: parsedInput.price,
        userName: currentUser.name || currentUser.email,
        userId: currentUser.id,
      });

      return {
        success: true,
        data: {
          id: dealId,
          ...parsedInput,
        },
      };
    } catch (error) {
      console.error('Create product deal error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create product deal',
      };
    }
  });
