// Manual search filter panel with date range, trade attributes, and status filters

import { Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DateRangeFilter } from "./DateRangeFilter";
import { TradeAttributesFilters } from "./TradeAttributesFilters";
import { FilterOptions } from "./FilterOptions";

export interface ManualSearchFilters {
  tradeId: string;
  account: string;
  assetType: string;
  bookingSystem: string;
  affirmationSystem: string;
  clearingHouse: string;
  status: string[];
  dateType: 'create_time' | 'update_time';
  dateFrom: string;
  dateTo: string;
  withExceptionsOnly: boolean;
  clearedTradesOnly: boolean;
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
    newFilters.dateTo = formatDate(today);
    
    switch(range) {
      case 'today':
        newFilters.dateFrom = formatDate(today);
        break;
      case '3days':
        newFilters.dateFrom = formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000));
        break;
      case '1week':
        newFilters.dateFrom = formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case '2weeks':
        newFilters.dateFrom = formatDate(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000));
        break;
      case '1month':
        newFilters.dateFrom = formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
    }
    
    onFiltersChange(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="size-5" />
          Advanced Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DateRangeFilter
          dateType={filters.dateType}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateTypeChange={(type) => onFiltersChange({ ...filters, dateType: type })}
          onDateFromChange={(date) => onFiltersChange({ ...filters, dateFrom: date })}
          onDateToChange={(date) => onFiltersChange({ ...filters, dateTo: date })}
          onQuickDateRange={setQuickDateRange}
        />

        <TradeAttributesFilters
          tradeId={filters.tradeId}
          account={filters.account}
          assetType={filters.assetType}
          bookingSystem={filters.bookingSystem}
          affirmationSystem={filters.affirmationSystem}
          clearingHouse={filters.clearingHouse}
          status={filters.status}
          onTradeIdChange={(value) => onFiltersChange({ ...filters, tradeId: value })}
          onAccountChange={(value) => onFiltersChange({ ...filters, account: value })}
          onAssetTypeChange={(value) => onFiltersChange({ ...filters, assetType: value })}
          onBookingSystemChange={(value) => onFiltersChange({ ...filters, bookingSystem: value })}
          onAffirmationSystemChange={(value) => onFiltersChange({ ...filters, affirmationSystem: value })}
          onClearingHouseChange={(value) => onFiltersChange({ ...filters, clearingHouse: value })}
          onStatusChange={(status) => onFiltersChange({ ...filters, status })}
          getUniqueAccounts={getUniqueAccounts}
          getUniqueAssetTypes={getUniqueAssetTypes}
          getUniqueBookingSystems={getUniqueBookingSystems}
          getUniqueAffirmationSystems={getUniqueAffirmationSystems}
          getUniqueClearingHouses={getUniqueClearingHouses}
          getUniqueStatuses={getUniqueStatuses}
        />

        <Separator />

        <FilterOptions
          withExceptionsOnly={filters.withExceptionsOnly}
          clearedTradesOnly={filters.clearedTradesOnly}
          searching={searching}
          onWithExceptionsChange={(checked) => onFiltersChange({ ...filters, withExceptionsOnly: checked })}
          onClearedTradesChange={(checked) => onFiltersChange({ ...filters, clearedTradesOnly: checked })}
          onClearFilters={onClearFilters}
          onSearch={onSearch}
        />
      </CardContent>
    </Card>
  );
}
