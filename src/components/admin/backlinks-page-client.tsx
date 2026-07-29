'use client';

import { BacklinksTable } from '@/components/admin/backlinks-table';
import { getSortingStateParser } from '@/components/data-table/lib/parsers';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import {
  type Backlink,
  backlinksKeys,
  useBacklinks,
  useUpdateDirectory,
} from '@/hooks/use-backlinks';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export function BacklinksPageClient() {
  const queryClient = useQueryClient();
  const [updatingDirectoryId, setUpdatingDirectoryId] = useState<string | null>(
    null
  );

  // Mutation for updating directory status (quick update from table)
  const updateDirectory = useUpdateDirectory();

  const updateStatusMutation = {
    mutate: async ({
      directoryId,
      status,
    }: {
      directoryId: string;
      status: 'active' | 'pending' | 'rejected';
    }) => {
      setUpdatingDirectoryId(directoryId);
      try {
        await updateDirectory.mutateAsync({
          directoryId,
          status,
        });
        toast.success('Directory status updated successfully');
      } catch (error) {
        console.error('Error updating directory status:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to update status'
        );
      } finally {
        setUpdatingDirectoryId(null);
      }
    },
    isPending: updateDirectory.isPending,
  };

  const sortableColumnIds = useMemo<
    Array<Extract<keyof Backlink, string> | 'domain'>
  >(
    () => [
      'name',
      'url',
      'domain', // Domain column (extracted from url)
      'dr', // Note: dr and traffic are from joined table, but mapped in action
      'traffic',
      'pricing',
      'category',
      'dofollow',
      'account',
      'status',
      'source',
    ],
    []
  );

  const sortableColumnSet = useMemo(
    () => new Set<string>(sortableColumnIds),
    [sortableColumnIds]
  );

  const defaultSorting = useMemo<ExtendedColumnSort<Backlink>[]>(
    () => [{ id: 'dr', desc: true }],
    []
  );

  const [
    { page, size, search, sort, pricing, status, source, dofollow, account },
    setQueryStates,
  ] = useQueryStates({
    page: parseAsIndex.withDefault(0),
    size: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    sort: getSortingStateParser<Backlink>(sortableColumnIds).withDefault(
      defaultSorting
    ),
    pricing: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
    source: parseAsString.withDefault(''),
    dofollow: parseAsString.withDefault(''),
    account: parseAsString.withDefault(''),
  });

  // normalize sorting
  const normalizeSorting = (
    value: SortingState
  ): ExtendedColumnSort<Backlink>[] => {
    const filtered = value
      .filter((item) => sortableColumnSet.has(item.id))
      .map((item) => ({
        ...item,
        // Allow 'domain' as a special column ID even though it's not a direct Backlink field
        // Type assertion needed because 'domain' is a computed column, not a Backlink field
        id: item.id as Extract<keyof Backlink, string>,
      })) as ExtendedColumnSort<Backlink>[];

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
    if (status) {
      clientFilters.push({ id: 'status', value: [status] });
      serverFilters.push({ id: 'status', value: status });
    }
    if (source) {
      clientFilters.push({ id: 'source', value: [source] });
      serverFilters.push({ id: 'source', value: source });
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
  }, [pricing, status, source, dofollow, account]);

  const filtersSignature = useMemo(
    () => JSON.stringify({ pricing, status, source, dofollow, account }),
    [pricing, status, source, dofollow, account]
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

  const { data, isLoading } = useBacklinks(
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
    const statusFilter = newFilters.find((f) => f.id === 'status');
    const sourceFilter = newFilters.find((f) => f.id === 'source');
    const dofollowFilter = newFilters.find((f) => f.id === 'dofollow');
    const accountFilter = newFilters.find((f) => f.id === 'account');

    const nextPricing =
      pricingFilter && Array.isArray(pricingFilter.value)
        ? ((pricingFilter.value[0] as string) ?? '')
        : '';
    const nextStatus =
      statusFilter && Array.isArray(statusFilter.value)
        ? ((statusFilter.value[0] as string) ?? '')
        : '';
    const nextSource =
      sourceFilter && Array.isArray(sourceFilter.value)
        ? ((sourceFilter.value[0] as string) ?? '')
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
        status: nextStatus,
        source: nextSource,
        dofollow: nextDofollow,
        account: nextAccount,
        page: 0,
      },
      { history: 'replace', shallow: true }
    );
  };

  // Handle status update
  const handleStatusUpdate = async ({
    directoryId,
    status,
  }: {
    directoryId: string;
    status: 'active' | 'pending' | 'rejected';
  }) => {
    setUpdatingDirectoryId(directoryId);
    updateStatusMutation.mutate({
      directoryId,
      status,
    });
  };

  return (
    <BacklinksTable
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
      onStatusUpdate={handleStatusUpdate}
      updatingDirectoryId={updatingDirectoryId || undefined}
    />
  );
}
