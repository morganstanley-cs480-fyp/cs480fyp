// Filter controls for Exceptions Table

import { Filter } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Table as TableType } from "@tanstack/react-table";
import type { Exception } from "@/lib/api/types";

interface ExceptionFiltersProps {
  table: TableType<Exception>;
  onClearFilters: () => void;
}

export function ExceptionFilters({
  table,
  onClearFilters,
}: ExceptionFiltersProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3 px-5">
        <span className="text-xs font-semibold text-black/50 uppercase tracking-wider mr-1">Filters</span>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-8 text-xs border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
        >
          Clear All
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
            >
              <Filter className="size-3 mr-1.5" />
              Column Visibility
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                className="capitalize text-xs"
                checked={col.getIsVisible()}
                onCheckedChange={(value) => col.toggleVisibility(!!value)}
                onSelect={(e) => e.preventDefault()}
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
