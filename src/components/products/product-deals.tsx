'use client';

import { ProductDealsTable } from '@/components/products/product-deals-table';
import { productDealsKeys, useProductDeals } from '@/hooks/use-product-deals';
import { useQueryClient } from '@tanstack/react-query';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useRef, useState } from 'react';

interface ProductDealsProps {
  productId: string;
}

export function ProductDeals({ productId }: ProductDealsProps) {
  const queryClient = useQueryClient();

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

  const { data, isLoading } = useProductDeals(productId, page, size, search);

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

  // Handle deal updated - invalidate queries to refresh data
  const handleDealUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: productDealsKeys.lists(),
    });
  };

  return (
    <ProductDealsTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={localSearch}
      loading={isLoading}
      productId={productId}
      onSearch={handleSearchChange}
      onPageChange={(newPage) => {
        setQueryStates({ page: newPage });
      }}
      onPageSizeChange={(newSize) => {
        setQueryStates({ size: newSize, page: 0 });
      }}
      onDealUpdated={handleDealUpdated}
    />
  );
}
