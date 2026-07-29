'use client';

import { DealsCreateDrawer } from '@/components/admin/deals-create-drawer';
import { DealsDetailViewer } from '@/components/admin/deals-detail-viewer';
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
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
import type { DealEvent } from '@/hooks/use-deal-events';
import { LocaleLink } from '@/i18n/navigation';
import { getBaseUrl } from '@/lib/urls/urls';
import {
  type ColumnDef,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { CalendarIcon, CheckIcon, PackageIcon, XIcon } from 'lucide-react';
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

interface DealsTableProps {
  data: DealEvent[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  loading?: boolean;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DealsTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  loading,
  onSearch,
  onPageChange,
  onPageSizeChange,
}: DealsTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns: ColumnDef<DealEvent>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <div className="pl-4 w-[200px] min-w-[200px]">Name</div>,
        cell: ({ row }) => {
          return (
            <div className="pl-4 w-[200px] min-w-[200px]">
              <DealsDetailViewer dealEvent={row.original} />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'url',
        accessorKey: 'type',
        header: () => <div>URL</div>,
        cell: ({ row }) => {
          const dealType = row.getValue('type') as string;
          const url = `${getBaseUrl()}/deals/${dealType}`;
          const path = `/deals/${dealType}`;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {path}
            </a>
          );
        },
        enableSorting: false,
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: () => <div>Type</div>,
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 hover:bg-accent">
            {row.getValue('type')}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => <div>Status</div>,
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const isActive = status === 'active';
          return (
            <DealsDetailViewer
              dealEvent={row.original}
              trigger={
                <Badge
                  variant="outline"
                  className={`px-1.5 hover:bg-accent cursor-pointer ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {isActive ? (
                    <CheckIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <XIcon className="mr-1 h-3 w-3" />
                  )}
                  {status}
                </Badge>
              }
            />
          );
        },
        enableSorting: false,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: () => <div className="w-[200px]">Description</div>,
        cell: ({ row }) => {
          const description = row.getValue('description') as string | null;
          if (!description)
            return <span className="text-muted-foreground">-</span>;
          return (
            <div className="w-[200px] truncate" title={description}>
              {description}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: () => <div className="flex items-center gap-1">Start Date</div>,
        cell: ({ row }) => {
          const startDate = row.getValue('startDate') as Date | null;
          if (!startDate)
            return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(startDate), 'MMM dd, yyyy')}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: () => <div className="flex items-center gap-1">End Date</div>,
        cell: ({ row }) => {
          const endDate = row.getValue('endDate') as Date | null;
          if (!endDate) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(endDate), 'MMM dd, yyyy')}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'productCount',
        accessorKey: 'productCount',
        header: () => <div className="flex items-center gap-1">Products</div>,
        cell: ({ row }) => {
          const count = row.getValue('productCount') as number;
          const dealType = row.original.type;
          const productsUrl = `/admin/products?deal=${encodeURIComponent(dealType)}`;

          return (
            <LocaleLink href={productsUrl}>
              <Badge
                variant="outline"
                className="px-2 hover:bg-accent cursor-pointer"
              >
                <PackageIcon className="h-3 w-3 text-muted-foreground" />
                {count}
              </Badge>
            </LocaleLink>
          );
        },
        enableSorting: false,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: () => <div>Created</div>,
        cell: ({ row }) => {
          const createdAt = row.getValue('createdAt') as Date;
          return (
            <div className="text-muted-foreground">
              {format(new Date(createdAt), 'MMM dd, yyyy')}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      columnVisibility,
      pagination: { pageIndex, pageSize },
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
  });

  return (
    <div className="w-full space-y-4">
      <div className="">
        <DataTableAdvancedToolbar table={table}>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Search name, type, or description..."
                value={search}
                onChange={(event) => {
                  onSearch(event.target.value);
                }}
                className="h-8 w-[300px] pr-8"
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
            <div className="ml-auto">
              <DealsCreateDrawer />
            </div>
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
