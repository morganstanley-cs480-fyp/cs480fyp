import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterOptionsProps {
  withExceptionsOnly: boolean;
  clearedTradesOnly: boolean;
  searching: boolean;
  onWithExceptionsChange: (checked: boolean) => void;
  onClearedTradesChange: (checked: boolean) => void;
  onClearFilters: () => void;
  onSearch: () => void;
}

export function FilterOptions({
  withExceptionsOnly,
  clearedTradesOnly,
  searching,
  onWithExceptionsChange,
  onClearedTradesChange,
  onClearFilters,
  onSearch,
}: FilterOptionsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={withExceptionsOnly}
            onCheckedChange={(checked) => onWithExceptionsChange(checked as boolean)}
          />
          <span className="text-sm">With Exceptions Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={clearedTradesOnly}
            onCheckedChange={(checked) => onClearedTradesChange(checked as boolean)}
          />
          <span className="text-sm">Cleared Trades Only</span>
        </label>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClearFilters}>
          Clear All Filters
        </Button>
        <Button onClick={onSearch} disabled={searching} className="hover:bg-[#002B51] hover:text-white">
          {searching ? 'Searching...' : 'Search Now'}
        </Button>
      </div>
    </div>
  );
}
