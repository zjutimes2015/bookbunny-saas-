'use client';

import { getAllDealEventsAction } from '@/actions/get-all-deal-events';
import { ProductsTable } from '@/components/admin/products-table';
import { getSortingStateParser } from '@/components/data-table/lib/parsers';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useProductCategories } from '@/hooks/use-product';
import {
  type Product,
  productsAdminKeys,
  useProductsAdmin,
  useUpdateDomainDr,
  useUpdateDomainTraffic,
} from '@/hooks/use-products-admin';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useMemo, useRef, useState } from 'react';

export function ProductsPageClient() {
  const queryClient = useQueryClient();
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);
  const [updatingType, setUpdatingType] = useState<'dr' | 'traffic' | null>(
    null
  );

  // Get product categories for filter
  const { data: categories = [] } = useProductCategories();

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        label: cat.name,
        value: cat.id,
      })),
    [categories]
  );

  // Get deal events for filter
  const { data: dealEventsData } = useQuery({
    queryKey: ['all-deal-events'],
    queryFn: async () => {
      const result = await getAllDealEventsAction();
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to fetch deal events');
      }
      return result.data.data || [];
    },
  });

  const dealOptions = useMemo(
    () =>
      (dealEventsData || []).map((deal) => ({
        label: deal.name,
        value: deal.type,
      })),
    [dealEventsData]
  );

  const sortableColumnIds = useMemo<Array<Extract<keyof Product, string>>>(
    () => ['name', 'category', 'private', 'dr', 'traffic', 'createdAt'],
    []
  );

  const sortableColumnSet = useMemo(
    () => new Set<string>(sortableColumnIds),
    [sortableColumnIds]
  );

  const defaultSorting = useMemo<ExtendedColumnSort<Product>[]>(
    () => [{ id: 'createdAt', desc: true }],
    []
  );

  const [{ page, size, search, sort, category, deal }, setQueryStates] =
    useQueryStates({
      page: parseAsIndex.withDefault(0),
      size: parseAsInteger.withDefault(10),
      search: parseAsString.withDefault(''),
      sort: getSortingStateParser<Product>(sortableColumnIds).withDefault(
        defaultSorting
      ),
      category: parseAsString.withDefault(''),
      deal: parseAsString.withDefault(''),
    });

  // normalize sorting
  const normalizeSorting = (
    value: SortingState
  ): ExtendedColumnSort<Product>[] => {
    const filtered = value
      .filter((item) => sortableColumnSet.has(item.id))
      .map((item) => ({
        ...item,
        id: item.id as Extract<keyof Product, string>,
      })) as ExtendedColumnSort<Product>[];

    return filtered.length > 0 ? filtered : defaultSorting;
  };

  const safeSorting = normalizeSorting(sort);

  // Build filters
  const filters = useMemo(() => {
    const clientFilters: ColumnFiltersState = [];
    const serverFilters: Array<{ id: string; value: string }> = [];

    if (category) {
      clientFilters.push({ id: 'category', value: [category] });
      serverFilters.push({ id: 'category', value: category });
    }

    if (deal) {
      clientFilters.push({ id: 'deal', value: [deal] });
      serverFilters.push({ id: 'deal', value: deal });
    }

    return { clientFilters, serverFilters };
  }, [category, deal]);

  const filtersSignature = useMemo(
    () => JSON.stringify({ category, deal }),
    [category, deal]
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

  const { data, isLoading } = useProductsAdmin(
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
    const categoryFilter = newFilters.find((f) => f.id === 'category');
    const dealFilter = newFilters.find((f) => f.id === 'deal');

    const nextCategory =
      categoryFilter && Array.isArray(categoryFilter.value)
        ? ((categoryFilter.value[0] as string) ?? '')
        : '';

    const nextDeal =
      dealFilter && Array.isArray(dealFilter.value)
        ? ((dealFilter.value[0] as string) ?? '')
        : '';

    setQueryStates(
      {
        category: nextCategory,
        deal: nextDeal,
        page: 0,
      },
      { history: 'replace', shallow: true }
    );
  };

  // Mutations for updating DR and traffic
  const updateDrMutation = useUpdateDomainDr();
  const updateTrafficMutation = useUpdateDomainTraffic();

  // Handle DR update
  const handleUpdateDr = async (domain: string) => {
    setUpdatingDomain(domain);
    setUpdatingType('dr');
    try {
      await updateDrMutation.mutateAsync({ url: domain });
    } catch (error) {
      console.error('Error updating DR:', error);
    } finally {
      setUpdatingDomain(null);
      setUpdatingType(null);
    }
  };

  // Handle traffic update
  const handleUpdateTraffic = async (domain: string) => {
    setUpdatingDomain(domain);
    setUpdatingType('traffic');
    try {
      await updateTrafficMutation.mutateAsync({ url: domain });
    } catch (error) {
      console.error('Error updating traffic:', error);
    } finally {
      setUpdatingDomain(null);
      setUpdatingType(null);
    }
  };

  return (
    <ProductsTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={localSearch}
      sorting={safeSorting}
      filters={filters.clientFilters}
      loading={isLoading}
      categoryOptions={categoryOptions}
      dealOptions={dealOptions}
      onSearch={handleSearchChange}
      onPageChange={(newPageIndex) => setQueryStates({ page: newPageIndex })}
      onPageSizeChange={(newPageSize) =>
        setQueryStates({ size: newPageSize, page: 0 })
      }
      onSortingChange={handleSortingChange}
      onFiltersChange={handleFiltersChange}
      onUpdateDr={handleUpdateDr}
      onUpdateTraffic={handleUpdateTraffic}
      updatingDomain={updatingDomain || undefined}
      updatingType={updatingType || undefined}
    />
  );
}
