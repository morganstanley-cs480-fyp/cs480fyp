import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          <Label className="text-sm text-slate-600">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-slate-600">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-9"
          />
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
