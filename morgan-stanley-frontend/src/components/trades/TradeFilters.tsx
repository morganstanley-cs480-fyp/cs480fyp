// Manual search filter panel with date range, trade attributes, and status filters

import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DateRangeFilter } from "./DateRangeFilter";
import { TradeAttributesFilters } from "./TradeAttributesFilters";
import { FilterOptions } from "./FilterOptions";

export interface ManualSearchFilters {
  trade_id: string;
  account: string;
  asset_type: string;
  booking_system: string;
  affirmation_system: string;
  clearing_house: string;
  status: string[];
  date_type: 'create_time' | 'update_time';
  date_from: string;
  date_to: string;
  with_exceptions_only: boolean;
  cleared_trades_only: boolean;
}

interface TradeFiltersProps {
  filters: ManualSearchFilters;
  searching: boolean;
  onFiltersChange: (filters: ManualSearchFilters) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  getUniqueAccounts: () => string[];
  getUniqueAssetTypes: () => string[];
  getUniqueBookingSystems: () => string[];
  getUniqueAffirmationSystems: () => string[];
  getUniqueClearingHouses: () => string[];
  getUniqueStatuses: () => string[];
}

export function TradeFilters({
  filters,
  searching,
  onFiltersChange,
  onSearch,
  onClearFilters,
  getUniqueAccounts,
  getUniqueAssetTypes,
  getUniqueBookingSystems,
  getUniqueAffirmationSystems,
  getUniqueClearingHouses,
  getUniqueStatuses,
}: TradeFiltersProps) {
  const setQuickDateRange = (range: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    const newFilters = { ...filters };
    newFilters.date_to = formatDate(today);
    
    switch(range) {
      case 'today':
        newFilters.date_from = formatDate(today);
        break;
      case '3days':
        newFilters.date_from = formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000));
        break;
      case '1week':
        newFilters.date_from = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case '2weeks':
        newFilters.date_from = formatDate(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000));
        break;
      case '1month':
        newFilters.date_from = formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
    }
    
    onFiltersChange(newFilters);
  };

  return (
    <Card className="border-black/8">
      <CardHeader className="pb-3 border-b border-black/6">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-black">
          <SlidersHorizontal className="size-4 text-[#002B51]" />
          Advanced Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DateRangeFilter
          dateType={filters.date_type}
          dateFrom={filters.date_from}
          dateTo={filters.date_to}
          onDateTypeChange={(type) => onFiltersChange({ ...filters, date_type: type })}
          onDateFromChange={(date) => onFiltersChange({ ...filters, date_from: date })}
          onDateToChange={(date) => onFiltersChange({ ...filters, date_to: date })}
          onQuickDateRange={setQuickDateRange}
        />

        <TradeAttributesFilters
          tradeId={filters.trade_id}
          account={filters.account}
          assetType={filters.asset_type}
          bookingSystem={filters.booking_system}
          affirmationSystem={filters.affirmation_system}
          clearingHouse={filters.clearing_house}
          status={filters.status}
          onTradeIdChange={(value) => onFiltersChange({ ...filters, trade_id: value })}
          onAccountChange={(value) => onFiltersChange({ ...filters, account: value })}
          onAssetTypeChange={(value) => onFiltersChange({ ...filters, asset_type: value })}
          onBookingSystemChange={(value) => onFiltersChange({ ...filters, booking_system: value })}
          onAffirmationSystemChange={(value) => onFiltersChange({ ...filters, affirmation_system: value })}
          onClearingHouseChange={(value) => onFiltersChange({ ...filters, clearing_house: value })}
          onStatusChange={(status) => onFiltersChange({ ...filters, status })}
          getUniqueAccounts={getUniqueAccounts}
          getUniqueAssetTypes={getUniqueAssetTypes}
          getUniqueBookingSystems={getUniqueBookingSystems}
          getUniqueAffirmationSystems={getUniqueAffirmationSystems}
          getUniqueClearingHouses={getUniqueClearingHouses}
          getUniqueStatuses={getUniqueStatuses}
        />

        <Separator className="bg-black/6" />

        <FilterOptions
          withExceptionsOnly={filters.with_exceptions_only}
          clearedTradesOnly={filters.cleared_trades_only}
          searching={searching}
          onWithExceptionsChange={(checked) => onFiltersChange({ ...filters, with_exceptions_only: checked })}
          onClearedTradesChange={(checked) => onFiltersChange({ ...filters, cleared_trades_only: checked })}
          onClearFilters={onClearFilters}
          onSearch={onSearch}
        />
      </CardContent>
    </Card>
  );
}
