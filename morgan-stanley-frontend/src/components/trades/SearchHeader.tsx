// The gradient search header with natural language search input and recent searches dropdown

import { Search, Sparkles, Filter, Clock, X, Star, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  queryId: number; // Add query_id for saving
}

interface SearchHeaderProps {
  searchQuery: string;
  searching: boolean;
  showFilters: boolean;
  recentSearches: RecentSearch[];
  showSavedQueries: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
  onToggleSavedQueries: () => void;
  onRecentSearchClick: (query: string) => void;
  onDeleteSearch: (id: string) => void;
  onClearAllSearches: () => void;
  onSaveQuery: (queryId: number, queryName: string) => void;
}

export function SearchHeader({
  searchQuery,
  searching,
  recentSearches,
  showSavedQueries,
  onSearchQueryChange,
  onSearch,
  onToggleFilters,
  onToggleSavedQueries,
  onRecentSearchClick,
  onDeleteSearch,
  onClearAllSearches,
  onSaveQuery,
}: SearchHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatTimestamp = (timestamp: number) => {
    const now = new Date().getTime();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleSearchClick = (query: string) => {
    onRecentSearchClick(query);
    setShowDropdown(false);
  };

  const handleSaveSearch = (queryId: number, query: string) => {
    const queryName = window.prompt(
      "Enter a name for this saved query:",
      query.substring(0, 50)
    );
    if (queryName && queryName.trim()) {
      onSaveQuery(queryId, queryName.trim());
    }
  };

  return (
    <div className="bg-[#002B51] rounded-lg p-8 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-6" />
        <h2>Advanced Trade Lifecycle Search</h2>
      </div>
      <p className="text-white mb-6">
        Search trades using specific filters. Find trades by ID, counterparty,
        date range, and more.
      </p>

      <div className="flex gap-3">
        <div className="flex-1 relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-black/50 z-10" />
          <Input
            ref={inputRef}
            placeholder="Search by trade ID, counterparty, product type..."
            className="pl-10 bg-white h-12 text-black"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            onFocus={() => setShowDropdown(true)}
          />
          
          {/* Recent Searches Dropdown */}
          {showDropdown && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between p-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-black/75 text-sm font-medium">
                  <Clock className="size-4" />
                  Recent Searches
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAllSearches}
                  className="h-auto py-1 px-2 text-xs text-black/50 hover:text-red-600"
                >
                  Clear All
                </Button>
              </div>
              <div className="py-1">
                {recentSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 group"
                  >
                    <button
                      className="flex-1 flex items-start gap-3 text-left min-w-0"
                      onClick={() => handleSearchClick(search.query)}
                    >
                      <Search className="size-4 text-black/50 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-black text-sm break-words line-clamp-2">{search.query}</div>
                        <div className="text-xs text-black/50 mt-0.5">
                          {formatTimestamp(search.timestamp)}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSearch(search.queryId, search.query);
                      }}
                      className="p-1 hover:bg-amber-100 rounded text-amber-600 shrink-0"
                      title="Save query"
                    >
                      <Star className="size-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSearch(search.id);
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-black/50 hover:text-red-600 shrink-0"
                      title="Delete search"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={onSearch}
          disabled={searching}
          className="bg-white text-black hover:bg-[#002B51] hover:text-white h-12 px-6"
        >
          {searching ? "Searching..." : "Search"}
        </Button>
        <Button
          onClick={onToggleFilters}
          className="bg-white text-black hover:bg-[#002B51] hover:text-white h-12 px-6"
        >
          <Filter className="size-4 mr-2" />
          Manual Search
        </Button>
        <Button
          onClick={onToggleSavedQueries}
          className="bg-white text-black hover:bg-[#002B51] hover:text-white h-12 px-6"
        >
          <Bookmark className="size-4 mr-2" />
          Saved Queries
        </Button>
      </div>
    </div>
  );
}
