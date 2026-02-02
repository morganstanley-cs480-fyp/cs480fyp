import { createFileRoute } from "@tanstack/react-router";
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
import { SearchHeader, type RecentSearch } from "@/components/trades/SearchHeader";
import { TradeFilters, type ManualSearchFilters } from "@/components/trades/TradeFilters";
import { TradeResultsTable } from "@/components/trades/TradeResultsTable";
import { useTradeColumns } from "@/components/trades/useTradeColumns";

export const Route = createFileRoute("/trades/")({
  component: TradeSearchPage,
});

function TradeSearchPage() {
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
      return saved ? (JSON.parse(saved) as ManualSearchFilters) : getDefaultFilters();
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
  const clearAllFilters = () => {
    setFilters(getDefaultFilters());
  };

  // Handle manual search with filters
  const handleManualSearch = () => {
    setSearching(true);
    
    setTimeout(() => {
      let filtered = [...mockTrades];
      
      // Apply filters
      if (filters.trade_id) {
        filtered = filtered.filter(t => t.trade_id.toString().includes(filters.trade_id));
      }
      if (filters.account) {
        filtered = filtered.filter(t => t.account === filters.account);
      }
      if (filters.asset_type) {
        filtered = filtered.filter(t => t.asset_type === filters.asset_type);
      }
      if (filters.booking_system) {
        filtered = filtered.filter(t => t.booking_system === filters.booking_system);
      }
      if (filters.affirmation_system) {
        filtered = filtered.filter(t => t.affirmation_system === filters.affirmation_system);
      }
      if (filters.clearing_house) {
        filtered = filtered.filter(t => t.clearing_house === filters.clearing_house);
      }
      if (filters.status.length > 0) {
        filtered = filtered.filter(t => filters.status.includes(t.status));
      }
      if (filters.cleared_trades_only) {
        filtered = filtered.filter(t => t.status === 'CLEARED');
      }
      
      // Date filtering
      if (filters.date_from || filters.date_to) {
        filtered = filtered.filter(t => {
          const tradeDate = new Date(t[filters.date_type]);
          const fromDate = filters.date_from ? new Date(filters.date_from) : new Date('2000-01-01');
          const toDate = filters.date_to ? new Date(filters.date_to) : new Date('2099-12-31');
          return tradeDate >= fromDate && tradeDate <= toDate;
        });
      }
      
      setResults(filtered);
      setSearching(false);
    }, 800);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    // Simulate search
    setTimeout(() => {
      setResults(mockTrades);
      setSearching(false);
      // Add to recent searches
      const newSearch: RecentSearch = {
        id: Date.now().toString(),
        query: searchQuery,
        timestamp: Date.now(),
      };
      setRecentSearches((prev) => [newSearch, ...prev.slice(0, 4)]);
    }, 800);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    setSearching(true);
    setTimeout(() => {
      setResults(mockTrades);
      setSearching(false);
    }, 800);
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
        onDeleteSearch={(id) => setRecentSearches((prev) => prev.filter((s) => s.id !== id))}
        onClearAllSearches={() => setRecentSearches([])}
      />

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
