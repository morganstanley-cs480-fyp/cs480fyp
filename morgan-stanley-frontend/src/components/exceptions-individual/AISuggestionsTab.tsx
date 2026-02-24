// AI suggestions list showing AISuggestionCard components (in Select Existing Solution)

import { Loader2 } from "lucide-react";
import { AISuggestionCard, type AISuggestion } from "./AISuggestionCard";

interface AISuggestionsTabProps {
  aiSearching: boolean;
  aiSuggestions: AISuggestion[];
  filteredSuggestions: AISuggestion[];
  onSuggestionClick: (suggestion: AISuggestion) => void;
  selectedSuggestion: AISuggestion | null;
}

export function AISuggestionsTab({
  aiSearching,
  aiSuggestions,
  filteredSuggestions,
  onSuggestionClick,
  selectedSuggestion,
}: AISuggestionsTabProps) {
  return (
    <div className="space-y-4">
      {aiSuggestions.length > 0 && (
        <div className="space-y-3">
          {filteredSuggestions.map((suggestion) => (
            <AISuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              isSelected={selectedSuggestion?.id === suggestion.id}
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
