'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useDealCategories } from '@/hooks/use-public-deals';
import { AlertCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DealCategoryMobile } from './deal-category-mobile';
import { DealCategorySidebar } from './deal-category-sidebar';

interface DealCategoriesProps {
  eventType: string;
  children: ReactNode;
}

export function DealCategories({ eventType, children }: DealCategoriesProps) {
  const {
    data: categoriesData,
    isLoading,
    error,
  } = useDealCategories(eventType);

  const { categories, totalDealsCount } = categoriesData || {};

  // Always render children to allow parallel data fetching
  // DealList can load independently of categories data
  const hasCategories = categories && categories.length > 0;

  return (
    <>
      {/* Mobile Category Selector - only show if we have categories */}
      {hasCategories && (
        <div className="md:hidden mb-4">
          <DealCategoryMobile
            categories={categories}
            eventType={eventType}
            totalDealsCount={totalDealsCount || 0}
          />
        </div>
      )}

      {/* Error state for categories - show error but still render children */}
      {error && !isLoading && (
        <div className="hidden md:block mb-4 px-4">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircleIcon className="size-4" />
            <span>
              {error instanceof Error
                ? error.message
                : 'Failed to load categories'}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-8 px-4 md:px-0">
        {/* Desktop Sidebar - show skeleton when loading, actual sidebar when loaded */}
        {isLoading ? (
          <div className="hidden md:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto w-64 shrink-0">
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : hasCategories ? (
          <div className="hidden md:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto w-64 shrink-0">
            <DealCategorySidebar
              categories={categories}
              eventType={eventType}
              totalDealsCount={totalDealsCount || 0}
            />
          </div>
        ) : null}

        {/* Deal List - always rendered to allow parallel data fetching */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </>
  );
}
