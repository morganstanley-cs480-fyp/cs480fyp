import { Building2, DollarSign, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TradeAttributesFiltersProps {
  tradeId: string;
  account: string;
  assetType: string;
  bookingSystem: string;
  affirmationSystem: string;
  clearingHouse: string;
  status: string[];
  onTradeIdChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onAssetTypeChange: (value: string) => void;
  onBookingSystemChange: (value: string) => void;
  onAffirmationSystemChange: (value: string) => void;
  onClearingHouseChange: (value: string) => void;
  onStatusChange: (status: string[]) => void;
  getUniqueAccounts: () => string[];
  getUniqueAssetTypes: () => string[];
  getUniqueBookingSystems: () => string[];
  getUniqueAffirmationSystems: () => string[];
  getUniqueClearingHouses: () => string[];
  getUniqueStatuses: () => string[];
}

export function TradeAttributesFilters({
  tradeId,
  account,
  assetType,
  bookingSystem,
  affirmationSystem,
  clearingHouse,
  status,
  onTradeIdChange,
  onAccountChange,
  onAssetTypeChange,
  onBookingSystemChange,
  onAffirmationSystemChange,
  onClearingHouseChange,
  onStatusChange,
  getUniqueAccounts,
  getUniqueAssetTypes,
  getUniqueBookingSystems,
  getUniqueAffirmationSystems,
  getUniqueClearingHouses,
  getUniqueStatuses,
}: TradeAttributesFiltersProps) {
  return (
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
            value={tradeId}
            onChange={(e) => onTradeIdChange(e.target.value)}
            className="h-9"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Building2 className="size-4" />
            Account
          </Label>
          <Select
            value={account}
            onValueChange={onAccountChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select account..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {getUniqueAccounts().map(acc => (
                <SelectItem key={acc} value={acc}>
                  {acc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm">Booking System</Label>
          <Select
            value={bookingSystem}
            onValueChange={onBookingSystemChange}
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
            value={affirmationSystem}
            onValueChange={onAffirmationSystemChange}
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
            value={assetType}
            onValueChange={onAssetTypeChange}
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
            value={clearingHouse}
            onValueChange={onClearingHouseChange}
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
              {getUniqueStatuses().map(st => (
                <label key={st} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={status.includes(st)}
                    onCheckedChange={(checked) => {
                      const newStatus = checked
                        ? [...status, st]
                        : status.filter(s => s !== st);
                      onStatusChange(newStatus);
                    }}
                  />
                  <span className="text-sm">{st}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
