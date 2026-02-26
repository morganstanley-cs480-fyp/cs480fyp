// Empty state component when no results come up from filtering

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="border-black/8">
      <CardContent className="py-16">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-black/4 flex items-center justify-center mx-auto mb-4">
            <Search className="size-6 text-black/25" />
          </div>
          <p className="text-sm font-medium text-black/60 mb-1">No exceptions found</p>
          <p className="text-xs text-black/40">Adjust your filters to see more results</p>
        </div>
      </CardContent>
    </Card>
  );
}
