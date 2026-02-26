// The gradient search header with natural language search input

import { Search, Filter, Sparkles, Star, X as XIcon, Eraser } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { QueryHistory } from "@/lib/api/types";

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  queryId: number; // Add query_id for saving
}

export interface TypeaheadSuggestion {
  query_id: number;
  query_text: string;
  is_saved: boolean;
  query_name: string | null;
  last_use_time?: string | null;
  score: number;
  category?: string | null;
}

interface SearchHeaderProps {
  searchQuery: string;
  searching: boolean;
  showFilters: boolean;
  recentSearches: RecentSearch[];
  savedQueries: QueryHistory[];
  canSaveQuery: boolean;
  suggestions: TypeaheadSuggestion[];
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
  onRecentSearchClick: (query: string) => void;
  onDeleteSearch: (id: string) => void;
  onSaveCurrentQuery: () => void;
  onClearSearch: () => void;
  onSuggestionClick: (query: string) => void;
  onDeleteSavedQuery: (queryId: number) => void;
}

export function SearchHeader({
  searchQuery,
  searching,
  recentSearches,
  savedQueries,
  canSaveQuery,
  suggestions,
  onSearchQueryChange,
  onSearch,
  onToggleFilters,
  onRecentSearchClick,
  onDeleteSearch,
  onSaveCurrentQuery,
  onClearSearch,
  onSuggestionClick,
  onDeleteSavedQuery,
}: SearchHeaderProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearchClick = (query: string) => {
    onRecentSearchClick(query);
  };

  const handleSavedQueryClick = (queryText: string) => {
    onRecentSearchClick(queryText);
  };

  return (
    <div
      className="rounded-xl p-10 text-white relative"
      style={{ background: "linear-gradient(135deg, #002B51 0%, #003a6b 60%, #0d2d60 100%)" }}
    >
      {/* Glow — isolated in its own overflow-hidden wrapper so it doesn't clip the suggestions dropdown */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
      </div>

      {/* AI Badge */}
      <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
        <Sparkles className="size-3 text-white/80" />
        <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">AI-Powered Search</span>
      </div>

      <h2 className="text-xl font-semibold text-white mb-1.5">Advanced Trade Lifecycle Search</h2>
      <p className="text-white/70 text-sm mb-7">
        Search trades using specific filters. Find trades by ID, counterparty, date range, and more.
      </p>

      {/* Search row */}
      <div className="flex gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-black/50 z-10" />
          <Input
            placeholder="Search by trade ID, counterparty, product type..."
            className="pl-10 pr-32 bg-white h-12 text-black"
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setShowSuggestions(false); onSearch(); }
              if (e.key === "Escape") setShowSuggestions(false);
            }}
          />
          {/* Typeahead suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.query_id}-${i}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-black hover:bg-black/[0.04] transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click registers
                    setShowSuggestions(false);
                    onSuggestionClick(s.query_text);
                  }}
                >
                  <Search className="size-3.5 shrink-0 text-black/30" />
                  <span className="truncate">{s.query_text}</span>
                  {s.is_saved && <Star className="size-3 shrink-0 ml-auto text-yellow-500 fill-yellow-400" />}
                </button>
              ))}
            </div>
          )}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="h-8 px-2 text-black/60 hover:text-black hover:bg-black/5"
              title="Clear search"
            >
              <Eraser className="size-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveCurrentQuery}
              disabled={!canSaveQuery}
              className="h-8 px-2 text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Save this query"
            >
              <Star className="size-4 mr-1" />
              Save Query
            </Button>
          </div>
        </div>
        <Button
          onClick={onSearch}
          disabled={searching}
          className="bg-white text-[#002B51] hover:bg-white/90 h-12 px-7 font-semibold text-sm shadow-sm border-0"
        >
          {searching ? "Searching..." : "Search"}
        </Button>
        <Button
          onClick={onToggleFilters}
          className="bg-white/10 text-white hover:bg-white/18 border border-white/18 h-12 px-5 text-sm font-medium"
        >
          <Filter className="size-3.5 mr-2" />
          Manual Search
        </Button>
      </div>

      {/* Recent and Saved chips strip */}
      {(recentSearches.length > 0 || savedQueries.length > 0) && (
        <div className="flex flex-col gap-3 mt-5">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-xs uppercase tracking-wider font-medium">Recent:</span>
              {recentSearches.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1 bg-white/8 border border-white/14 rounded-full text-xs text-white hover:bg-white/14 transition-colors max-w-[200px]"
                >
                  <button
                    onClick={() => handleSearchClick(s.query)}
                    className="truncate"
                  >
                    {s.query}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSearch(s.id);
                    }}
                    className="shrink-0 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    title="Remove"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Saved Queries */}
          {savedQueries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                <Star className="size-3 fill-white" />
                Saved:
              </span>
              {savedQueries.slice(0, 4).map((q) => (
                <div
                  key={q.query_id}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1 bg-white/8 border border-white/14 rounded-full text-xs text-white hover:bg-white/14 transition-colors max-w-[200px]"
                >
                  <button
                    onClick={() => handleSavedQueryClick(q.query_text)}
                    className="truncate"
                    title={q.query_name || q.query_text}
                  >
                    {q.query_name || q.query_text}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedQuery(q.query_id);
                    }}
                    className="shrink-0 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    title="Remove saved query"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
