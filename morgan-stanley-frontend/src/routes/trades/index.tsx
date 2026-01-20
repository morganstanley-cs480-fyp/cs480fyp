import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Sparkles,
  Filter,
  Calendar,
  Building2,
  DollarSign,
  Tag,
  ArrowUpDown,
  ChevronDown,
  X,
  Clock,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";

import type {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  mockTrades, 
  type Trade,
  getUniqueAssetTypes,
  getUniqueAccounts,
  getUniqueBookingSystems,
  getUniqueAffirmationSystems,
  getUniqueClearingHouses,
  getUniqueStatuses,
} from "@/lib/mockData";
import { Checkbox } from "@/components/ui/checkbox";

// Map Trade type to match component's expected format
// type TradeResult = {
//   id: string;
//   account: string;
//   assetType: string;
//   bookingSystem: string;
//   affirmationSystem: string;
//   clearingHouse: string;
//   createTime: string;
//   updateTime: string;
//   status: string;
// };

// const mockSearchResults: TradeResult[] = mockTrades.map(trade => ({
//   id: trade.trade_id,
//   account: trade.account,
//   assetType: trade.asset_type,
//   bookingSystem: trade.booking_system,
//   affirmationSystem: trade.affirmation_system,
//   clearingHouse: trade.clearing_house,
//   createTime: trade.create_time,
//   updateTime: trade.update_time,
//   status: trade.status,
// }));

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

