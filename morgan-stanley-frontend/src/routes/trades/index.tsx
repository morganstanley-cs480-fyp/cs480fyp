import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
// ✅ TANSTACK QUERY - Added imports
import { useQueryClient } from "@tanstack/react-query";
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

import type { TypeaheadSuggestion } from "@/lib/api/types";
// ✅ TANSTACK QUERY - Added SearchRequest type import for query params
import type { ChatMessage, QueryHistory, SearchRequest, Trade } from "@/lib/api/types";

import {
  SearchHeader,
  type RecentSearch,
} from "@/components/trades/SearchHeader";
import {
  TradeFilters,
  type ManualSearchFilters,
} from "@/components/trades/TradeFilters";
import { TradeStatsCards } from "@/components/trades/TradeStatsCards";
import { TradeResultsTable } from "@/components/trades/TradeResultsTable";
import { useTradeColumns } from "@/components/trades/useTradeColumns";
import { searchService } from "@/lib/api/searchService";
import { chatService } from "@/lib/api/chatService";
import { APIError } from "@/lib/api/client";
import { requireAuth } from "@/lib/utils";
import { useTradeSearch } from "@/hooks/useTradeSearch";

export const Route = createFileRoute("/trades/")({
  beforeLoad: requireAuth,
  component: TradeSearchPage,
});


