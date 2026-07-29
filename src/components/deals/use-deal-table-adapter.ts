'use client';

import { useLocaleRouter } from '@/i18n/navigation';
import type { Table } from '@tanstack/react-table';

interface UseDealTableAdapterProps {
  pageIndex: number; // 0-based
  pageSize: number;
  totalPages: number;
  eventType: string;
  category?: string;
}

/**
 * Build URL for deals page with pagination params
 */
function buildDealsUrl(
  eventType: string,
  category: string | undefined,
  pageIndex: number,
  pageSize: number
): string {
  const basePath = category
    ? `/deals/${eventType}/${category}`
    : `/deals/${eventType}`;
  const params = new URLSearchParams();
  if (pageIndex > 0) {
    params.set('page', String(pageIndex + 1)); // Convert to 1-based for URL
  }
  if (pageSize !== 20) {
    params.set('size', String(pageSize));
  }
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Adapter hook to create a virtual Table instance for DataTablePagination
 * This allows reusing DataTablePagination without modifying its logic
 * The adapter implements only the methods needed by DataTablePagination
 */
export function useDealTableAdapter({
  pageIndex,
  pageSize,
  totalPages,
  eventType,
  category,
}: UseDealTableAdapterProps): Table<unknown> {
  const router = useLocaleRouter();

  // Create a virtual table object that implements the necessary Table interface
  // Only implements methods used by DataTablePagination to minimize complexity
  const table = {
    getState: () => ({
      pagination: {
        pageIndex,
        pageSize,
      },
    }),
    setPageSize: (newPageSize: number) => {
      // Reset to first page when changing page size
      const url = buildDealsUrl(eventType, category, 0, newPageSize);
      router.push(url);
    },
    setPageIndex: (newPageIndex: number) => {
      const url = buildDealsUrl(eventType, category, newPageIndex, pageSize);
      router.push(url);
    },
    previousPage: () => {
      if (pageIndex > 0) {
        const url = buildDealsUrl(eventType, category, pageIndex - 1, pageSize);
        router.push(url);
      }
    },
    nextPage: () => {
      if (pageIndex < totalPages - 1) {
        const url = buildDealsUrl(eventType, category, pageIndex + 1, pageSize);
        router.push(url);
      }
    },
    getCanPreviousPage: () => pageIndex > 0,
    getCanNextPage: () => pageIndex < totalPages - 1,
    getPageCount: () => totalPages,
  } as Table<unknown>;

  return table;
}
