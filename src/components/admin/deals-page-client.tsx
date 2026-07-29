'use client';

import { DealsTable } from '@/components/admin/deals-table';
import { useDealEvents } from '@/hooks/use-deal-events';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useRef, useState } from 'react';

export function DealsPageClient() {
  const [{ page, size, search }, setQueryStates] = useQueryStates({
    page: parseAsIndex.withDefault(0),
    size: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
  });

  // Use local state for search input to keep it responsive
  const [localSearch, setLocalSearch] = useState(search);
  // Use ref to track the latest search value to prevent race conditions
  const latestSearchRef = useRef(search);
  // Use ref to track debounce timer for cancellation
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local search with URL search when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalSearch(search);
    latestSearchRef.current = search;
  }, [search]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle search input change with custom debounce
  const handleSearchChange = (newSearch: string) => {
    setLocalSearch(newSearch);
    latestSearchRef.current = newSearch;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If clearing search, update immediately
    if (newSearch === '') {
      setQueryStates({ search: '', page: 0 });
    } else {
      // Debounce the URL update
      debounceTimerRef.current = setTimeout(() => {
        // Only update if this is still the latest value
        if (latestSearchRef.current === newSearch) {
          setQueryStates({ search: newSearch, page: 0 });
        }
        debounceTimerRef.current = null;
      }, 300);
    }
  };

  const { data, isLoading } = useDealEvents(page, size, search);

  return (
    <DealsTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={localSearch}
      loading={isLoading}
      onSearch={handleSearchChange}
      onPageChange={(newPageIndex) => setQueryStates({ page: newPageIndex })}
      onPageSizeChange={(newPageSize) =>
        setQueryStates({ size: newPageSize, page: 0 })
      }
    />
  );
}
