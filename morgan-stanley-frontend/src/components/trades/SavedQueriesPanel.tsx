// Saved Queries Panel - displays saved/bookmarked queries in a full-width box

import { Star, Trash2, Clock } from "lucide-react";
import type { QueryHistory } from "@/lib/api/types";

interface SavedQueriesPanelProps {
  savedQueries: QueryHistory[];
  onSelectQuery: (queryText: string) => void;
  onDeleteQuery: (queryId: number) => void;
}

export function SavedQueriesPanel({
  savedQueries,
  onSelectQuery,
  onDeleteQuery,
}: SavedQueriesPanelProps) {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (savedQueries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
        <Star className="size-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-slate-700 font-medium text-lg mb-2">No Saved Queries</h3>
        <p className="text-sm text-slate-500">
          Save frequently used searches by clicking the star icon in your recent
          searches.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-black/75 text-base font-medium">
          <Star className="size-5 fill-amber-400 text-amber-400" />
          Saved Queries ({savedQueries.length})
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {savedQueries.map((query) => (
          <div
            key={query.query_id}
            className="relative group"
          >
            <button
              onClick={() => onSelectQuery(query.query_text)}
              className="w-full flex flex-col gap-2 p-4 border border-slate-200 rounded-lg hover:border-[#002B51] hover:shadow-md transition-all bg-white text-left"
            >
              <div className="flex items-start gap-2">
                <Star className="size-4 fill-amber-400 text-amber-400 shrink-0 mt-0.5" />
                <h4 className="text-sm font-medium text-black break-words">
                  {query.query_name || "Untitled Query"}
                </h4>
              </div>
              <p className="text-xs text-black/70 line-clamp-2 break-words">
                {query.query_text}
              </p>
              <div className="flex items-center gap-1 text-xs text-black/50 mt-auto">
                <Clock className="size-3" />
                Last used {formatTimestamp(query.last_use_time)}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteQuery(query.query_id);
              }}
              className="absolute top-2 right-2 p-1.5 bg-white hover:bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 text-black/50 hover:text-white"
              title="Delete query"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
