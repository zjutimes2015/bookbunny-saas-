import { getBacklinksAction } from '@/actions/get-backlinks';
import { updateDirectoryAction } from '@/actions/update-directory';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

export interface Backlink {
  id: string;
  name: string;
  url: string;
  dr: number | null;
  traffic: number | null;
  pricing: string | null;
  category: string | null;
  dofollow: boolean;
  account: boolean;
  status: string;
  source: string;
  rejectedReason: string | null;
  createdAt: Date;
}

// Simple filter interface
interface SimpleFilter {
  id: string;
  value: string;
}

// Query keys
export const backlinksKeys = {
  all: ['backlinks'] as const,
  lists: () => [...backlinksKeys.all, 'lists'] as const,
  list: (params: {
    pageIndex: number;
    pageSize: number;
    search: string;
    sorting: SortingState;
    filters: SimpleFilter[];
  }) => [...backlinksKeys.lists(), params] as const,
};

// Hook to fetch backlinks with pagination, search, and sorting
export function useBacklinks(
  pageIndex: number,
  pageSize: number,
  search: string,
  sorting: SortingState,
  filters: SimpleFilter[]
) {
  return useQuery({
    queryKey: backlinksKeys.list({
      pageIndex,
      pageSize,
      search,
      sorting,
      filters,
    }),
    queryFn: async () => {
      const result = await getBacklinksAction({
        pageIndex,
        pageSize,
        search,
        sorting,
        filters,
      });

      if (!result?.data?.success) {
        console.log('useBacklinks error:', result?.data?.error);
        throw new Error(result?.data?.error || 'Failed to fetch backlinks');
      }

      return {
        items: (result.data.data?.items || []) as Backlink[],
        total: result.data.data?.total || 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to update directory (admin only)
 */
export function useUpdateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      directoryId: string;
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
      status?: 'active' | 'pending' | 'rejected';
      rejectedReason?: string | null;
    }) => {
      const result = await updateDirectoryAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update directory');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch backlinks
      queryClient.invalidateQueries({
        queryKey: backlinksKeys.lists(),
      });
    },
  });
}
