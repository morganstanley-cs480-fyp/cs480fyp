import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type {
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { mockExceptions, type Exception } from "@/lib/mockData";

// Component imports
import { StatsOverview } from "@/components/exceptions/StatsOverview";
import { ExceptionFilters } from "@/components/exceptions/ExceptionFilters";
import { ExceptionResultsTable } from "@/components/exceptions/ExceptionResultsTable";
import { ExceptionDetailPanel } from "@/components/exceptions/ExceptionDetailPanel";
import { useExceptionColumns } from "@/components/exceptions/useExceptionColumns";
import { EmptyState } from "@/components/exceptions/EmptyState";
import { requireAuth } from "@/lib/utils";

export const Route = createFileRoute("/exceptions/")({
  beforeLoad: requireAuth,
  component: ExceptionsPage,
});

function ExceptionsPage() {
  const [exceptions] = useState<Exception[]>(mockExceptions);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Exception[]>(mockExceptions);
  const [selectedException, setSelectedException] = useState<Exception | null>(
    null,
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "CLOSED"
  >("ALL");
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | "HIGH" | "MEDIUM" | "LOW"
  >("ALL");

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

  const columns = useExceptionColumns({
    getPriorityColor,
    getPriorityIcon,
    getStatusBadgeVariant,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
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

  const handleSearch = useCallback(() => {
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
            exc.exception_id.toString().includes(query) ||
            exc.trade_id.toString().includes(query) ||
            exc.msg.toLowerCase().includes(query) ||
            exc.comment.toLowerCase().includes(query),
        );
      }

      setResults(filtered);
      setSearching(false);
    }, 500);
  }, [exceptions, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    handleSearch();
  }, [statusFilter, priorityFilter, handleSearch]);

  const stats = {
    total: exceptions.filter((e) => e.status === "PENDING").length,
    high: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "HIGH",
    ).length,
    medium: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "MEDIUM",
    ).length,
    low: exceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "LOW",
    ).length,
    closed: exceptions.filter((e) => e.status === "CLOSED").length,
  };

  const handleClearFilters = () => {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSearchQuery("");
    setResults(mockExceptions);
    setColumnFilters([]);
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      <StatsOverview stats={stats} />

      {results.length > 0 && (
        <ExceptionFilters
          table={table}
          onClearFilters={handleClearFilters}
        />
      )}

      {results.length > 0 && (
        <div className={selectedException ? "grid grid-cols-3 gap-6" : ""}>
          <div className={selectedException ? "col-span-2" : ""}>
            <ExceptionResultsTable
              table={table}
              resultsCount={results.length}
              selectedExceptionId={selectedException?.exception_id || null}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onStatusFilterChange={setStatusFilter}
              onPriorityFilterChange={setPriorityFilter}
              onRowClick={setSelectedException}
            />
          </div>

          {selectedException && (
            <div>
              <ExceptionDetailPanel
                exception={selectedException}
                onClose={() => setSelectedException(null)}
                getPriorityColor={getPriorityColor}
              />
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !searching && <EmptyState />}
    </div>
  );
}
