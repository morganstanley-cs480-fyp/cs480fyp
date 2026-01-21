// Manual search filter panel with date range, trade attributes, and status filters

import { Filter, Building2, DollarSign, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

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
        {/* DATE RANGE SECTION */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-4">
            <Label className="font-semibold text-base">Date Range</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  checked={filters.dateType === 'update_time'}
                  onChange={() => onFiltersChange({ ...filters, dateType: 'update_time' })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Update Date</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateType"
                  checked={filters.dateType === 'create_time'}
                  onChange={() => onFiltersChange({ ...filters, dateType: 'create_time' })}
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
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('today')}
              className="h-8"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('3days')}
              className="h-8"
            >
              3 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('1week')}
              className="h-8"
            >
              1 Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('2weeks')}
              className="h-8"
            >
              2 Weeks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('1month')}
              className="h-8"
            >
              1 Month
            </Button>
          </div>
        </div>

        {/* TRADE ATTRIBUTES SECTION */}
        <div className="space-y-4">
          <Label className="font-semibold text-base">Trade Attributes</Label>
          
          {/* Filter Fields - Four Columns Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Row 1 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Tag className="size-4" />
                Trade ID
              </Label>
              <Input
                placeholder="Enter trade ID..."
                value={filters.tradeId}
                onChange={(e) => onFiltersChange({ ...filters, tradeId: e.target.value })}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Building2 className="size-4" />
                Account
              </Label>
              <Select
                value={filters.account}
                onValueChange={(value) => onFiltersChange({ ...filters, account: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {getUniqueAccounts().map(account => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Booking System</Label>
              <Select
                value={filters.bookingSystem}
                onValueChange={(value) => onFiltersChange({ ...filters, bookingSystem: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {getUniqueBookingSystems().map(system => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Affirmation System</Label>
              <Select
                value={filters.affirmationSystem}
                onValueChange={(value) => onFiltersChange({ ...filters, affirmationSystem: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {getUniqueAffirmationSystems().map(system => (
                    <SelectItem key={system} value={system}>
                      {system}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <DollarSign className="size-4" />
                Asset Type
              </Label>
              <Select
                value={filters.assetType}
                onValueChange={(value) => onFiltersChange({ ...filters, assetType: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select asset type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Types</SelectItem>
                  {getUniqueAssetTypes().map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Clearing House</Label>
              <Select
                value={filters.clearingHouse}
                onValueChange={(value) => onFiltersChange({ ...filters, clearingHouse: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clearing Houses</SelectItem>
                  {getUniqueClearingHouses().map(house => (
                    <SelectItem key={house} value={house}>
                      {house}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3 - Status spanning 2 columns */}
            <div className="col-span-2 space-y-2">
              <Label className="text-sm">Trade Status (Multi-select)</Label>
              <div className="border rounded-md p-3 bg-white">
                <div className="grid grid-cols-2 gap-2">
                  {getUniqueStatuses().map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.status.includes(status)}
                        onCheckedChange={(checked) => {
                          const newStatus = checked
                            ? [...filters.status, status]
                            : filters.status.filter(s => s !== status);
                          onFiltersChange({ ...filters, status: newStatus });
                        }}
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* BOTTOM OPTIONS */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.withExceptionsOnly}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, withExceptionsOnly: checked as boolean })
                }
              />
              <span className="text-sm">With Exceptions Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.clearedTradesOnly}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...filters, clearedTradesOnly: checked as boolean })
                }
              />
              <span className="text-sm">Cleared Trades Only</span>
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClearFilters}>
              Clear All Filters
            </Button>
            <Button onClick={onSearch} disabled={searching}>
              {searching ? 'Searching...' : 'Search Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
