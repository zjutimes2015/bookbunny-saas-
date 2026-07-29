import { fetchDomainRatingAction } from '@/actions/fetch-domain-rating';
import { fetchDomainTrafficAction } from '@/actions/fetch-domain-traffic';
import { getProductsAdminAction } from '@/actions/get-products-admin';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

export interface Product {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  description: string | null;
  private: boolean;
  domain: string;
  dr: number | null;
  traffic: number | null;
  category: string;
  categoryId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userImage: string | null;
  userTwitter: string | null;
  createdAt: Date;
}

// Simple filter interface
interface SimpleFilter {
  id: string;
  value: string;
}

// Query keys
export const productsAdminKeys = {
  all: ['products-admin'] as const,
  lists: () => [...productsAdminKeys.all, 'lists'] as const,
  list: (params: {
    pageIndex: number;
    pageSize: number;
    search: string;
    sorting: SortingState;
    filters: SimpleFilter[];
  }) => [...productsAdminKeys.lists(), params] as const,
};

// Hook to fetch products with pagination, search, and sorting
export function useProductsAdmin(
  pageIndex: number,
  pageSize: number,
  search: string,
  sorting: SortingState,
  filters: SimpleFilter[]
) {
  return useQuery({
    queryKey: productsAdminKeys.list({
      pageIndex,
      pageSize,
      search,
      sorting,
      filters,
    }),
    queryFn: async () => {
      const result = await getProductsAdminAction({
        pageIndex,
        pageSize,
        search,
        sorting,
        filters,
      });

      if (!result?.data?.success) {
        console.log('useProductsAdmin error:', result?.data?.error);
        throw new Error(result?.data?.error || 'Failed to fetch products');
      }

      return {
        items: (result.data.data?.items || []) as Product[],
        total: result.data.data?.total || 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to update domain DR (admin only)
 */
export function useUpdateDomainDr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { url: string }) => {
      const result = await fetchDomainRatingAction({
        url: data.url,
        forceRefresh: true,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update domain DR');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch products
      queryClient.invalidateQueries({
        queryKey: productsAdminKeys.lists(),
      });
      toast.success('Domain DR updated successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update domain DR'
      );
    },
  });
}

/**
 * Hook to update domain traffic (admin only)
 */
export function useUpdateDomainTraffic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { url: string }) => {
      const result = await fetchDomainTrafficAction({
        url: data.url,
        forceRefresh: true,
      });

      if (!result?.data?.success) {
        throw new Error(
          result?.data?.error || 'Failed to update domain traffic'
        );
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch products
      queryClient.invalidateQueries({
        queryKey: productsAdminKeys.lists(),
      });
      toast.success('Domain traffic updated successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update domain traffic'
      );
    },
  });
}
