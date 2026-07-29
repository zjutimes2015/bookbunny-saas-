'use client';

import { ProductDetailViewer } from '@/components/admin/product-detail-viewer';
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { UserAvatar } from '@/components/layout/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Product } from '@/hooks/use-products-admin';
import { LocaleLink } from '@/i18n/navigation';
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
  Loader2Icon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  TrendingUpIcon,
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

interface ProductsTableProps {
  data: Product[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
  filters?: ColumnFiltersState;
  loading?: boolean;
  categoryOptions?: Array<{ label: string; value: string }>;
  dealOptions?: Array<{ label: string; value: string }>;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onFiltersChange?: (filters: ColumnFiltersState) => void;
  onUpdateDr?: (domain: string) => void;
  onUpdateTraffic?: (domain: string) => void;
  updatingDomain?: string;
  updatingType?: 'dr' | 'traffic';
}

export function ProductsTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  sorting,
  filters,
  loading,
  categoryOptions = [],
  dealOptions = [],
  onSearch,
  onPageChange,
  onPageSizeChange,
  onSortingChange,
  onFiltersChange,
  onUpdateDr,
  onUpdateTraffic,
  updatingDomain,
  updatingType,
}: ProductsTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns: ColumnDef<Product>[] = useMemo(
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
          const product = row.original;
          const name = row.getValue('name') as string;
          const logoUrl = product.logo || getFaviconUrl(product.url);

          return (
            <div className="pl-4 w-[200px] min-w-[200px]">
              <ProductDetailViewer
                product={product}
                trigger={
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative size-6 shrink-0 overflow-hidden rounded-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt={name}
                        className="size-full object-cover"
                      />
                    </div>
                    <span className="font-medium truncate hover:underline hover:underline-offset-4">
                      {name}
                    </span>
                  </div>
                }
              />
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'domain',
        accessorKey: 'domain',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Domain" />
        ),
        cell: ({ row }) => {
          const domain = row.getValue('domain') as string;
          const externalUrl = getExternalUrl(domain);
          return (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="max-w-[200px] truncate text-sm hover:underline hover:underline-offset-4"
            >
              {domain}
            </a>
          );
        },
        enableSorting: false,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Description" />
        ),
        cell: ({ row }) => {
          const description = row.original.description;
          if (!description) return '-';
          return (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="max-w-[300px] truncate text-sm cursor-default">
                    {description}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[400px]">
                  <p className="break-words whitespace-normal">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        enableSorting: false,
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
      {
        id: 'deal',
        accessorFn: () => null, // This column is only for filtering, not displaying
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: 'private',
        accessorKey: 'private',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Privacy" />
        ),
        cell: ({ row }) => {
          const isPrivate = row.original.private;
          return (
            <Badge variant="outline" className="px-1.5 hover:bg-accent">
              {isPrivate ? (
                <>
                  <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
                  Private
                </>
              ) : (
                <>
                  <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                  Public
                </>
              )}
            </Badge>
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
          const traffic = row.getValue('traffic') as number | null;
          if (!traffic) return '-';
          // traffic is a number, convert to thousands or millions
          if (traffic < 1000) return <div>{traffic}</div>;
          if (traffic < 1000000)
            return <div>{Math.round(traffic / 1000)}K</div>;
          return <div>{Math.round(traffic / 1000000)}M</div>;
        },
        enableSorting: true,
      },
      {
        id: 'user',
        accessorKey: 'userName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="User" />
        ),
        cell: ({ row }) => {
          const product = row.original;
          const userName = product.userName;
          const userEmail = product.userEmail;
          const userImage = product.userImage;
          const userSearchUrl = `/admin/users?search=${encodeURIComponent(userEmail)}`;

          return (
            <LocaleLink
              href={userSearchUrl}
              className="flex items-center gap-2 text-sm hover:underline hover:underline-offset-4"
            >
              <UserAvatar
                name={userName}
                image={userImage}
                className="size-6"
              />
              <span className="font-medium">{userName}</span>
            </LocaleLink>
          );
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const product = row.original;
          const domain = product.domain;
          const isUpdatingDr =
            updatingDomain === domain && updatingType === 'dr';
          const isUpdatingTraffic =
            updatingDomain === domain && updatingType === 'traffic';
          const isUpdating = isUpdatingDr || isUpdatingTraffic;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (onUpdateDr && !isUpdating) {
                      onUpdateDr(domain);
                    }
                  }}
                  disabled={isUpdating}
                >
                  {isUpdatingDr ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUpIcon className="mr-2 h-4 w-4" />
                  )}
                  Update DR
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (onUpdateTraffic && !isUpdating) {
                      onUpdateTraffic(domain);
                    }
                  }}
                  disabled={isUpdating}
                >
                  {isUpdatingTraffic ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="mr-2 h-4 w-4" />
                  )}
                  Update Traffic
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
      },
    ],
    [onUpdateDr, onUpdateTraffic, updatingDomain, updatingType]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      sorting,
      columnFilters: filters ?? [],
      columnVisibility: {
        ...columnVisibility,
        deal: false, // Hide deal column by default
      },
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
                placeholder="Search name, url, domain, or user..."
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
            {categoryOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn('category')}
                title="Category"
                options={categoryOptions}
              />
            )}
            {dealOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn('deal')}
                title="Deal"
                options={dealOptions}
              />
            )}
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
                    No results found.
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