interface ManualSearchFilters {
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

export const Route = createFileRoute("/trades/")({
  component: TradeSearchPage,
});

function TradeSearchPage() {
  const navigate = useNavigate();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Trade[]>(mockTrades);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Manual search filter state
  const [filters, setFilters] = useState<ManualSearchFilters>({
    tradeId: '',
    account: '',
    assetType: '',
    bookingSystem: '',
    affirmationSystem: '',
    clearingHouse: '',
    status: [],
    dateType: 'update_time',
    dateFrom: '',
    dateTo: '',
    withExceptionsOnly: false,
    clearedTradesOnly: false,
  });

  const columns: ColumnDef<Trade>[] = [
    {
      accessorKey: "trade_id",
      header: "Trade ID",
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 ml-2">
          {row.getValue("trade_id")}
        </div>
      ),
    },
    {
      accessorKey: "account",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Account
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("asset_type")}</div>
      ),
    },
    {
      accessorKey: "asset_type",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Asset Type
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("asset_type")}</div>
      ),
    },
    {
      accessorKey: "booking_system",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Booking System
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("booking_system")}</div>
      ),
    },
    {
      accessorKey: "affirmation_system",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Affirmation System
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("affirmation_system")}</div>
      ),
    },
    {
      accessorKey: "clearing_house",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Clearing House
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("clearing_house")}</div>
      ),
    },
    {
      accessorKey: "create_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Create Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("create_time")}</div>
      ),
    },
    {
      accessorKey: "update_time",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Update Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm ml-2">{row.getValue("update_time")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variant = status === "CLEARED" ? "default" : "secondary";
        return (
          <Badge className="mr-2" variant={variant}>
            {status}
          </Badge>
        );
      },
    },
  ];

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Helper function to set quick date ranges
  const setQuickDateRange = (range: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    setFilters(prev => {
      const newFilters = { ...prev };
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
      
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      tradeId: '',
      account: '',
      assetType: '',
      bookingSystem: '',
      affirmationSystem: '',
      clearingHouse: '',
      status: [],
      dateType: 'update_time',
      dateFrom: '',
      dateTo: '',
      withExceptionsOnly: false,
      clearedTradesOnly: false,
    });
  };

  // Handle manual search with filters
  const handleManualSearch = () => {
    setSearching(true);
    
    setTimeout(() => {
      let filtered = [...mockTrades];
      
      // Apply filters
      if (filters.tradeId) {
        filtered = filtered.filter(t => t.trade_id.includes(filters.tradeId));
      }
      if (filters.account) {
        filtered = filtered.filter(t => t.account === filters.account);
      }
      if (filters.assetType) {
        filtered = filtered.filter(t => t.asset_type === filters.assetType);
      }
      if (filters.bookingSystem) {
        filtered = filtered.filter(t => t.booking_system === filters.bookingSystem);
      }
      if (filters.affirmationSystem) {
        filtered = filtered.filter(t => t.affirmation_system === filters.affirmationSystem);
      }
      if (filters.clearingHouse) {
        filtered = filtered.filter(t => t.clearing_house === filters.clearingHouse);
      }
      if (filters.status.length > 0) {
        filtered = filtered.filter(t => filters.status.includes(t.status));
      }
      if (filters.clearedTradesOnly) {
        filtered = filtered.filter(t => t.status === 'CLEARED');
      }
      
      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        filtered = filtered.filter(t => {
          const tradeDate = new Date(t[filters.dateType]);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date('2000-01-01');
          const toDate = filters.dateTo ? new Date(filters.dateTo) : new Date('2099-12-31');
          return tradeDate >= fromDate && tradeDate <= toDate;
        });
      }
      
      setResults(filtered);
      setSearching(false);
    }, 800);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    // Simulate search
    setTimeout(() => {
      setResults(mockTrades);
      setSearching(false);
      // Add to recent searches
      const newSearch: RecentSearch = {
        id: Date.now().toString(),
        query: searchQuery,
        timestamp: Date.now(),
      };
      setRecentSearches((prev) => [newSearch, ...prev.slice(0, 4)]);
    }, 800);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;

    setSearching(true);
    setTimeout(() => {
      setResults(mockTrades);
      setSearching(false);
    }, 800);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-6" />
          <h2>Advanced Trade Lifecycle Search</h2>
        </div>
        <p className="text-blue-100 mb-6">
          Search trades using specific filters. Find trades by ID, counterparty,
          date range, and more.
        </p>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <Input
              placeholder="Search by trade ID, counterparty, product type..."
              className="pl-10 bg-white h-12 text-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="bg-white text-blue-700 hover:bg-blue-50 h-12 px-6"
          >
            {searching ? "Searching..." : "Search"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-transparent border-white text-white hover:bg-blue-600 h-12 px-6"
          >
            <Filter className="size-4 mr-2" />
            Manual Search
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
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
                      onChange={() => setFilters(prev => ({ ...prev, dateType: 'update_time' }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Update Date</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dateType"
                      checked={filters.dateType === 'create_time'}
                      onChange={() => setFilters(prev => ({ ...prev, dateType: 'create_time' }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
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
                    onChange={(e) => setFilters(prev => ({ ...prev, tradeId: e.target.value }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, account: value }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, bookingSystem: value }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, affirmationSystem: value }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, assetType: value }))}
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
                    onValueChange={(value) => setFilters(prev => ({ ...prev, clearingHouse: value }))}
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
                              setFilters(prev => ({
                                ...prev,
                                status: checked
                                  ? [...prev.status, status]
                                  : prev.status.filter(s => s !== status)
                              }));
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
                      setFilters(prev => ({ ...prev, withExceptionsOnly: checked as boolean }))
                    }
                  />
                  <span className="text-sm">With Exceptions Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.clearedTradesOnly}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, clearedTradesOnly: checked as boolean }))
                    }
                  />
                  <span className="text-sm">Cleared Trades Only</span>
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
                <Button onClick={handleManualSearch} disabled={searching}>
                  {searching ? 'Searching...' : 'Search Now'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Found {results.length} matching trades
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDown className="size-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                          onSelect={(event) => {
                            event.preventDefault();
                          }}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {columnFilters.length > 0 && (
              <div className="flex items-center justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => table.resetColumnFilters()}
                  className="h-9"
                >
                  Clear All Filters
                  <X className="ml-2 size-4" />
                </Button>
              </div>
            )}

            {/* Search bar filters */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {/* Column Headers Row */}
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                  {/* Filter Row */}
                  <TableRow>
                    {table.getHeaderGroups()[0].headers.map((header) => (
                      <TableHead key={`filter-${header.id}`} className="py-2">
                        {header.column.getCanFilter() && (
                          <Input
                            placeholder="Filter..."
                            value={
                              (header.column.getFilterValue() as string) ?? ""
                            }
                            onChange={(event) =>
                              header.column.setFilterValue(event.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="border-t-4 border-slate-100">
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() =>
                          navigate({
                            to: "/trades/$tradeId",
                            params: { tradeId: row.original.trade_id },
                          })
                        }
                        className="cursor-pointer hover:bg-blue-50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-4">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-slate-500">
                Showing {table.getRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} result(s)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Searches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Recent Searches
          </CardTitle>
          {recentSearches.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRecentSearches([])}
              className="text-slate-500 hover:text-slate-700"
            >
              Clear All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentSearches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="size-12 mx-auto mb-3 text-slate-300" />
              <p>No recent searches yet</p>
              <p className="text-sm mt-1 text-red-700">
                Your search history will appear here. NOTE JUST A PLACEHODLER
                NOT IMPLEMENETED YET
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start h-auto py-2 px-3 hover:bg-transparent"
                    onClick={() => handleRecentSearchClick(search.query)}
                  >
                    <Search className="size-4 mr-3 text-slate-400 shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="text-slate-900">{search.query}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatTimestamp(search.timestamp)}
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecentSearches((prev) =>
                        prev.filter((s) => s.id !== search.id)
                      );
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
