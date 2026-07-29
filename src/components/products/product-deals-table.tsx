'use client';

import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ProductDealDetailViewer } from '@/components/products/product-deal-detail-viewer';
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
import type { ProductDeal } from '@/hooks/use-product-deals';
import {
  type ColumnDef,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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

interface ProductDealsTableProps {
  data: ProductDeal[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  loading?: boolean;
  productId: string;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDealUpdated: () => void;
}

export function ProductDealsTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  loading,
  productId,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onDealUpdated,
}: ProductDealsTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns: ColumnDef<ProductDeal>[] = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <div className="pl-4 w-[200px] min-w-[200px]">Name</div>,
        cell: ({ row }) => {
          const name = row.getValue('name') as string;
          const type = row.original.type;
          const eventStatus = row.original.status;
          const isActive = eventStatus === 'active';

          return (
            <div className="flex items-center gap-2 pl-4 w-[200px] min-w-[200px]">
              <ProductDealDetailViewer
                event={row.original}
                productId={productId}
                onSuccess={onDealUpdated}
                trigger={
                  <button
                    type="button"
                    className="font-medium truncate hover:underline hover:decoration-2 hover:underline-offset-4 hover:text-primary cursor-pointer text-left"
                    title={`${name} (${type})`}
                  >
                    {name}
                  </button>
                }
              />
            </div>
          );
        },
        enableHiding: false,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => <div>Event Status</div>,
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const isActive = status === 'active';

          return (
            <Badge
              variant="outline"
              className={isActive ? 'text-green-600' : 'text-muted-foreground'}
            >
              {isActive ? (
                <CheckCircleIcon className="mr-1 h-3 w-3" />
              ) : (
                <XIcon className="mr-1 h-3 w-3" />
              )}
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: 'participation',
        header: () => <div>Participation</div>,
        cell: ({ row }) => {
          const hasJoined = !!row.original.productDealId;

          return (
            <ProductDealDetailViewer
              event={row.original}
              productId={productId}
              onSuccess={onDealUpdated}
              trigger={
                <button type="button" className="cursor-pointer">
                  <Badge
                    variant="outline"
                    className={
                      hasJoined
                        ? 'text-green-600 hover:bg-accent'
                        : 'text-muted-foreground hover:bg-accent'
                    }
                  >
                    {hasJoined ? (
                      <CheckCircleIcon className="mr-1 h-3 w-3" />
                    ) : (
                      <CircleDashedIcon className="mr-1 h-3 w-3" />
                    )}
                    {hasJoined ? 'Joined' : 'Not Joined'}
                  </Badge>
                </button>
              }
            />
          );
        },
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: () => <div>Deal Price</div>,
        cell: ({ row }) => {
          const price = row.original.price;
          if (!price) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="font-medium">${(price / 100).toFixed(2)}</span>
          );
        },
      },
      {
        id: 'originalPrice',
        accessorKey: 'originalPrice',
        header: () => <div>Original Price</div>,
        cell: ({ row }) => {
          const originalPrice = row.original.originalPrice;
          if (!originalPrice)
            return <span className="text-muted-foreground">-</span>;
          return <span>${(originalPrice / 100).toFixed(2)}</span>;
        },
      },
      {
        id: 'discount',
        accessorKey: 'discount',
        header: () => <div>Discount</div>,
        cell: ({ row }) => {
          const discount = row.original.discount;
          if (!discount)
            return <span className="text-muted-foreground">-</span>;
          return <span className="truncate">{discount}</span>;
        },
      },
      {
        id: 'couponCode',
        accessorKey: 'couponCode',
        header: () => <div>Coupon Code</div>,
        cell: ({ row }) => {
          const couponCode = row.original.couponCode;
          if (!couponCode)
            return <span className="text-muted-foreground">-</span>;

          return (
            <Badge
              variant="outline"
              className="font-mono text-xs cursor-pointer hover:bg-accent"
              onClick={() => {
                navigator.clipboard.writeText(couponCode);
                toast.success('Coupon code copied!');
              }}
            >
              {couponCode}
            </Badge>
          );
        },
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: () => <div>Start Date</div>,
        cell: ({ row }) => {
          const startDate = row.original.startDate;
          if (!startDate)
            return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex items-center gap-1 text-sm">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(startDate), 'MMM dd, yyyy')}</span>
            </div>
          );
        },
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: () => <div>End Date</div>,
        cell: ({ row }) => {
          const endDate = row.original.endDate;
          if (!endDate) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="flex items-center gap-1 text-sm">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(endDate), 'MMM dd, yyyy')}</span>
            </div>
          );
        },
      },
    ],
    [productId, onDealUpdated]
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
    enableSorting: false,
  });

  return (
    <div className="w-full space-y-4">
      <div>
        <DataTableAdvancedToolbar table={table}>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Search event name or type..."
                value={search}
                onChange={(event) => {
                  onSearch(event.target.value);
                }}
                className="h-8 w-[260px] pr-8"
              />
              {search && search.length > 0 ? (
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
                    No deal events found.
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
