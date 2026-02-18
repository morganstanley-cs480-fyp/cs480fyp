import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface DateRangeFilterProps {
  dateType: 'create_time' | 'update_time';
  dateFrom: string;
  dateTo: string;
  onDateTypeChange: (type: 'create_time' | 'update_time') => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onQuickDateRange: (range: string) => void;
}

export function DateRangeFilter({
  dateType,
  dateFrom,
  dateTo,
  onDateTypeChange,
  onDateFromChange,
  onDateToChange,
  onQuickDateRange,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-4">
        <Label className="font-semibold text-base">Date Range</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateType"
              checked={dateType === 'update_time'}
              onChange={() => onDateTypeChange('update_time')}
              className="w-4 h-4"
            />
            <span className="text-sm">Update Date</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateType"
              checked={dateType === 'create_time'}
              onChange={() => onDateTypeChange('create_time')}
              className="w-4 h-4"
            />
            <span className="text-sm">Create Date</span>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-black/75">From</Label>
          <div className="relative">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-9 pr-8"
            />
            {dateFrom && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-black/50 hover:text-red-600"
                onClick={() => onDateFromChange("")}
                title="Clear date"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-black/75">To</Label>
          <div className="relative">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-9 pr-8"
            />
            {dateTo && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-black/50 hover:text-red-600"
                onClick={() => onDateToChange("")}
                title="Clear date"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickDateRange('today')}
          className="h-8"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickDateRange('3days')}
          className="h-8"
        >
          3 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickDateRange('1week')}
          className="h-8"
        >
          1 Week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickDateRange('2weeks')}
          className="h-8"
        >
          2 Weeks
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickDateRange('1month')}
          className="h-8"
        >
          1 Month
        </Button>
      </div>
    </div>
  );
}
