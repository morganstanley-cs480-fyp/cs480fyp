import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { Search, Sparkles, Filter, Download, Calendar, Building2, DollarSign, Tag, ArrowUpDown, ChevronDown, X, Clock, Trash2 } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

import type {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from '@tanstack/react-table';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockSearchResults = [
  {
    id: '69690882',
    account: 'ACC084',
    assetType: 'CDS',
    bookingSystem: 'HIGHGARDEN',
    affirmationSystem: 'TRAI',
    clearingHouse: 'LCH',
    createTime: '2025-01-06 10:33:00',
    updateTime: '2025-09-17 06:13:44',
    status: 'ALLEGED',
  },
  {
    id: '48712564',
    account: 'ACC054',
    assetType: 'CDS',
    bookingSystem: 'KINGSLANDING',
    affirmationSystem: 'MARC',
    clearingHouse: 'CME',
    createTime: '2025-05-04 09:45:44',
    updateTime: '2025-09-22 21:34:55',
    status: 'ALLEGED',
  },
  {
    id: '67447216',
    account: 'ACC071',
    assetType: 'CDS',
    bookingSystem: 'WINTERFELL',
    affirmationSystem: 'FIRELINK',
    clearingHouse: 'OTCCHK',
    createTime: '2025-02-05 03:01:52',
    updateTime: '2025-08-10 14:53:23',
    status: 'ALLEGED',
  },
  {
    id: '67515456',
    account: 'ACC046',
    assetType: 'CDS',
    bookingSystem: 'KINGSLANDING',
    affirmationSystem: 'BLM',
    clearingHouse: 'CME',
    createTime: '2025-04-03 02:22:13',
    updateTime: '2025-09-20 19:30:02',
    status: 'ALLEGED',
  },
  {
    id: '69755320',
    account: 'ACC045',
    assetType: 'CDS',
    bookingSystem: 'WINTERFELL',
    affirmationSystem: 'FIRELINK',
    clearingHouse: 'LCH',
    createTime: '2025-06-09 04:32:02',
    updateTime: '2025-09-07 08:09:03',
    status: 'ALLEGED',
  },
  {
    id: '17194044',
    account: 'ACC040',
    assetType: 'IRS',
    bookingSystem: 'KINGSLANDING',
    affirmationSystem: 'MARC',
    clearingHouse: 'LCH',
    createTime: '2025-06-20 11:44:53',
    updateTime: '2025-08-19 19:46:50',
    status: 'REJECTED',
  },
  {
    id: '60724962',
    account: 'ACC023',
    assetType: 'IRS',
    bookingSystem: 'RED KEEP',
    affirmationSystem: 'BLM',
    clearingHouse: 'OTCCHK',
    createTime: '2025-06-11 02:27:23',
    updateTime: '2025-10-19 12:18:51',
    status: 'REJECTED',
  },
  {
    id: '35821903',
    account: 'ACC133',
    assetType: 'FX',
    bookingSystem: 'HIGHGARDEN',
    affirmationSystem: 'TRAI',
    clearingHouse: 'ISCC',
    createTime: '2025-03-15 08:15:22',
    updateTime: '2025-08-25 16:42:11',
    status: 'CLEARED',
  },
  {
    id: '42198745',
    account: 'ACC0466',
    assetType: 'IRS',
    bookingSystem: 'WINTERFELL',
    affirmationSystem: 'FIRELINK',
    clearingHouse: 'CME',
    createTime: '2025-02-28 14:20:45',
    updateTime: '2025-09-05 10:33:18',
    status: 'CLEARED',
  },
  {
    id: '58392014',
    account: 'ACC0982',
    assetType: 'CDS',
    bookingSystem: 'RED KEEP',
    affirmationSystem: 'MARC',
    clearingHouse: 'LCH',
    createTime: '2025-07-12 18:55:30',
    updateTime: '2025-10-02 22:14:05',
    status: 'CANCELLED',
  },
];

type TradeResult = typeof mockSearchResults[0];

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

export const Route = createFileRoute('/trades/')({
  component: TradeSearchPage,
})

function TradeSearchPage() {
  const navigate = useNavigate();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TradeResult[]>(mockSearchResults);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

const columns: ColumnDef<TradeResult>[] = [
  {
    accessorKey: 'id',
    header: 'Trade ID',
    cell: ({ row }) => (
      <div className="font-medium text-slate-900">{row.getValue('id')}</div>
    ),
  },
  {
    accessorKey: 'account',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Account
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'assetType',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Asset Type
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue('assetType')}</div>
    ),
  },
  {
    accessorKey: 'bookingSystem',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Booking System
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'affirmationSystem',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Affirmation System
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'clearingHouse',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Clearing House
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'createTime',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Create Time
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'updateTime',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 p-0 hover:bg-transparent"
        >
          Update Time
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = status === 'CLEARED' ? 'default' : 'secondary';
      return <Badge variant={variant}>{status}</Badge>;
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

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    // Simulate search
    setTimeout(() => {
      setResults(mockSearchResults);
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
      setResults(mockSearchResults);
      setSearching(false);
    }, 800);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-6" />
          <h2>Advanced Trade Lifecycle Search</h2>
        </div>
        <p className="text-blue-100 mb-6">
          Search trades using specific filters. Find trades by ID, counterparty, date range, and more.
        </p>
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <Input
              placeholder='Search by trade ID, counterparty, product type...'
              className="pl-10 bg-white h-12 text-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={searching} className="bg-white text-blue-700 hover:bg-blue-50 h-12 px-6">
            {searching ? 'Searching...' : 'Search'}
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
              Manual Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="size-4" />
                  Trade ID
                </Label>
                <Input placeholder="TRD-2024-xxxxx" />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="size-4" />
                  Counterparty
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select counterparty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gs">Goldman Sachs</SelectItem>
                    <SelectItem value="jpm">JP Morgan</SelectItem>
                    <SelectItem value="barc">Barclays</SelectItem>
                    <SelectItem value="citi">Citi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Product Type
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="irs">Interest Rate Swap</SelectItem>
                    <SelectItem value="cds">Credit Default Swap</SelectItem>
                    <SelectItem value="fx">FX Derivative</SelectItem>
                    <SelectItem value="eq">Equity Derivative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  Date Range
                </Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center">
              <Button variant="ghost">Clear All Filters</Button>
              <Button onClick={handleSearch}>Search with Filters</Button>
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
              <p className="text-sm text-slate-500 mt-1">Found {results.length} matching trades</p>
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
                            value={(header.column.getFilterValue() as string) ?? ''}
                            onChange={(event) => header.column.setFilterValue(event.target.value)}
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
                        onClick={() => console.log('Navigate to trade:', row.original.id)}
                        className="cursor-pointer hover:bg-blue-50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
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
                Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} result(s)
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
              <p className="text-sm mt-1">Your search history will appear here</p>
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
                      setRecentSearches((prev) => prev.filter((s) => s.id !== search.id));
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