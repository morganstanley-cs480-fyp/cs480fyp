import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

import type { Trade } from "@/lib/api/types";

import type { QueryHistory } from "@/lib/api/types";

// Component imports
import { SearchHeader, type RecentSearch } from "@/components/trades/SearchHeader";
import { SavedQueriesPanel } from "@/components/trades/SavedQueriesPanel";
import { TradeFilters, type ManualSearchFilters } from "@/components/trades/TradeFilters";
import { TradeResultsTable } from "@/components/trades/TradeResultsTable";
import { useTradeColumns } from "@/components/trades/useTradeColumns";
import { useUser } from "@/contexts/UserContext";
import { searchService } from "@/lib/api/searchService";
import { APIError } from "@/lib/api/client";
import { tradeFlowService } from "@/lib/api/tradeFlowService";

// Define search params schema for pagination
type TradeSearchParams = {
  page?: number;
  pageSize?: number;
};

export const Route = createFileRoute("/trades/")({
  component: TradeSearchPage,
  validateSearch: (search: Record<string, unknown>): TradeSearchParams => {
    return {
      page: Number(search?.page) || 1,
      pageSize: Number(search?.pageSize) || 20,
    };
  },
});

function TradeSearchPage() {
  const { userId } = useUser();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  
  const STORAGE_KEY = "tradeFilters:v1";
  const TABLE_STATE_KEY = "tradeTableState:v1";
  const SEARCH_KEY = "tradeSearchQuery:v1";

  const getDefaultFilters = (): ManualSearchFilters => ({
    trade_id: "",
    account: "all",
    asset_type: "all",
    booking_system: "all",
    affirmation_system: "all",
    clearing_house: "all",
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
      return saved ? (JSON.parse(saved) as ManualSearchFilters) : getDefaultFilters();
    } catch (error) {
      console.warn("Failed to parse saved trade filters", error);
      return getDefaultFilters();
    }
  };

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedQueries, setSavedQueries] = useState<QueryHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = sessionStorage.getItem(SEARCH_KEY);
    return saved ?? "";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<Trade[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    accounts: [] as string[],
    assetTypes: [] as string[],
    bookingSystems: [] as string[],
    affirmationSystems: [] as string[],
    clearingHouses: [] as string[],
    statuses: [] as string[],
  });
  
  // Fetch search history from backend
  const fetchSearchHistory = async () => {
    try {
      const queries = await searchService.getSearchHistory(userId, 10);
      const history: RecentSearch[] = queries.map(q => ({
        id: q.query_id.toString(),
        query: q.query_text,
        timestamp: new Date(q.last_use_time).getTime(),
        queryId: q.query_id,
      }));
      setRecentSearches(history);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
      // Silently fail - history is not critical
    }
  };
  
  // Fetch saved queries from backend
  const fetchSavedQueries = async () => {
    try {
      const queries = await searchService.getSavedQueries(userId, 50);
      setSavedQueries(queries);
    } catch (error) {
      console.error('Failed to fetch saved queries:', error);
      // Silently fail - saved queries not critical
    }
  };
  
  // Fetch history and saved queries on mount
  useEffect(() => {
    fetchSearchHistory();
    fetchSavedQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadFilterOptions = async () => {
      try {
        const trades = await tradeFlowService.getTrades(1000, 0);
        if (!isActive) return;

        const uniqueValues = <T,>(items: T[]) => Array.from(new Set(items));

        setFilterOptions({
          accounts: uniqueValues(trades.map((trade) => trade.account)).sort(),
          assetTypes: uniqueValues(trades.map((trade) => trade.asset_type)).sort(),
          bookingSystems: uniqueValues(trades.map((trade) => trade.booking_system)).sort(),
          affirmationSystems: uniqueValues(trades.map((trade) => trade.affirmation_system)).sort(),
          clearingHouses: uniqueValues(trades.map((trade) => trade.clearing_house)).sort(),
          statuses: uniqueValues(trades.map((trade) => trade.status)).sort(),
        });
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load filter options:', error);
        setFilterOptions({
          accounts: [],
          assetTypes: [],
          bookingSystems: [],
          affirmationSystems: [],
          clearingHouses: [],
          statuses: [],
        });
      }
    };

    loadFilterOptions();

    return () => {
      isActive = false;
    };
  }, []);
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
    // Initialize from URL search params
    return {
      pageIndex: (searchParams.page || 1) - 1, // Convert 1-based to 0-based
      pageSize: searchParams.pageSize || 20,
    };
  });
  
  // Manual search filter state
  const [filters, setFilters] = useState<ManualSearchFilters>(loadFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Sync pagination state to URL
  useEffect(() => {
    navigate({
      to: "/trades",
      search: {
        page: pagination.pageIndex + 1, // Convert 0-based to 1-based
        pageSize: pagination.pageSize,
      },
      replace: true, // Don't add to history stack
    });
  }, [pagination, navigate]);

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
      console.error('Search failed:', error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError('An unexpected error occurred during search');
      }
    } finally {
      setSearching(false);
    }
  };

  // Handle manual search with filters
  const handleManualSearch = async () => {
    setSearching(true);
    setSearchError(null);
    
    try {
      // Helper function to filter out empty or "all" values
      const filterValue = (value: string | undefined) => {
        return value && value !== "" && value !== "all" ? value : undefined;
      };

      // Build manual search request
      const response = await searchService.searchTrades({
        search_type: "manual",
        user_id: userId,
        filters: {
          trade_id: filterValue(filters.trade_id),
          account: filterValue(filters.account),
          asset_type: filterValue(filters.asset_type),
          booking_system: filterValue(filters.booking_system),
          affirmation_system: filterValue(filters.affirmation_system),
          clearing_house: filterValue(filters.clearing_house),
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
      console.error('Search failed:', error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError('An unexpected error occurred during search');
      }
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
      
      // Refresh search history from backend after successful search
      await fetchSearchHistory();
    } catch (error) {
      console.error('Search failed:', error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError('An unexpected error occurred during search');
      }
      setResults([]);
      
      // Refresh history even on error (backend should save failed searches now)
      await fetchSearchHistory();
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
      
      // Refresh history after search
      await fetchSearchHistory();
    } catch (error) {
      console.error('Search failed:', error);
      if (error instanceof APIError) {
        setSearchError(`Search failed: ${error.message}`);
      } else {
        setSearchError('An unexpected error occurred during search');
      }
      setResults([]);
      
      // Refresh history even on error
      await fetchSearchHistory();
    } finally {
      setSearching(false);
    }
  };

  const handleClearAllSearches = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Confirm Clear All?\n\nThis will permanently delete all your search history."
    );
    
    if (!confirmed) {
      return; // User clicked "No" or cancelled
    }
    
    try {
      await searchService.clearSearchHistory(userId);
      // Clear local state
      setRecentSearches([]);
      console.log('All search history cleared successfully');
    } catch (error) {
      console.error('Failed to clear search history:', error);
      // Still clear local state even if backend fails
      setRecentSearches([]);
    }
  };

  const handleSaveQuery = async (queryId: number, queryName: string) => {
    try {
      await searchService.saveQuery(queryId, userId, queryName);
      // Refresh both lists
      await fetchSearchHistory();
      await fetchSavedQueries();
    } catch (error) {
      console.error('Failed to save query:', error);
      alert('Failed to save query. Please try again.');
    }
  };

  const handleSelectSavedQuery = async (queryText: string) => {
    // Just populate the search bar - user can manually trigger search
    setSearchQuery(queryText);
    setShowSavedQueries(false);
    // Note: Not auto-triggering search or updating last_use_time
    // User needs to click Search button themselves
  };

  const handleDeleteSavedQuery = async (queryId: number) => {
    const confirmed = window.confirm(
      "Delete this saved query?\n\nThis action cannot be undone."
    );
    
    if (!confirmed) return;

    try {
      await searchService.deleteSearchHistory(queryId, userId);
      // Refresh saved queries list
      await fetchSavedQueries();
    } catch (error) {
      console.error('Failed to delete saved query:', error);
      alert('Failed to delete query. Please try again.');
    }
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      <SearchHeader
        searchQuery={searchQuery}
        searching={searching}
        showFilters={showFilters}
        recentSearches={recentSearches}
        showSavedQueries={showSavedQueries}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onToggleSavedQueries={() => setShowSavedQueries(!showSavedQueries)}
        onRecentSearchClick={handleRecentSearchClick}
        onDeleteSearch={(id) => setRecentSearches((prev) => prev.filter((s) => s.id !== id))}
        onClearAllSearches={handleClearAllSearches}
        onSaveQuery={handleSaveQuery}
      />

      {showSavedQueries && (
        <SavedQueriesPanel
          savedQueries={savedQueries}
          onSelectQuery={handleSelectSavedQuery}
          onDeleteQuery={handleDeleteSavedQuery}
        />
      )}

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
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
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
          getUniqueAccounts={() => filterOptions.accounts}
          getUniqueAssetTypes={() => filterOptions.assetTypes}
          getUniqueBookingSystems={() => filterOptions.bookingSystems}
          getUniqueAffirmationSystems={() => filterOptions.affirmationSystems}
          getUniqueClearingHouses={() => filterOptions.clearingHouses}
          getUniqueStatuses={() => filterOptions.statuses}
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
