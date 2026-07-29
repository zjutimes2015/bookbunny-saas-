'use client';

import { cancelDirectoryApplicationAction } from '@/actions/cancel-directory-application';
import { checkDomainExistsAction } from '@/actions/check-domain-exists';
import { createDirectoryApplicationAction } from '@/actions/create-directory-application';
import { deleteProductAction } from '@/actions/delete-product';
import { fetchDomainRatingAction } from '@/actions/fetch-domain-rating';
import { fetchDomainTrafficAction } from '@/actions/fetch-domain-traffic';
import { fetchWebsiteInfoAction } from '@/actions/fetch-website-info';
import { getDirectoryByProductIdAction } from '@/actions/get-directory-by-product-id';
import { getProductCategoriesAction } from '@/actions/get-product-categories';
import { getProductsAction } from '@/actions/get-products';
import { submitProductAction } from '@/actions/submit-product';
import { updateProductAction } from '@/actions/update-product';
import { updateProductPrivacyAction } from '@/actions/update-product-privacy';
import type { DomainRating } from '@/lib/ahrefs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to fetch website info using server action
 */
export function useFetchWebsiteInfo(url: string | null, enabled = false) {
  return useQuery({
    queryKey: ['website-info', url],
    queryFn: async () => {
      if (!url) {
        throw new Error('URL is required');
      }

      const result = await fetchWebsiteInfoAction({ url });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to fetch website info');
      }

      return result.data.data;
    },
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch domain rating from Ahrefs via server action
 */
export function useFetchDomainRating(url: string | null, enabled = false) {
  return useQuery({
    queryKey: ['domain-dr', url],
    queryFn: async () => {
      if (!url) {
        throw new Error('URL is required');
      }

      const result = await fetchDomainRatingAction({ url });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to fetch domain rating');
      }

      return result.data.data as DomainRating;
    },
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch domain traffic from Similarweb via server action
 */
export function useFetchDomainTraffic(url: string | null, enabled = false) {
  return useQuery({
    queryKey: ['domain-traffic', url],
    queryFn: async () => {
      if (!url) {
        throw new Error('URL is required');
      }

      const result = await fetchDomainTrafficAction({ url });

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to fetch domain traffic'
        );
      }

      return result.data.data as { traffic: number | null };
    },
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if domain already exists for current user
 */
export function useCheckDomainExists(url: string | null, enabled = false) {
  return useQuery({
    queryKey: ['check-domain-exists', url],
    queryFn: async () => {
      if (!url) {
        throw new Error('URL is required');
      }

      const result = await checkDomainExistsAction({ url });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to check domain');
      }

      return result.data.data;
    },
    enabled: enabled && !!url,
    staleTime: 0, // Always check fresh
  });
}

/**
 * Hook to submit product
 */
export function useSubmitProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      url: string;
      name: string;
      description: string;
      categoryId: string;
      logo?: string;
      ogImage?: string;
      markdown?: string;
    }) => {
      const result = await submitProductAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to submit product');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to update product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description: string;
      categoryId: string;
      logo?: string;
      ogImage?: string;
    }) => {
      const result = await updateProductAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update product');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string }) => {
      const result = await deleteProductAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete product');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to get directory status by product ID
 */
export function useDirectoryByProductId(productId: string | null) {
  return useQuery({
    queryKey: ['directory-by-product-id', productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const result = await getDirectoryByProductIdAction({ productId });

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to fetch directory status'
        );
      }

      return result.data.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create directory application
 */
export function useCreateDirectoryApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      pricing?: 'free' | 'paid' | 'mixed';
      category?:
        | 'AI Tools'
        | 'Anything'
        | 'Dev Tools'
        | 'Boilerplates'
        | 'Open Source'
        | 'Directories';
      dofollow?: boolean;
      account?: boolean;
    }) => {
      const result = await createDirectoryApplicationAction(data);

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to create directory application'
        );
      }

      return result.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate directory status query
      queryClient.invalidateQueries({
        queryKey: ['directory-by-product-id', variables.productId],
      });
    },
  });
}

/**
 * Hook to cancel directory application
 */
export function useCancelDirectoryApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string }) => {
      const result = await cancelDirectoryApplicationAction(data);

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to cancel directory application'
        );
      }

      return result.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate directory status query
      queryClient.invalidateQueries({
        queryKey: ['directory-by-product-id', variables.productId],
      });
    },
  });
}

/**
 * Hook to update product privacy setting
 */
export function useUpdateProductPrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string; private: boolean }) => {
      const result = await updateProductPrivacyAction(data);

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to update product privacy'
        );
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to fetch product categories
 */
export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const result = await getProductCategoriesAction();

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to fetch product categories');
      }

      return result.data || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - categories rarely change
  });
}

/**
 * Product type returned from getProductsAction
 */
export interface Product {
  id: string;
  url: string;
  name: string;
  description: string | null;
  logo: string | null;
  ogImage: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  domainRating: number | null;
}

/**
 * Hook to fetch current user's products
 * @param options.enabled - Whether the query is enabled (default: true)
 * @param options.throwOnError - Whether to throw error on failure (default: true). If false, returns empty array on error
 */
export function useProducts(options?: {
  enabled?: boolean;
  throwOnError?: boolean;
}) {
  const { enabled = true, throwOnError = true } = options || {};

  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const result = await getProductsAction();

      if (!result?.data?.success) {
        if (throwOnError) {
          throw new Error(result?.data?.error || 'Failed to fetch products');
        }
        return [];
      }

      return (result.data.data || []) as Product[];
    },
    enabled,
  });
}
