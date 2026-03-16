import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  PaginationState,
} from "@tanstack/react-table";
import type { Exception } from "@/lib/api/types";

// Component imports
import { StatsOverview } from "@/components/exceptions/StatsOverview";
import { ExceptionResultsTable } from "@/components/exceptions/ExceptionResultsTable";
import { ExceptionDetailPanel } from "@/components/exceptions/ExceptionDetailPanel";
import { useExceptionColumns } from "@/components/exceptions/useExceptionColumns";
import { EmptyState } from "@/components/exceptions/EmptyState";
import { requireAuth } from "@/lib/utils";
import { useExceptionSearch, type ExceptionSearchParams } from "@/hooks/useExceptionSearch";
import { APIError } from "@/lib/api/client";

export const Route = createFileRoute("/exceptions/")({
  beforeLoad: requireAuth,
  component: ExceptionsPage,
});

// Decorative Header Component
function ExceptionHeader() {
  return (
    <div
      className="rounded-xl p-10 text-white relative"
      style={{ background: "linear-gradient(135deg, #002B51 0%, #003a6b 60%, #0d2d60 100%)" }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
      </div>

      {/* Exception Badge */}
      <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
        <AlertTriangle className="size-3 text-white/80" />
        <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">Exception Management</span>
      </div>

      <h2 className="text-xl font-semibold text-white mb-1.5">Exceptions Management Centre</h2>
      <p className="text-white/70 text-sm mb-7">
        View and solve exceptions from the table below.
      </p>
    </div>
  );
}

function ExceptionsPage() {
  const queryClient = useQueryClient();
  const TABLE_STATE_KEY = "exceptionTableState:v1";
  const FILTER_STATE_KEY = "exceptionFilters:v1";
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === "undefined") return [];
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as { sorting?: SortingState };
      return parsed.sorting ?? [];
    } catch {
      return [];
    }
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") return {};
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved) as { columnVisibility?: VisibilityState };
      return parsed.columnVisibility ?? {};
    } catch {
      return {};
    }
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (typeof window === "undefined") return [];
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as { columnFilters?: ColumnFiltersState };
      return parsed.columnFilters ?? [];
    } catch {
      return [];
    }
  });
  const [pagination, setPagination] = useState<PaginationState>(() => {
    if (typeof window === "undefined") return { pageIndex: 0, pageSize: 20 };
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    if (!saved) return { pageIndex: 0, pageSize: 20 };
    try {
      const parsed = JSON.parse(saved) as { pagination?: PaginationState };
      return parsed.pagination ?? { pageIndex: 0, pageSize: 20 };
    } catch {
      return { pageIndex: 0, pageSize: 20 };
    }
  });
  
  // Exception-specific state - no search query needed
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CLOSED">(() => {
    if (typeof window === "undefined") return "ALL";
    const saved = sessionStorage.getItem(FILTER_STATE_KEY);
    if (!saved) return "ALL";
    try {
      const parsed = JSON.parse(saved) as { statusFilter?: "ALL" | "PENDING" | "CLOSED" };
      return parsed.statusFilter ?? "ALL";
    } catch {
      return "ALL";
    }
  });
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW">(() => {
    if (typeof window === "undefined") return "ALL";
    const saved = sessionStorage.getItem(FILTER_STATE_KEY);
    if (!saved) return "ALL";
    try {
      const parsed = JSON.parse(saved) as { priorityFilter?: "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" };
      return parsed.priorityFilter ?? "ALL";
    } catch {
      return "ALL";
    }
  });

  // Search params for TanStack Query - always active since we load all data
  const searchParams: ExceptionSearchParams = {
    statusFilter,
    priorityFilter
  };

  // TanStack Query - Use the search hook (always enabled)
  const {
    data: searchResponse,
    isLoading: loading, // Renamed from searching to loading since it's initial load
    error: searchError,
    refetch: refetchSearch,
  } = useExceptionSearch(searchParams);

  // Extract results from query response
  const results = searchResponse?.results ?? [];
  const allExceptions = searchResponse?.allExceptions ?? [];

  // Handle refresh functionality
  const handleRefresh = async () => {
    try {
      // Clear all table filters and reset pagination
      table.resetColumnFilters();
      table.resetSorting();
      table.resetPageIndex();
      
      // Clear query cache to force fresh data fetch
      queryClient.removeQueries({ queryKey: ['exceptions', 'search'] });
      
      // Refetch current search
      await refetchSearch();
      
      console.log('Exception data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh exception data:', error);
    }
  };

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
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      TABLE_STATE_KEY,
      JSON.stringify({
        sorting,
        columnVisibility,
        columnFilters,
        pagination,
      }),
    );
  }, [sorting, columnVisibility, columnFilters, pagination]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      FILTER_STATE_KEY,
      JSON.stringify({
        statusFilter,
        priorityFilter,
      }),
    );
  }, [statusFilter, priorityFilter]);

  // Calculate stats from all exceptions (unfiltered)
  const stats = {
    total: allExceptions.filter((e) => e.status === "PENDING").length,
    critical: allExceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "CRITICAL",
    ).length,    
    high: allExceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "HIGH",
    ).length,
    medium: allExceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "MEDIUM",
    ).length,
    low: allExceptions.filter(
      (e) => e.status === "PENDING" && e.priority === "LOW",
    ).length,
    closed: allExceptions.filter((e) => e.status === "CLOSED").length,
  };

  // Convert error to string for display
  const errorMessage = searchError 
    ? searchError instanceof APIError 
      ? `Failed to load exceptions: ${searchError.message}`
      : "An unexpected error occurred while loading exceptions"
    : null;

  return (
    <div className="p-6 mx-auto space-y-6">
      {/* Decorative Header */}
      <ExceptionHeader />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">Loading exceptions from database...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </div>
          <button
            onClick={() => queryClient.removeQueries({ queryKey: ['exceptions', 'search'] })}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
            aria-label="Dismiss error"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          <StatsOverview stats={stats} />

          {allExceptions.length > 0 && (
            <div className={selectedException ? "grid grid-cols-3 gap-6" : ""}>
              <div className={selectedException ? "col-span-2" : ""}>
                <ExceptionResultsTable
                  table={table}
                  resultsCount={results.length}
                  selectedExceptionId={selectedException?.id || null}
                  statusFilter={statusFilter}
                  priorityFilter={priorityFilter}
                  onStatusFilterChange={setStatusFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  onRowClick={setSelectedException}
                  onRefresh={handleRefresh}
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

          {allExceptions.length === 0 && !loading && <EmptyState />}
        </>
      )}
    </div>
  );
}