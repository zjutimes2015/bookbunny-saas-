'use client';

import {
  type CategoryWithCount as CategoryWithCountFromCategories,
  getDealCategoriesByEventAction,
} from '@/actions/get-deal-categories-by-event';
import {
  type CategoryWithCount,
  type DealWithProduct,
  getDealsByEventAction,
} from '@/actions/get-deals-by-event';
import {
  type DealEvent,
  getPublicDealEventsAction,
} from '@/actions/get-public-deal-events';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export type { CategoryWithCount, DealEvent, DealWithProduct };

export type PublicDealsData = {
  event: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  deals: DealWithProduct[];
  total: number;
  page: number;
  pageSize: number;
};

export type DealCategoriesData = {
  event: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  categories: CategoryWithCountFromCategories[];
  totalDealsCount: number;
};

// Query keys for public deals
export const publicDealsKeys = {
  all: ['public-deals'] as const,
  events: () => [...publicDealsKeys.all, 'events'] as const,
  categories: (eventType: string) =>
    [...publicDealsKeys.all, 'categories', eventType] as const,
  byEvent: (
    eventType: string,
    categorySlug?: string,
    pageIndex?: number,
    pageSize?: number
  ) =>
    [
      ...publicDealsKeys.all,
      eventType,
      categorySlug,
      pageIndex,
      pageSize,
    ] as const,
};

/**
 * Hook to fetch all public deal events
 * Used in layout to render event tabs
 */
export function useDealEvents() {
  return useQuery<DealEvent[]>({
    queryKey: publicDealsKeys.events(),
    queryFn: async () => {
      const result = await getPublicDealEventsAction();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deal events');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - events don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch deal categories by event type
 * Used in layout to render category sidebar
 */
export function useDealCategories(eventType: string) {
  return useQuery<DealCategoriesData>({
    queryKey: publicDealsKeys.categories(eventType),
    queryFn: async () => {
      const result = await getDealCategoriesByEventAction(eventType);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch deal categories');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch public deals by event type and optional category with pagination
 * Uses React Query for caching and automatic refetching
 */
export function usePublicDeals(
  eventType: string,
  category?: string,
  pageIndex = 0,
  pageSize = 20
) {
  return useQuery<PublicDealsData>({
    queryKey: publicDealsKeys.byEvent(eventType, category, pageIndex, pageSize),
    queryFn: async () => {
      const result = await getDealsByEventAction({
        eventType,
        category,
        pageIndex,
        pageSize,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch deals');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData, // Keep previous data while loading
  });
}
