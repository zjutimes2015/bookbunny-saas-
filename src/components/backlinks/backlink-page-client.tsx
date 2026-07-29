'use client';

import { BacklinkTable } from '@/components/backlinks/backlink-table';
import { getSortingStateParser } from '@/components/data-table/lib/parsers';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import {
  type PublicBacklink,
  usePublicBacklinks,
} from '@/hooks/use-public-backlinks';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';

export function BacklinkPageClient() {
  const sortableColumnIds = useMemo<
    Array<Extract<keyof PublicBacklink, string>>
  >(
    () => [
      'name',
      'url',
      'dr',
      'traffic',
      'pricing',
      'category',
      'dofollow',
      'account',
    ],
    []
  );

  const sortableColumnSet = useMemo(
    () => new Set<string>(sortableColumnIds),
    [sortableColumnIds]
  );

  const defaultSorting = useMemo<ExtendedColumnSort<PublicBacklink>[]>(
    () => [{ id: 'dr', desc: true }],
    []
  );

  const [
    { page, size, search, sort, pricing, dofollow, account },
    setQueryStates,
  ] = useQueryStates({
    page: parseAsIndex.withDefault(0),
    size: parseAsInteger.withDefault(50),
    search: parseAsString.withDefault(''),
    sort: getSortingStateParser<PublicBacklink>(sortableColumnIds).withDefault(
      defaultSorting
    ),
    pricing: parseAsString.withDefault(''),
    dofollow: parseAsString.withDefault(''),
    account: parseAsString.withDefault(''),
  });

  // normalize sorting
  const normalizeSorting = (
    value: SortingState
  ): ExtendedColumnSort<PublicBacklink>[] => {
    const filtered = value
      .filter((item) => sortableColumnSet.has(item.id))
      .map((item) => ({
        ...item,
        id: item.id as Extract<keyof PublicBacklink, string>,
      })) as ExtendedColumnSort<PublicBacklink>[];

    return filtered.length > 0 ? filtered : defaultSorting;
  };

  const safeSorting = normalizeSorting(sort);

  // Build filters
  const filters = useMemo(() => {
    const clientFilters: ColumnFiltersState = [];
    const serverFilters: Array<{ id: string; value: string }> = [];

    if (pricing) {
      clientFilters.push({ id: 'pricing', value: [pricing] });
      serverFilters.push({ id: 'pricing', value: pricing });
    }
    if (dofollow) {
      clientFilters.push({ id: 'dofollow', value: [dofollow] });
      serverFilters.push({ id: 'dofollow', value: dofollow });
    }
    if (account) {
      clientFilters.push({ id: 'account', value: [account] });
      serverFilters.push({ id: 'account', value: account });
    }

    return { clientFilters, serverFilters };
  }, [pricing, dofollow, account]);

  const filtersSignature = useMemo(
    () => JSON.stringify({ pricing, dofollow, account }),
    [pricing, dofollow, account]
  );

  const previousFiltersSignatureRef = useRef(filtersSignature);

  // reset page to 0 when filters change
  useEffect(() => {
    if (previousFiltersSignatureRef.current === filtersSignature) return;
    previousFiltersSignatureRef.current = filtersSignature;
    void setQueryStates(
      { page: 0 },
      {
        history: 'replace',
        shallow: true,
      }
    );
  }, [filtersSignature, setQueryStates]);

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

  const { data, isLoading } = usePublicBacklinks(
    page,
    size,
    search,
    safeSorting,
    filters.serverFilters
  );

  // Handle sorting change
  const handleSortingChange = (newSorting: SortingState) => {
    const nextSorting = normalizeSorting(newSorting);
    setQueryStates({ sort: nextSorting, page: 0 });
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: ColumnFiltersState) => {
    const pricingFilter = newFilters.find((f) => f.id === 'pricing');
    const dofollowFilter = newFilters.find((f) => f.id === 'dofollow');
    const accountFilter = newFilters.find((f) => f.id === 'account');

    const nextPricing =
      pricingFilter && Array.isArray(pricingFilter.value)
        ? ((pricingFilter.value[0] as string) ?? '')
        : '';
    const nextDofollow =
      dofollowFilter && Array.isArray(dofollowFilter.value)
        ? ((dofollowFilter.value[0] as string) ?? '')
        : '';
    const nextAccount =
      accountFilter && Array.isArray(accountFilter.value)
        ? ((accountFilter.value[0] as string) ?? '')
        : '';

    setQueryStates(
      {
        pricing: nextPricing,
        dofollow: nextDofollow,
        account: nextAccount,
        page: 0,
      },
      { history: 'replace', shallow: true }
    );
  };

  return (
    <BacklinkTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={localSearch}
      sorting={safeSorting}
      filters={filters.clientFilters}
      loading={isLoading}
      onSearch={handleSearchChange}
      onPageChange={(newPageIndex) => setQueryStates({ page: newPageIndex })}
      onPageSizeChange={(newPageSize) =>
        setQueryStates({ size: newPageSize, page: 0 })
      }
      onSortingChange={handleSortingChange}
      onFiltersChange={handleFiltersChange}
    />
  );
}
