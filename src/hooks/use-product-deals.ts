'use client';

import { createProductDealAction } from '@/actions/create-product-deal';
import { deleteProductDealAction } from '@/actions/delete-product-deal';
import { getProductDealsAction } from '@/actions/get-product-deals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * ProductDeal represents a deal event with product's participation status
 * Contains deal event info and product deal info (null if product hasn't joined)
 */
export interface ProductDeal {
  // Deal event info
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  // Product deal info (null if product hasn't joined this event)
  productDealId: string | null;
  price: number | null;
  originalPrice: number | null;
  discount: string | null;
  couponCode: string | null;
  productDealCreatedAt: Date | null;
}

// Query keys for product deals
export const productDealsKeys = {
  all: ['product-deals'] as const,
  lists: () => [...productDealsKeys.all, 'list'] as const,
  list: (productId: string, page: number, pageSize: number, search: string) =>
    [...productDealsKeys.lists(), productId, page, pageSize, search] as const,
};

/**
 * Hook to fetch deal events with product deal participation status
 */
export function useProductDeals(
  productId: string,
  page: number,
  pageSize: number,
  search: string
) {
  return useQuery({
    queryKey: productDealsKeys.list(productId, page, pageSize, search),
    queryFn: async () => {
      const result = await getProductDealsAction({
        productId,
        page,
        pageSize,
        search: search || undefined,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to fetch product deals');
      }

      return {
        items: (result.data.data?.items || []) as ProductDeal[],
        total: result.data.data?.total || 0,
        page: result.data.data?.page || 0,
        pageSize: result.data.data?.pageSize || 10,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create or update product deal
 */
export function useCreateProductDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      dealEventId: string;
      price: number;
      originalPrice?: number;
      discount?: string;
      couponCode?: string;
    }) => {
      const result = await createProductDealAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to create product deal');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate product deals queries
      queryClient.invalidateQueries({
        queryKey: productDealsKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete product deal
 */
export function useDeleteProductDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string; dealEventId: string }) => {
      const result = await deleteProductDealAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete product deal');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate product deals queries
      queryClient.invalidateQueries({
        queryKey: productDealsKeys.lists(),
      });
    },
  });
}
