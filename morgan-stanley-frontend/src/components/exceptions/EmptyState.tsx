// Empty state component when no results come up from filtering

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center text-black/50">
          <Search className="size-12 mx-auto mb-3" />
          <p className="text-lg mb-2">No exceptions found</p>
          <p className="text-sm">Adjust your filters to see more results</p>
        </div>
      </CardContent>
    </Card>
  );
}
