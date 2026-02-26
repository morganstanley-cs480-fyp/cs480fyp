// Data table with sorting, filtering, column visibility, and pagination

import { ChevronDown, X, Download, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  flexRender,
  type Table as TableType,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import type { Trade } from "@/lib/api/types";

interface FilterOptions {
  accounts: string[];
  assetTypes: string[];
  bookingSystems: string[];
  affirmationSystems: string[];
  clearingHouses: string[];
  statuses: string[];
}

interface TradeResultsTableProps {
  table: TableType<Trade>;
  resultsCount: number;
  columnFiltersCount: number;
  filterOptions?: FilterOptions;
}

export function TradeResultsTable({
  table,
  resultsCount,
  columnFiltersCount,
  filterOptions,
}: TradeResultsTableProps) {
  const navigate = useNavigate();
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const isDateFilterColumn = (columnId: string) =>
    columnId === "create_time" || columnId === "update_time";

  const handleDownloadCSV = () => {
    const rows = table.getFilteredRowModel().rows;
    if (rows.length === 0) return;

    // Get visible columns
    const visibleColumns = table.getVisibleLeafColumns();
    
    // Create CSV header
    const headers = visibleColumns.map(col => col.id).join(',');
    
    // Create CSV rows
    const csvRows = rows.map(row => {
      return visibleColumns.map(col => {
        const value = row.getValue(col.id);
        // Escape commas and quotes in values
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    // Combine header and rows
    const csvContent = [headers, ...csvRows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const optionMap = useMemo(() => {
    // Prefer API-sourced options (complete set of all possible values).
    // Fall back to deriving from loaded rows if filterOptions hasn't loaded yet.
    if (filterOptions) {
      return {
        trade_id: [],
        account: filterOptions.accounts,
        asset_type: filterOptions.assetTypes,
        booking_system: filterOptions.bookingSystems,
        affirmation_system: filterOptions.affirmationSystems,
        clearing_house: filterOptions.clearingHouses,
        create_time: [],
        update_time: [],
        status: filterOptions.statuses,
      } as Record<string, string[]>;
    }
    // Fallback: derive from current rows
    const rows = table.getPreFilteredRowModel().flatRows;
    const collect = (key: keyof Trade) =>
      Array.from(new Set(rows.map((r) => String(r.original[key])))).sort();
    return {
      trade_id: [],
      account: collect("account"),
      asset_type: collect("asset_type"),
      booking_system: collect("booking_system"),
      affirmation_system: collect("affirmation_system"),
      clearing_house: collect("clearing_house"),
      create_time: [],
      update_time: [],
      status: collect("status"),
    } as Record<string, string[]>;
  }, [filterOptions, table]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-black/6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-black">Search Results</span>
          <span className="text-xs font-mono bg-black/5 text-black/50 px-2.5 py-0.5 rounded-full">
            {resultsCount} trades
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={handleDownloadCSV}
            title="Download as CSV"
          >
            <Download className="size-3.5 text-black/60" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <RefreshCw className="size-3.5 text-black/60" />
          </Button>
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
        <div className="rounded-md border overflow-x-auto">
          <Table style={{ tableLayout: "fixed", width: "100%", minWidth: 960 }}>
            <colgroup>
              {table.getVisibleLeafColumns().map((col) => (
                <col key={col.id} style={{ width: col.getSize() }} />
              ))}
            </colgroup>
            <TableHeader>
              {/* Column Headers Row */}
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-black/[0.02] border-b border-black/6 hover:bg-black/[0.02]">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-sm font-semibold text-black uppercase tracking-wider h-10 px-2 overflow-hidden text-center">
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
                  <TableHead key={`filter-${header.id}`} className="py-2 px-2 overflow-visible">
                    {header.column.getCanFilter() && !isDateFilterColumn(header.id) && (
                      <div className="relative">
                        <Input
                          placeholder=""
                          value={
                            (header.column.getFilterValue() as string) ?? ""
                          }
                          onChange={(event) => {
                            header.column.setFilterValue(event.target.value);
                            // Keep dropdown open while typing so user can pick a match
                            if (optionMap[header.id]?.length) {
                              setOpenFilter(header.id);
                            }
                          }}
                          // Open on click so it works whether or not the input is already focused
                          onClick={() => {
                            if (optionMap[header.id]?.length) {
                              setOpenFilter(header.id);
                            }
                          }}
                          onFocus={() => {
                            if (optionMap[header.id]?.length) {
                              setOpenFilter(header.id);
                            }
                          }}
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
                            <Button
                              variant="ghost"
                              className="flex items-center size-6"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setOpenFilter((prev) =>
                                  prev === header.id ? null : header.id
                                );
                              }}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                        {openFilter === header.id && optionMap[header.id]?.length ? (
                          <div className="absolute left-0 right-auto top-full z-30 mt-1 max-h-64 min-w-48 overflow-y-auto overflow-x-hidden rounded-md border border-black/10 bg-white shadow-md flex flex-col">
                            {optionMap[header.id]
                              .filter((option) => {
                                const typed = ((header.column.getFilterValue() as string) ?? "").toLowerCase();
                                return !typed || option.toLowerCase().includes(typed);
                              })
                              .map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-black/[0.04]"
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
                    {header.column.getCanFilter() && isDateFilterColumn(header.id) && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-black w-6 shrink-0">From</span>
                          <Input
                            type="date"
                            value={
                              (header.column.getFilterValue() as { from?: string; to?: string } | undefined)?.from ?? ""
                            }
                            onChange={(event) => {
                              const current =
                                (header.column.getFilterValue() as { from?: string; to?: string } | undefined) ?? {};
                              const next = { ...current, from: event.target.value };
                              if (!next.from && !next.to) {
                                header.column.setFilterValue(undefined);
                                return;
                              }
                              header.column.setFilterValue(next);
                            }}
                            className="h-7 text-xs min-w-0 flex-1 px-1"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-black w-6 shrink-0">To</span>
                          <Input
                            type="date"
                            value={
                              (header.column.getFilterValue() as { from?: string; to?: string } | undefined)?.to ?? ""
                            }
                            onChange={(event) => {
                              const current =
                                (header.column.getFilterValue() as { from?: string; to?: string } | undefined) ?? {};
                              const next = { ...current, to: event.target.value };
                              if (!next.from && !next.to) {
                                header.column.setFilterValue(undefined);
                                return;
                              }
                              header.column.setFilterValue(next);
                            }}
                            className="h-7 text-xs min-w-0 flex-1 px-1"
                          />
                        </div>
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="border-t-4 border-black/6">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-black/[0.02] border-b border-black/4 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate({
                        to: "/trades/$tradeId",
                        params: { tradeId: row.original.id.toString() },
                      });
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-2 py-2">
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
                    className="h-32 text-center text-black/40 text-sm"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-black/6">
          <div className="text-xs text-black/40">
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
              className="h-7 px-3 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
