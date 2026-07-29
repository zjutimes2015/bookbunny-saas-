'use client';

import { updateProductDirectoryStatusAction } from '@/actions/update-product-directory-status';
import { getSortingStateParser } from '@/components/data-table/lib/parsers';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import { ProductBacklinksTable } from '@/components/products/product-backlinks-table';
import {
  type ProductBacklink,
  productBacklinksKeys,
  useProductBacklinks,
} from '@/hooks/use-product-backlinks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ProductBacklinksProps {
  productId: string;
}

export function ProductBacklinks({ productId }: ProductBacklinksProps) {
  const queryClient = useQueryClient();
  const [updatingDirectoryId, setUpdatingDirectoryId] = useState<string | null>(
    null
  );

  // Mutation for updating product directory status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      directoryId,
      status,
    }: {
      directoryId: string;
      status: 'unknown' | 'submitted' | 'approved' | 'rejected';
    }) => {
      const result = await updateProductDirectoryStatusAction({
        productId,
        directoryId,
        status,
      });
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update status');
      }
      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch product backlinks
      queryClient.invalidateQueries({
        queryKey: productBacklinksKeys.lists(),
      });
    },
    onSettled: () => {
      setUpdatingDirectoryId(null);
    },
  });

  const sortableColumnIds = useMemo<
    Array<Extract<keyof ProductBacklink, string>>
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
      'source',
      'backlinkStatus',
    ],
    []
  );

  const sortableColumnSet = useMemo(
    () => new Set<string>(sortableColumnIds),
    [sortableColumnIds]
  );

  const defaultSorting = useMemo<ExtendedColumnSort<ProductBacklink>[]>(
    () => [{ id: 'dr', desc: true }],
    []
  );

  const [
    { page, size, search, sort, pricing, source, dofollow, account, status },
    setQueryStates,
  ] = useQueryStates({
    page: parseAsIndex.withDefault(0),
    size: parseAsInteger.withDefault(10),
    search: parseAsString.withDefault(''),
    sort: getSortingStateParser<ProductBacklink>(sortableColumnIds).withDefault(
      defaultSorting
    ),
    pricing: parseAsString.withDefault(''),
    source: parseAsString.withDefault(''),
    dofollow: parseAsString.withDefault(''),
    account: parseAsString.withDefault(''),
    status: parseAsString.withDefault(''),
  });

  // normalize sorting
  const normalizeSorting = (
    value: SortingState
  ): ExtendedColumnSort<ProductBacklink>[] => {
    const filtered = value
      .filter((item) => sortableColumnSet.has(item.id))
      .map((item) => ({
        ...item,
        id: item.id as Extract<keyof ProductBacklink, string>,
      })) as ExtendedColumnSort<ProductBacklink>[];

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
    if (status) {
      // Use 'backlinkStatus' for client filter (matches column id)
      clientFilters.push({ id: 'backlinkStatus', value: [status] });
      // Use 'backlinkStatus' for server filter (matches server-side filter id)
      serverFilters.push({ id: 'backlinkStatus', value: status });
    }

    return { clientFilters, serverFilters };
  }, [pricing, source, dofollow, account, status]);

  const filtersSignature = useMemo(
    () => JSON.stringify({ pricing, source, dofollow, account, status }),
    [pricing, source, dofollow, account, status]
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

  const { data, isLoading } = useProductBacklinks(
    productId,
    page,
    size,
    search,
    safeSorting,
    filters.serverFilters
  );

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

  // Handle sorting change
  const handleSortingChange = (newSorting: SortingState) => {
    const nextSorting = normalizeSorting(newSorting);
    setQueryStates({ sort: nextSorting, page: 0 });
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: ColumnFiltersState) => {
    const pricingFilter = newFilters.find((f) => f.id === 'pricing');
    const sourceFilter = newFilters.find((f) => f.id === 'source');
    const dofollowFilter = newFilters.find((f) => f.id === 'dofollow');
    const accountFilter = newFilters.find((f) => f.id === 'account');
    const statusFilter = newFilters.find((f) => f.id === 'backlinkStatus');

    const nextPricing =
      pricingFilter && Array.isArray(pricingFilter.value)
        ? ((pricingFilter.value[0] as string) ?? '')
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
    const nextStatus =
      statusFilter && Array.isArray(statusFilter.value)
        ? ((statusFilter.value[0] as string) ?? '')
        : '';

    setQueryStates(
      {
        pricing: nextPricing,
        source: nextSource,
        dofollow: nextDofollow,
        account: nextAccount,
        status: nextStatus,
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
    status: 'unknown' | 'submitted' | 'approved' | 'rejected';
  }) => {
    setUpdatingDirectoryId(directoryId);
    updateStatusMutation.mutate({
      directoryId,
      status,
    });
  };

  return (
    <ProductBacklinksTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={localSearch}
      sorting={safeSorting}
      filters={filters.clientFilters}
      loading={isLoading}
      productId={productId}
      onSearch={handleSearchChange}
      onPageChange={(newPage) => {
        setQueryStates({ page: newPage });
      }}
      onPageSizeChange={(newSize) => {
        setQueryStates({ size: newSize, page: 0 });
      }}
      onSortingChange={handleSortingChange}
      onFiltersChange={handleFiltersChange}
      onStatusUpdate={handleStatusUpdate}
      updatingDirectoryId={updatingDirectoryId || undefined}
    />
  );
}
