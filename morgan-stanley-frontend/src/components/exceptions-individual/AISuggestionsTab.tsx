// AI suggestions list showing AISuggestionCard components (in Select Existing Solution)

import { Loader2 } from "lucide-react";
import { AISuggestionCard  } from "./AISuggestionCard";
import type { AISuggestion } from "@/lib/api/types";

interface AISuggestionsTabProps {
  aiSearching: boolean;
  aiSuggestions: AISuggestion[];
  filteredSuggestions: AISuggestion[];
  onSuggestionClick: (suggestion: AISuggestion) => void;
  selectedSuggestion: AISuggestion | null;
  loadingSolutionId: string | null;
}

export function AISuggestionsTab({
  aiSearching,
  aiSuggestions,
  filteredSuggestions,
  onSuggestionClick,
  selectedSuggestion,
  loadingSolutionId
}: AISuggestionsTabProps) {
  return (
    <div className="space-y-4">
      {aiSuggestions.length > 0 && (
        <div className="space-y-3">
          {filteredSuggestions.map((suggestion) => (
            <AISuggestionCard
              key={suggestion.exception_id}
              suggestion={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              isSelected={selectedSuggestion?.exception_id === suggestion.exception_id}
              isLoadingSolution={loadingSolutionId === suggestion.exception_id}
            />
          ))}
        </div>
      )}

      {aiSearching && (
        <div className="text-center py-8">
          <Loader2 className="size-8 mx-auto mb-3 animate-spin text-[#002B51]" />
          <p className="text-sm text-black/75">
            AI is analyzing the exception...
          </p>
        </div>
      )}
    </div>
  );
}
