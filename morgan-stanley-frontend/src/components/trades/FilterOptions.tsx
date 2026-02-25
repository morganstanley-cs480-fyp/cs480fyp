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
            className="border-black/20 data-[state=checked]:bg-[#002B51] data-[state=checked]:border-[#002B51]"
          />
          <span className="text-sm text-black/75">With Exceptions Only</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={clearedTradesOnly}
            onCheckedChange={(checked) => onClearedTradesChange(checked as boolean)}
            className="border-black/20 data-[state=checked]:bg-[#002B51] data-[state=checked]:border-[#002B51]"
          />
          <span className="text-sm text-black/75">Cleared Trades Only</span>
        </label>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClearFilters} className="text-sm border-black/15 text-black/60 hover:border-[#002B51] hover:text-[#002B51]">
          Clear All Filters
        </Button>
        <Button onClick={onSearch} disabled={searching} className="text-sm bg-[#002B51] text-white hover:bg-[#003a6b]">
          {searching ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </div>
  );
}
