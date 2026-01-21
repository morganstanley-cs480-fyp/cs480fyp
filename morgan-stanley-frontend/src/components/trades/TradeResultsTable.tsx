// Data table with sorting, filtering, column visibility, and pagination

import { ChevronDown, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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
                  <TableHead key={`filter-${header.id}`} className="py-2">
                    {header.column.getCanFilter() && (
                      <Input
                        placeholder="Filter..."
                        value={
                          (header.column.getFilterValue() as string) ?? ""
                        }
                        onChange={(event) =>
                          header.column.setFilterValue(event.target.value)
                        }
                        className="h-8 text-xs"
                      />
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
