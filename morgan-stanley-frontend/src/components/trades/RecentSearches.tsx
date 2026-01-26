// Recent search history display with timestamps (search history not implemented yet)

import { Clock, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

interface RecentSearchesProps {
  searches: RecentSearch[];
  onSearchClick: (query: string) => void;
  onDeleteSearch: (id: string) => void;
  onClearAll: () => void;
}

export function RecentSearches({
  searches,
  onSearchClick,
  onDeleteSearch,
  onClearAll,
}: RecentSearchesProps) {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          Recent Searches
        </CardTitle>
        {searches.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="size-12 mx-auto mb-3 text-slate-300" />
            <p>No recent searches yet</p>
            <p className="text-sm mt-1 text-red-700">
              Your search history will appear here. NOTE JUST A PLACEHODLER
              NOT IMPLEMENETED YET
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {searches.map((search) => (
              <div
                key={search.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <Button
                  variant="ghost"
                  className="flex-1 justify-start h-auto py-2 px-3 hover:bg-transparent"
                  onClick={() => onSearchClick(search.query)}
                >
                  <Search className="size-4 mr-3 text-slate-400 shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-slate-900">{search.query}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatTimestamp(search.timestamp)}
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSearch(search.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
