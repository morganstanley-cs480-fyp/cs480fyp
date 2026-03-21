// ...existing code...
import { ChevronLeft, ChevronRight, Download, RefreshCw, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import {
  flexRender,
  type Table as TableType,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Exception } from "@/lib/api/types";

interface ExceptionFilterOptions {
  ids: string[];
  tradeIds: string[];
  messages: string[];
  comments: string[];
  createTimes: string[];
  updateTimes: string[];
}

interface ExceptionResultsTableProps {
  table: TableType<Exception>;
  resultsCount: number;
  selectedExceptionId: number | null;
  statusFilter: "ALL" | "PENDING" | "CLOSED";
  priorityFilter: "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  onStatusFilterChange: (value: "ALL" | "PENDING" | "CLOSED") => void;
  onPriorityFilterChange: (value: "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW") => void;
  onRowClick: (exception: Exception) => void;
  onRefresh?: () => void; // Add this prop
  filterOptions?: ExceptionFilterOptions
}

export function ExceptionResultsTable({
  table,
  resultsCount,
  selectedExceptionId,
  statusFilter: _statusFilter,
  priorityFilter: _priorityFilter,
  onStatusFilterChange: _onStatusFilterChange,
  onPriorityFilterChange: _onPriorityFilterChange,
  onRowClick,
  onRefresh,
  filterOptions
}: ExceptionResultsTableProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Handle refresh functionality
  const handleRefresh = () => {
    // Clear all filters first
    table.resetColumnFilters();
    table.resetSorting();
    table.resetPageIndex();
    
    // Then trigger data refresh if callback provided
    onRefresh?.();
  };

  // Handle clear filters functionality
  const handleClearFilters = () => {
    // Clear all TanStack table filters and state
    table.resetColumnFilters();
    table.resetSorting();
    table.resetPageIndex();
    table.resetColumnVisibility();
    
    // Close any open dropdown filters
    setOpenFilter(null);
  };

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
    link.setAttribute('download', `exceptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };  

  // ✅ Copy exact implementation from TradeResultsTable
  const optionMap = useMemo(() => {
    // Prefer API-sourced options (complete set of all possible values).
    // Fall back to deriving from loaded rows if filterOptions hasn't loaded yet.
    if (filterOptions) {
      return {
        id: filterOptions.ids,
        trade_id: filterOptions.tradeIds,
        msg: filterOptions.messages,
        comment: filterOptions.comments,
        create_time: filterOptions.createTimes,
        update_time: filterOptions.updateTimes,
      } as Record<string, string[]>;
    }
    // Fallback: derive from current rows
    const rows = table.getPreFilteredRowModel().flatRows;
    const collect = (key: keyof Exception) =>
      Array.from(new Set(rows.map((r) => String(r.original[key])))).sort();
    return {
      id: collect("id"),
      trade_id: collect("trade_id"),
      msg: collect("msg"),
      comment: collect("comment"),
      create_time: collect("create_time"),
      update_time: collect("update_time"),
    } as Record<string, string[]>;
  }, [filterOptions, table]); // ✅ Copy exact dependencies from TradeResultsTable

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-black/6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-black">Exception Results</span>
          <span className="text-xs font-mono bg-black/5 text-black/50 px-2.5 py-0.5 rounded-full">
            {resultsCount} {resultsCount !== 1 ? "exceptions" : "exception"}
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
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={handleRefresh}
            title="Refresh data and clear filters"
          >
            <RefreshCw className="size-3.5 text-black/60" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
          >
            Clear All Filters
          </Button> 
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
          >
                <ChevronDown className="size-4" />
                Columns Visibility
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
                      {column.id === 'id' ? 'Exception_id' : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>                 
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {/* Column Headers Row */}
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-black/[0.02] border-b border-black/6 hover:bg-black/[0.02]">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold text-black/50 uppercase tracking-wider h-10 px-4">
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
              <TableRow className="border-b border-black/6 hover:bg-transparent">
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <TableHead
                    key={`filter-${header.id}`}
                    className="py-2 px-4 relative"
                  >
                    {/* Status Column - Dropdown */}
                    {header.column.id === "status" && (
                      <Select
                        value={(header.column.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(value) => {
                          if (value === "ALL") {
                            header.column.setFilterValue(undefined);
                          } else {
                            header.column.setFilterValue(value);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Priority Column - Dropdown */}
                    {header.column.id === "priority" && (
                      <Select
                        value={(header.column.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(value) => {
                          if (value === "ALL") {
                            header.column.setFilterValue(undefined);
                          } else {
                            header.column.setFilterValue(value);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>  
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Other Columns - Searchable Dropdown Input */}
                    {header.column.id !== "status" &&
                      header.column.id !== "priority" &&
                      header.column.getCanFilter() && (
                        <div className="relative">
                          <Input
                            placeholder={
                              header.column.id === "id" ? "Filter by Exception ID..." :
                              header.column.id === "trade_id" ? "Filter by Trade ID..." :
                              header.column.id === "msg" ? "Filter by Message..." :
                              header.column.id === "comment" ? "Filter by Comment..." :
                              "Filter..."
                            }
                            value={
                              (header.column.getFilterValue() as string) ?? ""
                            }
                            onChange={(event) => {
                              header.column.setFilterValue(event.target.value);
                              if (optionMap[header.column.id as keyof typeof optionMap]?.length) {
                                setOpenFilter(header.column.id);
                              }
                            }}
                            onClick={() => {
                              if (optionMap[header.column.id as keyof typeof optionMap]?.length) {
                                setOpenFilter(openFilter === header.column.id ? null : header.column.id);
                              }
                            }}
                            onBlur={() => {
                              // Delay to allow option selection
                              setTimeout(() => setOpenFilter(null), 200);
                            }}
                            className="h-8 text-xs"
                          />
                          
                          {/* Dropdown Options */}
                          {openFilter === header.column.id && optionMap[header.column.id as keyof typeof optionMap]?.length ? (
                            <div className="absolute left-0 right-auto top-full z-30 mt-1 max-h-64 min-w-48 overflow-y-auto rounded-md border bg-white shadow-md">
                              {optionMap[header.column.id as keyof typeof optionMap]
                                .filter((option) => {
                                  const typed = ((header.column.getFilterValue() as string) ?? "").toLowerCase();
                                  return !typed || option.toLowerCase().includes(typed);
                                })
                                .slice(0, 10) // Limit to 10 options for performance
                                .map((option) => (
                                  <button
                                    key={option}
                                    className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors"
                                    onMouseDown={() => {
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
            <TableBody className="border-t-4 border-black/6">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`cursor-pointer border-b border-black/4 transition-colors ${
                      selectedExceptionId === row.original.id
                        ? "bg-[#002B51]/5"
                        : "hover:bg-[#002B51]/[0.03]"
                    }`}
                    onClick={() => onRowClick(row.original)}
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
            Showing{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              resultsCount
            )}{" "}
            of {resultsCount} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 px-3 text-xs"
            >
              <ChevronLeft className="size-4 mr-1" />
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
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}