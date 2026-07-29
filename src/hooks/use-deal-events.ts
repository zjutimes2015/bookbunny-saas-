'use client';

import { createDealEventAction } from '@/actions/create-deal-event';
import { deleteDealEventAction } from '@/actions/delete-deal-event';
import { getDealEventsAction } from '@/actions/get-deal-events';
import { updateDealEventAction } from '@/actions/update-deal-event';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export interface DealEvent {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
}

// Query keys
export const dealEventsKeys = {
  all: ['deal-events'] as const,
  lists: () => [...dealEventsKeys.all, 'lists'] as const,
  list: (params: { pageIndex: number; pageSize: number; search: string }) =>
    [...dealEventsKeys.lists(), params] as const,
};

// Hook to fetch deal events with pagination and search
export function useDealEvents(
  pageIndex: number,
  pageSize: number,
  search: string
) {
  return useQuery({
    queryKey: dealEventsKeys.list({
      pageIndex,
      pageSize,
      search,
    }),
    queryFn: async () => {
      const result = await getDealEventsAction({
        pageIndex,
        pageSize,
        search,
      });

      if (!result?.data?.success) {
        console.log('useDealEvents error:', result?.data?.error);
        throw new Error(result?.data?.error || 'Failed to fetch deal events');
      }

      return {
        items: (result.data.data?.items || []) as DealEvent[],
        total: result.data.data?.total || 0,
      };
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to create deal event (admin only)
 */
export function useCreateDealEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: string;
      description?: string | null;
      status?: 'active' | 'inactive';
      startDate?: Date | null;
      endDate?: Date | null;
    }) => {
      const result = await createDealEventAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to create deal event');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch deal events
      queryClient.invalidateQueries({
        queryKey: dealEventsKeys.lists(),
      });
    },
  });
}

/**
 * Hook to update deal event (admin only)
 */
export function useUpdateDealEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      dealEventId: string;
      name?: string;
      description?: string | null;
      status?: 'active' | 'inactive';
      startDate?: Date | null;
      endDate?: Date | null;
    }) => {
      const result = await updateDealEventAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update deal event');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch deal events
      queryClient.invalidateQueries({
        queryKey: dealEventsKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete deal event (admin only)
 */
export function useDeleteDealEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealEventId: string) => {
      const result = await deleteDealEventAction({ dealEventId });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete deal event');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch deal events
      queryClient.invalidateQueries({
        queryKey: dealEventsKeys.lists(),
      });
    },
  });
}
