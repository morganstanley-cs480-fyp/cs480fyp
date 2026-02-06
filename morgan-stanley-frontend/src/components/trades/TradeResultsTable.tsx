// Data table with sorting, filtering, column visibility, and pagination

import { ChevronDown, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  flexRender,
  type Table as TableType,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Trade } from "@/lib/mockData";
import { formatDateShort } from "@/lib/utils";

interface TradeResultsTableProps {
  table: TableType<Trade>;
  resultsCount: number;
  columnFiltersCount: number;
}

export function TradeResultsTable({
  table,
  resultsCount,
  columnFiltersCount,
}: TradeResultsTableProps) {
  const navigate = useNavigate();
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const optionMap = useMemo(() => {
    const rows = table.getPreFilteredRowModel().flatRows;
    const collect = (key: keyof Trade, formatter?: (value: Trade[keyof Trade]) => string) =>
      Array.from(
        new Set(
          rows.map((r) => {
            const value = r.original[key];
            return formatter ? formatter(value) : String(value);
          })
        )
      ).sort();
    return {
      trade_id: collect("trade_id"),
      account: collect("account"),
      asset_type: collect("asset_type"),
      booking_system: collect("booking_system"),
      affirmation_system: collect("affirmation_system"),
      clearing_house: collect("clearing_house"),
      create_time: collect("create_time", (value) => formatDateShort(String(value))),
      update_time: collect("update_time", (value) => formatDateShort(String(value))),
      status: collect("status"),
    } as Record<string, string[]>;
  }, [table]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Search Results</CardTitle>
          <p className="text-sm text-black/50 mt-1">
            Found {resultsCount} matching trades
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="size-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => {
                        event.preventDefault();
                      }}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {columnFiltersCount > 0 && (
          <div className="flex items-center justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => table.resetColumnFilters()}
              className="h-9"
            >
              Clear All Filters
              <X className="ml-2 size-4" />
            </Button>
          </div>
        )}

        {/* Search bar filters */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {/* Column Headers Row */}
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
              {/* Filter Row */}
              <TableRow>
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <TableHead key={`filter-${header.id}`} className="py-2 overflow-visible">
                    {header.column.getCanFilter() && (
                      <div className="relative">
                        <Input
                          placeholder="Filter..."
                          value={
                            (header.column.getFilterValue() as string) ?? ""
                          }
                          onChange={(event) =>
                            header.column.setFilterValue(event.target.value)
                          }
                          onFocus={() =>
                            optionMap[header.id]?.length
                              ? setOpenFilter(header.id)
                              : setOpenFilter(null)
                          }
                          onBlur={() => {
                            // Defer to allow option click via mousedown
                            setTimeout(() => setOpenFilter(null), 120);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setOpenFilter(null);
                          }}
                          className="h-8 text-xs pr-16"
                        />
                        <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                          {(header.column.getFilterValue() as string) && (
                            <button
                              type="button"
                              className="flex items-center px-1 text-black/50 hover:text-red-600"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                header.column.setFilterValue("");
                                setOpenFilter(null);
                              }}
                              title="Clear filter"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                          {optionMap[header.id]?.length ? (
                            <button
                              type="button"
                              className="flex items-center px-1 text-black/50 hover:text-black/75"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setOpenFilter((prev) =>
                                  prev === header.id ? null : header.id
                                );
                              }}
                            >
                              <ChevronDown className="size-4" />
                            </button>
                          ) : null}
                        </div>
                        {openFilter === header.id && optionMap[header.id]?.length ? (
                          <div className="absolute left-0 right-auto top-full z-30 mt-1 max-h-64 min-w-[12rem] overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white shadow-md flex flex-col">
                            {optionMap[header.id].map((option) => (
                              <button
                                key={option}
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  header.column.setFilterValue(option);
                                  setOpenFilter(null);
                                }}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="border-t-4 border-slate-100">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() =>
                      navigate({
                        to: "/trades/$tradeId",
                        params: { tradeId: row.original.trade_id.toString() },
                      })
                    }
                    className="cursor-pointer hover:bg-[#002B51]/5"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4">
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
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-black/50">
            {(() => {
              const total = table.getFilteredRowModel().rows.length;
              const { pageIndex, pageSize } = table.getState().pagination;
              const start = total === 0 ? 0 : pageIndex * pageSize;
              const end = total === 0 ? 0 : Math.min(start + pageSize, total);
              return (
                <>
                  Showing results {start}-{end} out of {total}
                </>
              );
            })()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
