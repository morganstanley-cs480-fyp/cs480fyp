// The gradient search header with natural language search input

import { Search, Sparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchHeaderProps {
  searchQuery: string;
  searching: boolean;
  showFilters: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
}

export function SearchHeader({
  searchQuery,
  searching,
  onSearchQueryChange,
  onSearch,
  onToggleFilters,
}: SearchHeaderProps) {
  return (
    <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-6" />
        <h2>Advanced Trade Lifecycle Search</h2>
      </div>
      <p className="text-blue-100 mb-6">
        Search trades using specific filters. Find trades by ID, counterparty,
        date range, and more.
      </p>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
          <Input
            placeholder="Search by trade ID, counterparty, product type..."
            className="pl-10 bg-white h-12 text-slate-900"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>
        <Button
          onClick={onSearch}
          disabled={searching}
          className="bg-white text-blue-700 hover:bg-blue-50 h-12 px-6"
        >
          {searching ? "Searching..." : "Search"}
        </Button>
        <Button
          variant="outline"
          onClick={onToggleFilters}
          className="bg-transparent border-white text-white hover:bg-blue-600 h-12 px-6"
        >
          <Filter className="size-4 mr-2" />
          Manual Search
        </Button>
      </div>
    </div>
  );
}
