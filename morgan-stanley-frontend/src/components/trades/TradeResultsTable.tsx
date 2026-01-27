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
    const collect = (key: keyof Trade) =>
      Array.from(new Set(rows.map((r) => String(r.original[key])))).sort();
    return {
      trade_id: collect("trade_id"),
      account: collect("account"),
      asset_type: collect("asset_type"),
      booking_system: collect("booking_system"),
      affirmation_system: collect("affirmation_system"),
      clearing_house: collect("clearing_house"),
      create_time: collect("create_time"),
      update_time: collect("update_time"),
      status: collect("status"),
    } as Record<string, string[]>;
  }, [table]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Search Results</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
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
                          className="h-8 text-xs pr-7"
                        />
                        {optionMap[header.id]?.length ? (
                          <button
                            type="button"
                            className="absolute inset-y-0 right-1 flex items-center px-1 text-slate-500 hover:text-slate-700"
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
                        params: { tradeId: row.original.trade_id },
                      })
                    }
                    className="cursor-pointer hover:bg-blue-50"
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
          <div className="text-sm text-slate-500">
            Showing {table.getRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} result(s)
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
