import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
import { mockExceptions, type Exception } from "@/lib/mockData";

export const Route = createFileRoute("/exceptions/")({
  component: ExceptionsPage,
});

function ExceptionsPage() {
  const navigate = useNavigate();
  const [exceptions, setExceptions] = useState<Exception[]>(mockExceptions);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Exception[]>(mockExceptions);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CLOSED">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  const getPriorityColor = (priority: string) => {
    if (priority === "HIGH") return "destructive";
    if (priority === "MEDIUM") return "default";
    return "secondary";
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "HIGH")
      return <AlertTriangle className="size-4 text-red-600" />;
    if (priority === "MEDIUM")
      return <AlertCircle className="size-4 text-orange-600" />;
    return <Clock className="size-4 text-yellow-600" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === "CLOSED" ? "default" : "secondary";
  };

  const columns: ColumnDef<Exception>[] = [
    {
      accessorKey: "exception_id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Exception ID
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">{row.getValue("exception_id")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "trade_id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Trade ID
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">{row.getValue("trade_id")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "msg",
      header: "Exception Message / Type",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("msg")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge className="mr-2" variant={getStatusBadgeVariant(status)}>{status}</Badge>;
      },
      enableColumnFilter: false, // Disable text filter for status
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return (
          <div className="flex items-center gap-2">
            {getPriorityIcon(priority)}
            <Badge variant={getPriorityColor(priority)}>{priority}</Badge>
          </div>
        );
      },
      enableColumnFilter: false, // Disable text filter for priority
    },
    {
      accessorKey: "comment",
      header: "Comments",
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">{row.getValue("comment")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "create_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Create Time
            <ArrowUpDown className="size-4 ml-2" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">{row.getValue("create_time")}</div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "update_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Update Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">{row.getValue("update_time")}</div>
      ),
      enableColumnFilter: true,
    },
  ];

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleSearch = () => {
    setSearching(true);

    setTimeout(() => {
      let filtered = [...exceptions];

      if (statusFilter !== "ALL") {
        filtered = filtered.filter((exc) => exc.status === statusFilter);
      }

      if (priorityFilter !== "ALL") {
        filtered = filtered.filter((exc) => exc.priority === priorityFilter);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (exc) =>
            exc.exception_id.toLowerCase().includes(query) ||
            exc.trade_id.toLowerCase().includes(query) ||
            exc.msg.toLowerCase().includes(query) ||
            exc.comment.toLowerCase().includes(query)
        );
      }

      setResults(filtered);
      setSearching(false);
    }, 500);
  };

  useEffect(() => {
    handleSearch();
  }, [statusFilter, priorityFilter]);

  const stats = {
    total: exceptions.filter((e) => e.status === "PENDING").length,
    high: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "HIGH"
    ).length,
    medium: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "MEDIUM"
    ).length,
    low: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "LOW"
    ).length,
    closed: exceptions.filter((e) => e.status === "CLOSED").length,
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Pending Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{stats.high}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Medium Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-orange-600">{stats.medium}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Low Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{stats.low}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Advanced Filters</CardTitle>
                <CardDescription>Refine your exception search</CardDescription>
              </div>
              
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                  setSearchQuery("");
                  setResults(mockExceptions);
                  setColumnFilters([]);
                }}
              >
                Clear All Filters
              </Button>

              <div className="">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Filter className="mr-2" />
                      Column Visibility
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className={selectedException ? "grid grid-cols-3 gap-6" : ""}>
          <div className={selectedException ? "col-span-2" : ""}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exception Results</CardTitle>
                    <CardDescription>
                      Found {results.length} exception
                      {results.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      {/* Column Headers Row */}
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} className="px-4">
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
                          <TableHead
                            key={`filter-${header.id}`}
                            className="py-2 px-4"
                          >
                            {/* Status Column - Dropdown */}
                            {header.column.id === "status" && (
                              <Select
                                value={statusFilter}
                                onValueChange={(v: any) => setStatusFilter(v)}
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
                                value={priorityFilter}
                                onValueChange={(v: any) => setPriorityFilter(v)}
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
                    <TableBody className="border-t-4 border-slate-100">
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className={`cursor-pointer ${
                              selectedException?.exception_id === row.original.exception_id
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onClick={() => setSelectedException(row.original)}
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

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-600">
                    Showing{" "}
                    {table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1}{" "}
                    to{" "}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      results.length
                    )}{" "}
                    of {results.length} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exception Details Panel */}
          {selectedException && (
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Exception Details</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedException(null)}
                      className="h-8 w-8 p-0"
                    >
                      <XCircle className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception ID</p>
                      <p className="text-slate-900">{selectedException.exception_id}</p>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Trade ID</p>
                      <p className="text-slate-900">{selectedException.trade_id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Transaction ID</p>
                      <p className="text-slate-900">{selectedException.trans_id}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception Message</p>
                      <p className="text-slate-900">{selectedException.msg}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Priority</p>
                      <Badge variant={getPriorityColor(selectedException.priority)}>
                        {selectedException.priority}
                      </Badge>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Comments</p>
                      <p className="text-sm text-slate-900">{selectedException.comment}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception Time</p>
                      <p className="text-sm text-slate-900">{selectedException.create_time}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Last Update</p>
                      <p className="text-sm text-slate-900">{selectedException.update_time}</p>
                    </div>

                    <Separator />

                    {selectedException.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full mb-2"
                          onClick={() =>
                            console.log("View transaction:", selectedException.trans_id)
                          }
                        >
                          <Eye className="size-4 mr-2" />
                          View Associated Transaction
                        </Button>
                        <Button
                          className="w-full"
                          onClick={() =>
                            console.log("Resolve exception:", selectedException.exception_id)
                          }
                        >
                          <Check className="size-4 mr-2" />
                          Resolve Exception
                        </Button>
                      </>
                    )}

                    {selectedException.status === "CLOSED" && (
                      <Badge className="w-full justify-center py-2" variant="default">
                        <CheckCircle className="size-4 mr-2" />
                        Closed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !searching && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <Search className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">No exceptions found</p>
              <p className="text-sm">Adjust your filters to see more results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}