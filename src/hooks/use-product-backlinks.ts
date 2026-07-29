import { getProductBacklinksAction } from '@/actions/get-product-backlinks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import type { Backlink } from './use-backlinks';

/**
 * ProductBacklink extends Backlink with product-specific backlink status information
 * status: directory.status (always 'active' for filtered results)
 * backlinkStatus: productDirectory.status (unknown/submitted/approved/rejected or null)
 * backlinkNotes: productDirectory.notes (nullable)
 */
export interface ProductBacklink extends Backlink {
  backlinkStatus: 'unknown' | 'submitted' | 'approved' | 'rejected' | null;
  backlinkNotes: string | null;
}

// Simple filter interface
interface SimpleFilter {
  id: string;
  value: string;
}

// Query keys
export const productBacklinksKeys = {
  all: ['product-backlinks'] as const,
  lists: () => [...productBacklinksKeys.all, 'lists'] as const,
  list: (params: {
    productId: string;
    pageIndex: number;
    pageSize: number;
    search: string;
    sorting: SortingState;
    filters: SimpleFilter[];
  }) => [...productBacklinksKeys.lists(), params] as const,
};

// Hook to fetch product backlinks with pagination, search, and sorting
export function useProductBacklinks(
  productId: string,
  pageIndex: number,
  pageSize: number,
  search: string,
  sorting: SortingState,
  filters: SimpleFilter[]
) {
  return useQuery({
    queryKey: productBacklinksKeys.list({
      productId,
      pageIndex,
      pageSize,
      search,
      sorting,
      filters,
    }),
    queryFn: async () => {
      const result = await getProductBacklinksAction({
        productId,
        pageIndex,
        pageSize,
        search,
        sorting,
        filters,
      });

      if (!result?.data?.success) {
        console.log('useProductBacklinks error:', result?.data?.error);
        throw new Error(
          result?.data?.error || 'Failed to fetch product backlinks'
        );
      }

      return {
        items: (result.data.data?.items || []) as ProductBacklink[],
        total: result.data.data?.total || 0,
      };
    },
    placeholderData: keepPreviousData,
    enabled: !!productId,
  });
}
