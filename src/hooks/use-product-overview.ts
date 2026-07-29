'use client';

import {
  type ProductOverviewData,
  getProductOverviewAction,
} from '@/actions/get-product-overview';
import { useQuery } from '@tanstack/react-query';

// Re-export types for convenience
export type {
  DomainMetrics,
  DomainInsights,
  ProductOverviewData,
} from '@/actions/get-product-overview';

/**
 * Hook to fetch all product overview data in a single query
 * Uses React Query for caching and automatic refetching
 *
 * Returns:
 * - metrics: traffic, bounceRate, visitDuration from domain_traffic_history.data
 * - drHistory: DR trend from domain_dr_history table
 * - trafficTrend: last 3 months traffic from domain_traffic_history.data
 * - insights: keywords, sources, countries from domain_traffic_history.data
 */
export function useProductOverview(domainId: string | null) {
  return useQuery<ProductOverviewData>({
    queryKey: ['product-overview', domainId],
    queryFn: async () => {
      if (!domainId) {
        throw new Error('Domain ID is required');
      }

      const result = await getProductOverviewAction({ domainId });

      if (!result.success || !result.data) {
        throw new Error(
          result.error || 'Failed to fetch product overview data'
        );
      }

      return result.data;
    },
    enabled: !!domainId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
