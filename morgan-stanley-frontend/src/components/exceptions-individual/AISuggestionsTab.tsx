// AI suggestions list showing AISuggestionCard components (in Select Existing Solution)

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search, Loader2 } from "lucide-react";
import { AISuggestionCard, type AISuggestion } from "./AISuggestionCard";

interface AISuggestionsTabProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  aiSearching: boolean;
  onSearch: () => void;
  aiSuggestions: AISuggestion[];
  filteredSuggestions: AISuggestion[];
  onSuggestionClick: (suggestion: AISuggestion) => void;
}

export function AISuggestionsTab({
  searchQuery,
  onSearchQueryChange,
  aiSearching,
  onSearch,
  aiSuggestions,
  filteredSuggestions,
  onSuggestionClick,
}: AISuggestionsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-purple-600" />
          <h3 className="font-semibold text-black">
            AI-Powered Suggestions
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSearch}
          disabled={aiSearching}
        >
          {aiSearching ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="size-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-black/50" />
        <Input
          placeholder="Search solutions by title, description, solution ID..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {aiSuggestions.length > 0 && (
        <div className="space-y-3">
          {filteredSuggestions.map((suggestion) => (
            <AISuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
            />
          ))}
        </div>
      )}

      {aiSearching && (
        <div className="text-center py-8">
          <Loader2 className="size-8 mx-auto mb-3 animate-spin text-purple-600" />
          <p className="text-sm text-black/75">
            AI is analyzing the exception...
          </p>
        </div>
      )}
    </div>
  );
}
