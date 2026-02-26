// Tanstack data table with dropdowns

import { ChevronLeft, ChevronRight } from "lucide-react";
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
import type { Exception } from "@/lib/api/types";

interface ExceptionResultsTableProps {
  table: TableType<Exception>;
  resultsCount: number;
  selectedExceptionId: number | null;
  statusFilter: "ALL" | "PENDING" | "CLOSED";
  priorityFilter: "ALL" | "HIGH" | "MEDIUM" | "LOW";
  onStatusFilterChange: (value: "ALL" | "PENDING" | "CLOSED") => void;
  onPriorityFilterChange: (value: "ALL" | "HIGH" | "MEDIUM" | "LOW") => void;
  onRowClick: (exception: Exception) => void;
}

export function ExceptionResultsTable({
  table,
  resultsCount,
  selectedExceptionId,
  statusFilter,
  priorityFilter,
  onStatusFilterChange,
  onPriorityFilterChange,
  onRowClick,
}: ExceptionResultsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-black/6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-black">Exception Results</span>
          <span className="text-xs font-mono bg-black/5 text-black/50 px-2.5 py-0.5 rounded-full">
            {resultsCount} {resultsCount !== 1 ? "exceptions" : "exception"}
          </span>
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
                    className="py-2 px-4"
                  >
                    {/* Status Column - Dropdown */}
                    {header.column.id === "status" && (
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => onStatusFilterChange(v as "PENDING" | "CLOSED" | "ALL")}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="PENDING">
                            Pending
                          </SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Priority Column - Dropdown */}
                    {header.column.id === "priority" && (
                      <Select
                        value={priorityFilter}
                        onValueChange={(v) => onPriorityFilterChange(v as "HIGH" | "MEDIUM" | "LOW" | "ALL")}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Other Columns - Text Input */}
                    {header.column.id !== "status" &&
                      header.column.id !== "priority" &&
                      header.column.getCanFilter() && (
                        <Input
                          placeholder="Filter..."
                          value={
                            (header.column.getFilterValue() as string) ??
                            ""
                          }
                          onChange={(event) =>
                            header.column.setFilterValue(
                              event.target.value
                            )
                          }
                          className="h-8 text-xs"
                        />
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
                      selectedExceptionId === row.original.exception_id
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