function TradeSearchPage() {
  const auth = useAuth();
  const userId = (auth.user?.profile?.sub as string) ?? "dev-user";
  // ✅ TANSTACK QUERY - Added query client for cache management
  const queryClient = useQueryClient();

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
      return saved
        ? (JSON.parse(saved) as ManualSearchFilters)
        : getDefaultFilters();
    } catch (error) {
      console.warn("Failed to parse saved trade filters", error);
      return getDefaultFilters();
    }
  };

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedQueries, setSavedQueries] = useState<QueryHistory[]>([]);
  const [suggestions, setSuggestions] = useState<TypeaheadSuggestion[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = sessionStorage.getItem(SEARCH_KEY);
    return saved ?? "";
  });
  const [currentQueryId, setCurrentQueryId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"table" | "analysis" | "both" | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatTableResults, setChatTableResults] = useState<Trade[] | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([]);
  const [chatEvidence, setChatEvidence] = useState<{
    dimensions: string[];
    rows: Record<string, unknown>[];
    chart: {
      title: string;
      x_key: string;
      y_key: string;
      labels: string[];
      series: Array<{ name: string; data: number[] }>;
      chart_type?: 'bar' | 'line' | 'pie';
    };
    metadata: {
      top_k: number;
      priority_filter: string[] | null;
      row_count: number;
    };
  } | null>(null);
  // ❌ TANSTACK QUERY - Removed manual loading/error states (replaced by query)
  // const [searching, setSearching] = useState(false);
  // const [searchError, setSearchError] = useState<string | null>(null);
  // const [results, setResults] = useState<Trade[]>([]);

  const [filterOptions, setFilterOptions] = useState({
    accounts: [] as string[],
    assetTypes: [] as string[],
    bookingSystems: [] as string[],
    affirmationSystems: [] as string[],
    clearingHouses: [] as string[],
    statuses: [] as string[],
  });

  // Manual search filter state
  const [filters, setFilters] = useState<ManualSearchFilters>(loadFilters);

  // Explicitly submitted search params — only set when the user intentionally submits a search.
  // Keeping this separate from the live searchQuery input prevents auto-firing on every keystroke.
  const [submittedParams, setSubmittedParams] = useState<SearchRequest | null>(null);

  // Restore the last submitted NLQ from sessionStorage on mount (preserves results on Back navigation)
  // If no saved query exists, load all trades by default
  useEffect(() => {
    const savedQuery = sessionStorage.getItem(SEARCH_KEY);
    if (savedQuery?.trim()) {
      setSubmittedParams({
        search_type: "natural_language",
        user_id: userId,
        query_text: savedQuery,
      });
    } else {
      // Load all trades on initial page load with empty manual filters
      setSubmittedParams({
        search_type: "manual",
        user_id: userId,
        filters: {
          date_type: "update_time",
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to build manual filter params from current filter state
  const buildManualParams = (): SearchRequest => {
    const filterValue = (value: string | undefined) =>
      value && value !== "" && value !== "all" ? value : undefined;
    return {
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
    };
  };

  // ✅ TANSTACK QUERY - Use the search hook instead of manual state management
  const {
    data: searchResponse,
    isLoading: searching,
    error: searchError,
    refetch: refetchSearch,
  } = useTradeSearch(submittedParams);

  // ✅ TANSTACK QUERY - Extract results from query response
  const results = useMemo(
    () => chatTableResults ?? searchResponse?.results ?? [],
    [chatTableResults, searchResponse?.results]
  );

  // ✅ TANSTACK QUERY - Update current query ID when search response changes
  // Also refresh history here — the backend saves the query during /api/search,
  // so this is the earliest point we can reliably fetch the updated list.
  useEffect(() => {
    if (searchResponse?.query_id) {
      setCurrentQueryId(searchResponse.query_id);
      fetchSearchHistory();
    }
  // fetchSearchHistory is a stable async fn; adding it would require useCallback and cause re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResponse?.query_id]);

  // When a natural language search completes, reflect the LLM-extracted parameters
  // in the manual filter panel so the user can see what was interpreted and
  // optionally amend the values before running a manual search.
  useEffect(() => {
    if (
      searchResponse?.search_type !== 'natural_language' ||
      !searchResponse.extracted_params
    ) return;

    const p = searchResponse.extracted_params;

    setFilters((prev) => ({
      ...prev,
      // trade_id: int on backend, string in the input field
      trade_id: p.trade_id != null ? String(p.trade_id) : '',
      // backend returns arrays; manual filter dropdowns are single-select — use first value
      account: p.accounts?.length ? p.accounts[0] : 'all',
      asset_type: p.asset_types?.length ? p.asset_types[0] : 'all',
      booking_system: p.booking_systems?.length ? p.booking_systems[0] : 'all',
      affirmation_system: p.affirmation_systems?.length ? p.affirmation_systems[0] : 'all',
      clearing_house: p.clearing_houses?.length ? p.clearing_houses[0] : 'all',
      // statuses is already an array — direct mapping
      status: p.statuses ?? [],
      date_from: p.date_from ?? '',
      date_to: p.date_to ?? '',
      with_exceptions_only: p.with_exceptions_only ?? false,
      cleared_trades_only: p.cleared_trades_only ?? false,
    }));

    // Auto-expand the filter panel so the user can see the populated values
    setShowFilters(true);
  // Re-run only when a new NL query result arrives (identified by its unique query_id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResponse?.query_id]);

  const handleRefresh = async () => {
    try {
      // Clear all table filters and reset pagination
      table.resetColumnFilters();
      table.resetSorting();
      table.resetPageIndex();
      
      // Clear query cache to force fresh data fetch
      queryClient.removeQueries({ queryKey: ['trades', 'search'] });
      
      // Refetch current search if we have submitted params
      if (submittedParams) {
        await refetchSearch();
      }
      
      // Refresh filter options in case new values were added
      await fetchFilterOptions();
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Fetch search history from backend
  const fetchSearchHistory = async () => {
    try {
      const queries = await searchService.getSearchHistory(userId, 10);
      const history: RecentSearch[] = queries.map((q) => ({
        id: q.query_id.toString(),
        query: q.query_text,
        timestamp: new Date(q.last_use_time).getTime(),
        queryId: q.query_id,
      }));
      setRecentSearches(history);
    } catch (error) {
      console.error("Failed to fetch search history:", error);
      // Silently fail - history is not critical
    }
  };

  // Fetch saved queries from backend
  const fetchSavedQueries = async () => {
    try {
      const queries = await searchService.getSavedQueries(userId, 50);
      setSavedQueries(queries);
    } catch (error) {
      console.error("Failed to fetch saved queries:", error);
      // Silently fail - saved queries not critical
    }
  };

  // Fetch filter dropdown options from the dedicated aggregation endpoint.
  // This is independent of trade results — one cheap DB query, not a 1000-row fetch.
  const fetchFilterOptions = async () => {
    try {
      const options = await searchService.getFilterOptions();
      setFilterOptions({
        accounts: options.accounts,
        assetTypes: options.asset_types,
        bookingSystems: options.booking_systems,
        affirmationSystems: options.affirmation_systems,
        clearingHouses: options.clearing_houses,
        statuses: options.statuses,
      });
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  // Fetch history, saved queries, and filter options on mount (and when userId changes).
  useEffect(() => {
    fetchSearchHistory();
    fetchSavedQueries();
    fetchFilterOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
    // Restore from sessionStorage so Back navigation returns to the same page
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const query = searchQuery.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await searchService.getTypeaheadSuggestions(
          userId,
          query,
          8,
        );
        setSuggestions(results);
      } catch (error) {
        console.warn(
          "[Autocomplete] Failed to fetch typeahead suggestions — check network tab for",
          `/api/history/suggestions?user_id=…&q=${encodeURIComponent(query)}`,
          error,
        );
        setSuggestions([]);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery, userId]);

  // Persist pagination to sessionStorage so Back navigation restores the right page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(TABLE_STATE_KEY);
    let existing: Record<string, unknown> = {};
    try {
      existing = saved ? (JSON.parse(saved) as Record<string, unknown>) : {};
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(
      TABLE_STATE_KEY,
      JSON.stringify({ ...existing, pagination }),
    );
  }, [pagination]);

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
    onPaginationChange: setPagination,
    autoResetPageIndex: false, // Prevent page reset when data reloads (e.g. on Back navigation)
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
  });

  // Reset filters and clear results — requires a new explicit search to show results again
  const clearAllFilters = () => {
    setFilters(getDefaultFilters());
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSubmittedParams(null);
    queryClient.removeQueries({ queryKey: ['trades', 'search'] });
  };

  // Submit the current filter state as a manual search
  const handleManualSearch = () => {
    setChatTableResults(null);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSubmittedParams(buildManualParams());
    // History refresh is handled by the searchResponse useEffect
  };

  // Submit the current search query as a natural language search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setChatTableResults(null);
    setSuggestions([]);
    sessionStorage.setItem(SEARCH_KEY, searchQuery);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSubmittedParams({
      search_type: "natural_language",
      user_id: userId,
      query_text: searchQuery,
    });
    // History refresh is handled by the searchResponse useEffect
  };

  const handleAskAI = async () => {
    const message = searchQuery.trim();
    if (!message) return;
    // Clear previous AI response so UI shows fresh loading state
    setChatAnswer(null);
    setChatEvidence(null);
    setChatMode(null);
    setFollowUpPrompts([]);
    await handleAskAIWithPrompt(message);
  };

  // Re-run a query from history
  const handleRecentSearchClick = (query: string) => {
    setChatTableResults(null);
    setSearchQuery(query);
    sessionStorage.setItem(SEARCH_KEY, query);
    setSuggestions([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setSubmittedParams({
      search_type: "natural_language",
      user_id: userId,
      query_text: query,
    });
    // History refresh is handled by the searchResponse useEffect
  };

  const handleSaveQuery = async (queryId: number, queryName: string) => {
    if (!queryId || queryId <= 0) {
      alert(
        "Unable to save: no valid query ID. Please perform a search first.",
      );
      return;
    }
    try {
      await searchService.saveQuery(queryId, userId, queryName);
      // Refresh both lists
      await fetchSearchHistory();
      await fetchSavedQueries();
    } catch (error) {
      console.error("Failed to save query:", error);
      alert("Failed to save query. Please try again.");
    }
  };

  const handleSaveCurrentQuery = async () => {
    // If there's no search query text at all, nothing to save
    if (!searchQuery.trim()) {
      alert("Please enter a search query before saving.");
      return;
    }

    const queryName = window.prompt(
      "Enter a name for this saved query:",
      searchQuery.substring(0, 50),
    );
    if (!queryName || !queryName.trim()) return;

    // If we already have a query_id from a prior search, use it directly
    if (currentQueryId) {
      await handleSaveQuery(currentQueryId, queryName.trim());
      return;
    }

    // ✅ TANSTACK QUERY - Use refetch instead of manual API call
    try {
      const response = await refetchSearch();
      if (response.data?.query_id) {
        await fetchSearchHistory();
        await handleSaveQuery(response.data.query_id, queryName.trim());
      }
    } catch (error) {
      console.error("Search failed before saving:", error);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setChatAnswer(null);
    setChatMode(null);
    setChatEvidence(null);
    setChatError(null);
    setChatTableResults(null);
    setChatHistory([]);
    setFollowUpPrompts([]);
    setSubmittedParams(null);
    sessionStorage.removeItem(SEARCH_KEY);
    setCurrentQueryId(null);
    setSuggestions([]);
    setFilters(getDefaultFilters());
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    queryClient.removeQueries({ queryKey: ['trades', 'search'] });

    setSubmittedParams({
      search_type: "manual",
      user_id: userId,
      filters: {
        date_type: "update_time",
      },
    });    
  };

  const handleSuggestionClick = (query: string) => {
    handleRecentSearchClick(query);
  };

  const handleFollowUpPromptClick = (prompt: string) => {
    setSearchQuery(prompt);
    void handleAskAIWithPrompt(prompt);
  };

  const handleAskAIWithPrompt = async (prompt: string) => {
    const message = prompt.trim();
    if (!message) return;

    setChatLoading(true);
    setChatError(null);

    try {
      const response = await chatService.sendMessage({
        user_id: userId,
        message,
        conversation: chatHistory.slice(-6),
      });

      setChatMode(response.mode);
      setChatAnswer(response.ai_answer ?? null);
      setChatEvidence(response.evidence ?? null);
      setFollowUpPrompts(response.follow_up_prompts ?? []);
      setCurrentQueryId(response.query_id || null);

      setChatHistory((prev) => [
        ...prev,
        { role: "user", content: message },
        {
          role: "assistant",
          content: response.ai_answer ?? `Completed in ${response.mode} mode.`,
        },
      ]);

      if ((response.mode === "table" || response.mode === "both") && response.results) {
        setChatTableResults(response.results);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }

      await fetchSearchHistory();
    } catch (error) {
      const messageText =
        error instanceof APIError ? error.message : "Failed to process AI chat request";
      setChatError(messageText);
      console.error("AI chat request failed:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteRecentSearch = async (id: string) => {
    // Optimistically remove from UI
    setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    try {
      await searchService.deleteSearchHistory(parseInt(id), userId);
    } catch (error) {
      console.error("Failed to delete recent search:", error);
      // Revert by re-fetching if API call fails
      await fetchSearchHistory();
    }
  };

  const handleClearAllSearches = async () => {
    setRecentSearches([]);
    try {
      await searchService.clearSearchHistory(userId);
    } catch (error) {
      console.error("Failed to clear search history:", error);
      await fetchSearchHistory();
    }
  };

  const handleDeleteSavedQuery = async (queryId: number) => {
    // Optimistically remove from UI
    setSavedQueries((prev) => prev.filter((q) => q.query_id !== queryId));
    try {
      await searchService.deleteSearchHistory(queryId, userId);
    } catch (error) {
      console.error("Failed to delete saved query:", error);
      // Revert by re-fetching if API call fails
      await fetchSavedQueries();
    }
  };

  // ✅ TANSTACK QUERY - Convert error to string for display
  const errorMessage = searchError 
    ? searchError instanceof APIError 
      ? `Search failed: ${searchError.message}`
      : "An unexpected error occurred during search"
    : null;

  return (
    <div className="p-6 mx-auto space-y-6">
      <SearchHeader
        searchQuery={searchQuery}
        searching={searching}
        chatLoading={chatLoading}
        chatMode={chatMode}
        chatAnswer={chatAnswer}
        chatEvidence={chatEvidence}
        chatThread={chatHistory}
        followUpPrompts={followUpPrompts}
        chatError={chatError}
        showFilters={showFilters}
        recentSearches={recentSearches}
        savedQueries={savedQueries}
        canSaveQuery={searchQuery.trim() !== ""}
        suggestions={suggestions}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onAskAI={handleAskAI}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onRecentSearchClick={handleRecentSearchClick}
        onDeleteSearch={handleDeleteRecentSearch}
        onClearAllSearches={handleClearAllSearches}
        onSaveCurrentQuery={handleSaveCurrentQuery}
        onClearSearch={handleClearSearch}
        onSuggestionClick={handleSuggestionClick}
        onFollowUpPromptClick={handleFollowUpPromptClick}
        onFollowUpChat={(msg) => { void handleAskAIWithPrompt(msg); }}
        onDeleteSavedQuery={handleDeleteSavedQuery}
      />

      {/* ✅ TANSTACK QUERY - Use converted error message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 shrink-0"
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
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </div>
          <button
            onClick={() => queryClient.removeQueries({ queryKey: ['trades', 'search'] })}
            className="text-red-400 hover:text-red-600 shrink-0"
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
          getUniqueAccounts={() => filterOptions.accounts}
          getUniqueAssetTypes={() => filterOptions.assetTypes}
          getUniqueBookingSystems={() => filterOptions.bookingSystems}
          getUniqueAffirmationSystems={() => filterOptions.affirmationSystems}
          getUniqueClearingHouses={() => filterOptions.clearingHouses}
          getUniqueStatuses={() => filterOptions.statuses}
        />
      )}

      <TradeStatsCards trades={results} />

      <TradeResultsTable
        table={table}
        resultsCount={results.length}
        columnFiltersCount={columnFilters.length}
        filterOptions={filterOptions}
        onRefresh={handleRefresh}
        isLoading={searching}
      />
    </div>
  );
}