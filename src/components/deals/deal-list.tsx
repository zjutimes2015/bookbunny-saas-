'use client';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicDeals } from '@/hooks/use-public-deals';
import { AlertCircleIcon, GiftIcon } from 'lucide-react';
import { DealCard } from './deal-card';
import { useDealTableAdapter } from './use-deal-table-adapter';

interface DealListProps {
  eventType: string;
  category?: string;
  pageIndex: number;
  pageSize: number;
}

export function DealList({
  eventType,
  category,
  pageIndex,
  pageSize,
}: DealListProps) {
  const {
    data: dealsData,
    isLoading,
    error,
  } = usePublicDeals(eventType, category, pageIndex, pageSize);

  // Calculate totalPages - use 0 if data not loaded yet
  const totalPages = Math.ceil((dealsData?.total || 0) / pageSize);

  // Create adapter table instance for DataTablePagination
  // Must be called before any conditional returns to follow Rules of Hooks
  const table = useDealTableAdapter({
    pageIndex,
    pageSize,
    totalPages,
    eventType,
    category,
  });

  // Loading state - show skeleton cards
  if (isLoading && !dealsData) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircleIcon className="size-12 text-destructive/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground">
          Failed to load deals
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later.'}
        </p>
      </div>
    );
  }

  // Empty state
  if (!dealsData || dealsData.deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GiftIcon className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">No deals found</p>
      </div>
    );
  }

  // Don't show pagination if there's only one page or no pages
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {dealsData.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>

      {showPagination && (
        <div className="border-t pt-4">
          <DataTablePagination
            table={table}
            pageSizeOptions={[10, 20, 30, 50]}
          />
        </div>
      )}
    </div>
  );
}
