import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

import {
  mockTrades,
  type Trade,
  getUniqueAssetTypes,
  getUniqueAccounts,
  getUniqueBookingSystems,
  getUniqueAffirmationSystems,
  getUniqueClearingHouses,
  getUniqueStatuses,
} from "@/lib/mockData";

// Component imports
import {
  SearchHeader,
  type RecentSearch,
} from "@/components/trades/SearchHeader";
import {
  TradeFilters,
  type ManualSearchFilters,
} from "@/components/trades/TradeFilters";
import { TradeResultsTable } from "@/components/trades/TradeResultsTable";
import { useTradeColumns } from "@/components/trades/useTradeColumns";
// import { useUser } from "@/contexts/UserContext";
import { searchService } from "@/lib/api/searchService";
import { APIError } from "@/lib/api/client";
import { requireAuth } from "@/lib/utils";

export const Route = createFileRoute("/trades/")({
  beforeLoad: requireAuth,
  component: TradeSearchPage,
});

function TradeSearchPage() {
  // const { userId } = useUser();
  const STORAGE_KEY = "tradeFilters:v1";
  const TABLE_STATE_KEY = "tradeTableState:v1";
  const SEARCH_KEY = "tradeSearchQuery:v1";

  const getDefaultFilters = (): ManualSearchFilters => ({
    trade_id: "",
    account: "",
    asset_type: "",
    booking_system: "",
    affirmation_system: "",
    clearing_house: "",
    status: [],
    date_type: "update_time",
    date_from: "",
    date_to: "",
    with_exceptions_only: false,
    cleared_trades_only: false,
  });

  const loadFilters = (): ManualSearchFilters => {
    if (typeof window === "undefined") return getDefaultFilters();
    const saved = sessionStorage.getItem(STORAGE_KEY);
    try {
      return saved
        ? (JSON.parse(saved) as ManualSearchFilters)
        : getDefaultFilters();
    } catch (error) {
      console.warn("Failed to parse saved trade filters", error);
      return getDefaultFilters();
    }
  };

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = sessionStorage.getItem(SEARCH_KEY);
    return saved ?? "";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<Trade[]>(mockTrades);
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => {
      if (typeof window === "undefined") return {};
      const saved = sessionStorage.getItem(TABLE_STATE_KEY);
      if (!saved) return {};
      try {
        const parsed = JSON.parse(saved) as {
          columnVisibility?: VisibilityState;
        };
        return parsed.columnVisibility ?? {};
      } catch {
        return {};
      }
    },
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (typeof window === "undefined") return [];
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as {
        columnFilters?: ColumnFiltersState;
      };
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

  // Manual search filter state
  const [filters, setFilters] = useState<ManualSearchFilters>(loadFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const columns = useTradeColumns();

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
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
  });

  // Clear all filters
  const clearAllFilters = async () => {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);

    // Search with cleared filters
    setSearching(true);
    setSearchError(null);

    try {
      const response = await searchService.searchTrades({
        search_type: "manual",
        user_id: userId,
        filters: {
          date_type: defaultFilters.date_type,
          date_from: defaultFilters.date_from || undefined,
          date_to: defaultFilters.date_to || undefined,
        },
      });

      setResults(response.results);
    } catch (error) {
      console.error("Search failed:", error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError("An unexpected error occurred during search");
      }
      // Fallback to mock data on error
      setResults(mockTrades);
    } finally {
      setSearching(false);
    }
  };

  // Handle manual search with filters
  const handleManualSearch = async () => {
    setSearching(true);
    setSearchError(null);

    try {
      // Build manual search request
      const response = await searchService.searchTrades({
        search_type: "manual",
        user_id: userId,
        filters: {
          trade_id: filters.trade_id || undefined,
          account: filters.account || undefined,
          asset_type: filters.asset_type || undefined,
          booking_system: filters.booking_system || undefined,
          affirmation_system: filters.affirmation_system || undefined,
          clearing_house: filters.clearing_house || undefined,
          status: filters.status.length > 0 ? filters.status : undefined,
          date_type: filters.date_type,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          with_exceptions_only: filters.with_exceptions_only || undefined,
          cleared_trades_only: filters.cleared_trades_only || undefined,
        },
      });

      setResults(response.results);
    } catch (error) {
      console.error("Search failed:", error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError("An unexpected error occurred during search");
      }
      // Fallback to mock data on error
      setResults(mockTrades);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      // Build natural language search request
      const response = await searchService.searchTrades({
        search_type: "natural_language",
        user_id: userId,
        query_text: searchQuery,
      });

      setResults(response.results);

      // Add to recent searches
      const newSearch: RecentSearch = {
        id: Date.now().toString(),
        query: searchQuery,
        timestamp: Date.now(),
      };
      setRecentSearches((prev) => [newSearch, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error("Search failed:", error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError("An unexpected error occurred during search");
      }
      // Fallback to mock data on error
      setResults(mockTrades);
    } finally {
      setSearching(false);
    }
  };

  const handleRecentSearchClick = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const response = await searchService.searchTrades({
        search_type: "natural_language",
        user_id: userId,
        query_text: query,
      });

      setResults(response.results);
    } catch (error) {
      console.error("Search failed:", error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError("An unexpected error occurred during search");
      }
      setResults(mockTrades);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      <SearchHeader
        searchQuery={searchQuery}
        searching={searching}
        showFilters={showFilters}
        recentSearches={recentSearches}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onRecentSearchClick={handleRecentSearchClick}
        onDeleteSearch={(id) =>
          setRecentSearches((prev) => prev.filter((s) => s.id !== id))
        }
        onClearAllSearches={() => setRecentSearches([])}
      />

      {searchError && (
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
            <h3 className="text-sm font-medium text-red-800">Search Error</h3>
            <p className="mt-1 text-sm text-red-700">{searchError}</p>
          </div>
          <button
            onClick={() => setSearchError(null)}
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

      {showFilters && (
        <TradeFilters
          filters={filters}
          searching={searching}
          onFiltersChange={setFilters}
          onSearch={handleManualSearch}
          onClearFilters={clearAllFilters}
          getUniqueAccounts={getUniqueAccounts}
          getUniqueAssetTypes={getUniqueAssetTypes}
          getUniqueBookingSystems={getUniqueBookingSystems}
          getUniqueAffirmationSystems={getUniqueAffirmationSystems}
          getUniqueClearingHouses={getUniqueClearingHouses}
          getUniqueStatuses={getUniqueStatuses}
        />
      )}

      <TradeResultsTable
        table={table}
        resultsCount={results.length}
        columnFiltersCount={columnFilters.length}
      />
    </div>
  );
}
