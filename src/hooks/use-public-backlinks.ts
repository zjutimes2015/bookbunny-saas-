import { getPublicBacklinksAction } from '@/actions/get-public-backlinks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

export interface PublicBacklink {
  id: string;
  name: string;
  url: string;
  dr: number | null;
  traffic: number | null;
  pricing: string | null;
  category: string | null;
  dofollow: boolean;
  account: boolean;
  createdAt: Date;
}

// Simple filter interface
interface SimpleFilter {
  id: string;
  value: string;
}

// Query keys
export const publicBacklinksKeys = {
  all: ['public-backlinks'] as const,
  lists: () => [...publicBacklinksKeys.all, 'lists'] as const,
  list: (params: {
    pageIndex: number;
    pageSize: number;
    search: string;
    sorting: SortingState;
    filters: SimpleFilter[];
  }) => [...publicBacklinksKeys.lists(), params] as const,
};

// Hook to fetch public backlinks with pagination, search, and sorting
export function usePublicBacklinks(
  pageIndex: number,
  pageSize: number,
  search: string,
  sorting: SortingState,
  filters: SimpleFilter[]
) {
  return useQuery({
    queryKey: publicBacklinksKeys.list({
      pageIndex,
      pageSize,
      search,
      sorting,
      filters,
    }),
    queryFn: async () => {
      const result = await getPublicBacklinksAction({
        pageIndex,
        pageSize,
        search,
        sorting,
        filters,
      });

      if (!result?.data?.success) {
        console.log('usePublicBacklinks error:', result?.data?.error);
        throw new Error(result?.data?.error || 'Failed to fetch backlinks');
      }

      return {
        items: (result.data.data?.items || []) as PublicBacklink[],
        total: result.data.data?.total || 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}
