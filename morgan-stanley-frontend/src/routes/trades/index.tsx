import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { SearchHeader } from "@/components/trades/SearchHeader";
import { TradeFilters, type ManualSearchFilters } from "@/components/trades/TradeFilters";
import { TradeResultsTable } from "@/components/trades/TradeResultsTable";
import { RecentSearches, type RecentSearch } from "@/components/trades/RecentSearches";
import { useTradeColumns } from "@/components/trades/useTradeColumns";

export const Route = createFileRoute("/trades/")({
  component: TradeSearchPage,
});

function TradeSearchPage() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Trade[]>(mockTrades);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Manual search filter state
  const [filters, setFilters] = useState<ManualSearchFilters>({
    tradeId: '',
    account: '',
    assetType: '',
    bookingSystem: '',
    affirmationSystem: '',
    clearingHouse: '',
    status: [],
    dateType: 'update_time',
    dateFrom: '',
    dateTo: '',
    withExceptionsOnly: false,
    clearedTradesOnly: false,
  });

  const columns = useTradeColumns();

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

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      tradeId: '',
      account: '',
      assetType: '',
      bookingSystem: '',
      affirmationSystem: '',
      clearingHouse: '',
      status: [],
      dateType: 'update_time',
      dateFrom: '',
      dateTo: '',
      withExceptionsOnly: false,
      clearedTradesOnly: false,
    });
  };

  // Handle manual search with filters
  const handleManualSearch = () => {
    setSearching(true);
    
    setTimeout(() => {
      let filtered = [...mockTrades];
      
      // Apply filters
      if (filters.tradeId) {
        filtered = filtered.filter(t => t.trade_id.includes(filters.tradeId));
      }
      if (filters.account) {
        filtered = filtered.filter(t => t.account === filters.account);
      }
      if (filters.assetType) {
        filtered = filtered.filter(t => t.asset_type === filters.assetType);
      }
      if (filters.bookingSystem) {
        filtered = filtered.filter(t => t.booking_system === filters.bookingSystem);
      }
      if (filters.affirmationSystem) {
        filtered = filtered.filter(t => t.affirmation_system === filters.affirmationSystem);
      }
      if (filters.clearingHouse) {
        filtered = filtered.filter(t => t.clearing_house === filters.clearingHouse);
      }
      if (filters.status.length > 0) {
        filtered = filtered.filter(t => filters.status.includes(t.status));
      }
      if (filters.clearedTradesOnly) {
        filtered = filtered.filter(t => t.status === 'CLEARED');
      }
      
      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        filtered = filtered.filter(t => {
          const tradeDate = new Date(t[filters.dateType]);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date('2000-01-01');
          const toDate = filters.dateTo ? new Date(filters.dateTo) : new Date('2099-12-31');
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
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onToggleFilters={() => setShowFilters(!showFilters)}
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

      {results.length > 0 && (
        <TradeResultsTable
          table={table}
          resultsCount={results.length}
          columnFiltersCount={columnFilters.length}
        />
      )}

      <RecentSearches
        searches={recentSearches}
        onSearchClick={handleRecentSearchClick}
        onDeleteSearch={(id) => setRecentSearches((prev) => prev.filter((s) => s.id !== id))}
        onClearAll={() => setRecentSearches([])}
      />
    </div>
  );
}