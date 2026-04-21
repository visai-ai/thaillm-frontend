"use client";

import { useState, Dispatch, SetStateAction } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableProps<TData, TValue> {
  className?: string;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  sortInitialState?: SortingState;
  onSortingChange?: Dispatch<SetStateAction<SortingState>>;
  pagination?: {
    pageIndex: number;
    pageSize: number;
  };
  setPagination?: Dispatch<
    SetStateAction<{
      pageIndex: number;
      pageSize: number;
    }>
  >;
  totalPage?: number;
  disablePagination?: boolean;
  headClassName?: string;
  columnClassName?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  className,
  columns,
  data,
  sortInitialState,
  onSortingChange,
  pagination,
  setPagination,
  disablePagination,
  totalPage,
  headClassName,
  columnClassName,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    sortInitialState || [],
  );

  // Use external sorting control if provided, otherwise use internal state
  const sorting = onSortingChange ? sortInitialState || [] : internalSorting;
  const setSorting = onSortingChange || setInternalSorting;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(disablePagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),

    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    // Prevent page index from resetting to 0 when data/sorting changes (for server-side pagination)
    autoResetPageIndex: false,
    // Enable manual pagination when controlled via props
    ...(pagination && !disablePagination ? { manualPagination: true } : {}),
    ...(setPagination &&
      !disablePagination && { onPaginationChange: setPagination }),
    ...(totalPage && !disablePagination && { pageCount: totalPage }),
    state: {
      sorting,
      ...(pagination && !disablePagination && { pagination }),
    },
  });

  const isCustomPagination = !!pagination;
  const rowModel = isCustomPagination
    ? table.getPrePaginationRowModel()
    : table.getRowModel();

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 overflow-hidden flex flex-col w-full",
        className,
      )}
    >
      <div className="grow overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      style={{
                        // minWidth: header.column.columnDef.size,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                      key={header.id}
                      data-access-key={header.column.id}
                      className={cn(
                        headClassName,
                        // @ts-expect-error: meta may have className, but it's not typed in ColumnMeta
                        header.column.columnDef.meta?.["className"] ?? "",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-white">
            {rowModel.rows?.length ? (
              rowModel.rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-gray-50",
                  )}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      style={{
                        minWidth: cell.column.columnDef.size,
                        maxWidth: cell.column.columnDef.maxSize,
                      }}
                      key={cell.id}
                      data-index={index}
                      data-access-key={cell.column.id}
                      className={columnClassName}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!disablePagination && (
        <>
          {/* pagination */}
          <div className="grid grid-cols-3 items-center border-t border-gray-200 space-x-2 py-3 md:px-6 px-4 bg-white">
            <Button
              size={"sm"}
              variant={"secondary"}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="mr-auto"
            >
              ก่อนหน้า
            </Button>
            <span className="text-center text-gray-700 text-sm font-medium">
              หน้า {table.getState().pagination.pageIndex + 1} จาก{" "}
              {table.getPageCount() || 1}
            </span>
            <Button
              size={"sm"}
              variant={"secondary"}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ml-auto"
            >
              ถัดไป
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
