'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocaleLink, useLocaleRouter } from '@/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface DealPaginationProps {
  currentPage: number; // 1-based page number
  totalPages: number;
  pageSize: number;
  eventType: string;
  category?: string;
  pageSizeOptions?: number[];
}

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

function PageSizeSelector({
  pageSize,
  eventType,
  category,
  pageSizeOptions,
}: {
  pageSize: number;
  eventType: string;
  category?: string;
  pageSizeOptions: number[];
}) {
  const router = useLocaleRouter();

  const handlePageSizeChange = (newSize: number) => {
    const url = buildDealsUrl(eventType, category, 0, newSize);
    router.push(url);
  };

  return (
    <div className="flex items-center space-x-2">
      <p className="whitespace-nowrap text-sm font-medium">Rows per page</p>
      <Select
        value={`${pageSize}`}
        onValueChange={(value) => {
          handlePageSizeChange(Number(value));
        }}
      >
        <SelectTrigger className="h-8 w-[70px]">
          <SelectValue placeholder={pageSize} />
        </SelectTrigger>
        <SelectContent side="top">
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={`${size}`}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DealPagination({
  currentPage,
  totalPages,
  pageSize,
  eventType,
  category,
  pageSizeOptions = [10, 20, 30, 50],
}: DealPaginationProps) {
  // Don't show pagination if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
      <PageSizeSelector
        pageSize={pageSize}
        eventType={eventType}
        category={category}
        pageSizeOptions={pageSizeOptions}
      />
      <div className="flex items-center justify-center text-sm font-medium">
        Page {currentPage} / {totalPages}
      </div>
      <div className="flex items-center space-x-2">
        {currentPage === 1 ? (
          <Button
            aria-label="First page"
            variant="outline"
            size="icon"
            className="size-8"
            disabled
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            aria-label="First page"
            variant="outline"
            size="icon"
            className="size-8"
            asChild
          >
            <LocaleLink href={buildDealsUrl(eventType, category, 0, pageSize)}>
              <ChevronsLeft className="h-4 w-4" />
            </LocaleLink>
          </Button>
        )}
        {currentPage === 1 ? (
          <Button
            aria-label="Previous page"
            variant="outline"
            size="icon"
            className="size-8"
            disabled
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            aria-label="Previous page"
            variant="outline"
            size="icon"
            className="size-8"
            asChild
          >
            <LocaleLink
              href={buildDealsUrl(
                eventType,
                category,
                currentPage - 2,
                pageSize
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </LocaleLink>
          </Button>
        )}
        {currentPage >= totalPages ? (
          <Button
            aria-label="Next page"
            variant="outline"
            size="icon"
            className="size-8"
            disabled
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            aria-label="Next page"
            variant="outline"
            size="icon"
            className="size-8"
            asChild
          >
            <LocaleLink
              href={buildDealsUrl(eventType, category, currentPage, pageSize)}
            >
              <ChevronRight className="h-4 w-4" />
            </LocaleLink>
          </Button>
        )}
        {currentPage >= totalPages ? (
          <Button
            aria-label="Last page"
            variant="outline"
            size="icon"
            className="size-8"
            disabled
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            aria-label="Last page"
            variant="outline"
            size="icon"
            className="size-8"
            asChild
          >
            <LocaleLink
              href={buildDealsUrl(
                eventType,
                category,
                totalPages - 1,
                pageSize
              )}
            >
              <ChevronsRight className="h-4 w-4" />
            </LocaleLink>
          </Button>
        )}
      </div>
    </div>
  );
}
