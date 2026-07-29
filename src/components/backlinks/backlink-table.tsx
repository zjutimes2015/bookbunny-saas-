'use client';

import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PublicBacklink } from '@/hooks/use-public-backlinks';
import { getExternalUrl, getFaviconUrl } from '@/lib/urls/urls';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CheckIcon,
  CircleDashedIcon,
  DollarSignIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <TableRow className="h-14">
      {Array.from({ length: columns }).map((_, index) => (
        <TableCell key={index} className="py-3">
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

interface BacklinkTableProps {
  data: PublicBacklink[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
  filters?: ColumnFiltersState;
  loading?: boolean;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onFiltersChange?: (filters: ColumnFiltersState) => void;
}

export function BacklinkTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  sorting,
  filters,
  loading,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onSortingChange,
  onFiltersChange,
}: BacklinkTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const pricingOptions = [
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' },
    { label: 'Mixed', value: 'mixed' },
  ];

  const followOptions = [
    { label: 'Dofollow', value: 'true' },
    { label: 'Nofollow', value: 'false' },
  ];

  const accountOptions = [
    { label: 'Required', value: 'true' },
    { label: 'Optional', value: 'false' },
  ];

  const columns: ColumnDef<PublicBacklink>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <div className="pl-4 w-[200px] min-w-[200px]">
            <DataTableColumnHeader column={column} label="Name" />
          </div>
        ),
        cell: ({ row }) => {
          const faviconUrl = getFaviconUrl(row.original.url);
          return (
            <div className="pl-4 w-[200px] min-w-[200px]">
              <a
                href={getExternalUrl(row.original.url)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-2 text-foreground hover:underline hover:underline-offset-4"
              >
                <div className="relative size-6 shrink-0 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={faviconUrl}
                    alt={row.original.name}
                    className="size-full object-cover"
                  />
                </div>
                <span>{row.original.name}</span>
              </a>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'dr',
        accessorKey: 'dr',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="DR" />
        ),
        cell: ({ row }) => <div>{row.getValue('dr') ?? '-'}</div>,
        enableSorting: true,
      },
      {
        id: 'traffic',
        accessorKey: 'traffic',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Traffic" />
        ),
        cell: ({ row }) => {
          const traffic = row.getValue('traffic') as string;
          if (!traffic) return '-';
          // traffic is a number, convert to thousands or millions
          const trafficNumber = Number(traffic);
          if (trafficNumber < 1000) return <div>{trafficNumber}</div>;
          if (trafficNumber < 1000000)
            return <div>{Math.round(trafficNumber / 1000)}K</div>;
          return <div>{Math.round(trafficNumber / 1000000)}M</div>;
        },
        enableSorting: true,
      },
      {
        id: 'pricing',
        accessorKey: 'pricing',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Pricing" />
        ),
        cell: ({ row }) => {
          const pricing = row.getValue('pricing') as string;
          if (!pricing) return '-';
          return (
            <Badge
              variant="outline"
              className="px-1.5 hover:bg-accent capitalize"
            >
              {pricing === 'free' ? (
                <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
              ) : pricing === 'paid' ? (
                <DollarSignIcon className="mr-1 h-3 w-3 stroke-red-500 dark:stroke-red-400" />
              ) : (
                <CircleDashedIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
              )}
              {pricing}
            </Badge>
          );
        },
        enableSorting: true,
      },
      {
        id: 'dofollow',
        accessorKey: 'dofollow',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Dofollow" />
        ),
        cell: ({ row }) => {
          const dofollow = row.getValue('dofollow') as boolean;
          return (
            <Badge variant="outline" className="px-1.5 hover:bg-accent">
              {dofollow ? (
                <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
              ) : (
                <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
              )}
              {dofollow ? 'Dofollow' : 'Nofollow'}
            </Badge>
          );
        },
        enableSorting: true,
      },
      {
        id: 'account',
        accessorKey: 'account',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Account" />
        ),
        cell: ({ row }) => {
          const account = row.getValue('account') as boolean;
          return (
            <Badge variant="outline" className="px-1.5 hover:bg-accent">
              {account ? (
                <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
              ) : (
                <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
              )}
              {account ? 'Required' : 'Optional'}
            </Badge>
          );
        },
        enableSorting: true,
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Category" />
        ),
        cell: ({ row }) => {
          const category = row.getValue('category') as string;
          if (!category) return '-';
          return (
            <Badge
              variant="outline"
              className="px-1.5 hover:bg-accent capitalize"
            >
              {category}
            </Badge>
          );
        },
        enableSorting: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      sorting,
      columnFilters: filters ?? [],
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(filters ?? []) : updater;
      onFiltersChange?.(next);
      onPageChange(0);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater;
      if (next.pageSize !== pageSize) {
        onPageSizeChange(next.pageSize);
        if (pageIndex !== 0) onPageChange(0);
      } else if (next.pageIndex !== pageIndex) {
        onPageChange(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
  });

  return (
    <div className="w-full space-y-4">
      <div className="">
        <DataTableAdvancedToolbar table={table}>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Search name or url..."
                value={search}
                onChange={(event) => {
                  onSearch(event.target.value);
                }}
                className="h-8 w-[260px] pr-8"
              />
              {search.length > 0 ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    onSearch('');
                  }}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <DataTableFacetedFilter
              column={table.getColumn('pricing')}
              title="Pricing"
              options={pricingOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn('dofollow')}
              title="Dofollow"
              options={followOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn('account')}
              title="Account"
              options={accountOptions}
            />
          </div>
        </DataTableAdvancedToolbar>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={columns.length} />
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="h-14"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No backlinks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="px-0" />
      </div>
    </div>
  );
}
