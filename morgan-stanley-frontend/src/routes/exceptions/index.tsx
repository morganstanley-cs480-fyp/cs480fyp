import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle, XCircle, Clock, Eye, Check, ChevronLeft, ChevronRight, AlertCircle, Search, ArrowUpDown, Filter } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Exception {
  id: string;
  event: string;
  status: 'PENDING' | 'CLOSED';
  exceptionMsg: string;
  exceptionTime: string;
  comments: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  updateTime: string;
}

interface Solution {
  id: string;
  title: string;
  exceptionDescription: string;
  referenceEvent: string;
  solutionDescription: string;
  createTime: string;
  scores: number;
}

const mockExceptions: Exception[] = [
  {
    id: '51253968',
    event: '69690882',
    status: 'PENDING',
    exceptionMsg: 'MISSING BIC',
    exceptionTime: '2025-08-15 10:23:45',
    comments: 'NO BIC',
    priority: 'HIGH',
    updateTime: '2025-08-15 10:25:12',
  },
  {
    id: '50155689',
    event: '48712564',
    status: 'PENDING',
    exceptionMsg: 'INSUFFICIENT MARGIN',
    exceptionTime: '2025-09-03 14:12:33',
    comments: 'RETRY LIMIT EXCEEDED',
    priority: 'HIGH',
    updateTime: '2025-09-03 15:41:22',
  },
  {
    id: '62847123',
    event: '67447216',
    status: 'PENDING',
    exceptionMsg: 'MAPPING ISSUE',
    exceptionTime: '2025-09-18 08:45:11',
    comments: 'NO MAPPING FOR BLM',
    priority: 'MEDIUM',
    updateTime: '2025-09-18 09:12:05',
  },
  {
    id: '73921456',
    event: '67515456',
    status: 'PENDING',
    exceptionMsg: 'TIME OUT OF RANGE',
    exceptionTime: '2025-10-02 16:33:27',
    comments: 'RETRY LIMIT EXCEEDED',
    priority: 'LOW',
    updateTime: '2025-10-02 17:02:18',
  },
  {
    id: '84562390',
    event: '69755320',
    status: 'PENDING',
    exceptionMsg: 'MAPPING ISSUE',
    exceptionTime: '2025-10-14 11:22:08',
    comments: 'NO MAPPING FOR MARC',
    priority: 'MEDIUM',
    updateTime: '2025-10-14 12:15:33',
  },
  {
    id: '95678123',
    event: '71234567',
    status: 'PENDING',
    exceptionMsg: 'DATA VALIDATION ERROR',
    exceptionTime: '2025-10-20 14:30:22',
    comments: 'INVALID FORMAT',
    priority: 'LOW',
    updateTime: '2025-10-20 15:10:45',
  },
  {
    id: '91234567',
    event: '17194044',
    status: 'CLOSED',
    exceptionMsg: 'MISSING BIC',
    exceptionTime: '2025-08-22 09:15:42',
    comments: 'NO BIC',
    priority: 'HIGH',
    updateTime: '2025-08-23 10:30:15',
  },
  {
    id: '82345678',
    event: '60724962',
    status: 'CLOSED',
    exceptionMsg: 'INSUFFICIENT MARGIN',
    exceptionTime: '2025-09-10 13:45:20',
    comments: 'RETRY LIMIT EXCEEDED',
    priority: 'MEDIUM',
    updateTime: '2025-09-11 08:22:44',
  },
];

export const Route = createFileRoute('/exceptions/')({
  component: ExceptionsPage,
})

function ExceptionsPage() {
  const navigate = useNavigate();
  const [exceptions, setExceptions] = useState<Exception[]>(mockExceptions);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Exception[]>(mockExceptions.filter(e => e.status === 'PENDING'));
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'HIGH') return <AlertTriangle className="size-4 text-red-600" />;
    if (priority === 'MEDIUM') return <AlertCircle className="size-4 text-orange-600" />;
    return <Clock className="size-4 text-yellow-600" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'CLOSED' ? 'default' : 'secondary';
  };

  const columns: ColumnDef<Exception>[] = [
    {
      accessorKey: 'id',
      header: 'Exception ID',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">{row.getValue('id')}</div>
      ),
    },
    {
      accessorKey: 'event',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 p-0 hover:bg-transparent"
          >
            Event Reference
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: 'exceptionMsg',
      header: 'Exception Type',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('exceptionMsg')}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as string;
        return (
          <div className="flex items-center gap-2">
            {getPriorityIcon(priority)}
            <Badge variant={getPriorityColor(priority)}>
              {priority}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'comments',
      header: 'Comments',
      cell: ({ row }) => (
        <div className="text-sm text-slate-600">{row.getValue('comments')}</div>
      ),
    },
    {
      accessorKey: 'exceptionTime',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 p-0 hover:bg-transparent"
          >
            Exception Time
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
    setSearching(true);
    
    // Simulate search with filters
    setTimeout(() => {
      let filtered = [...exceptions];
      
      // Apply status filter
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter(exc => exc.status === statusFilter);
      }
      
      // Apply priority filter
      if (priorityFilter !== 'ALL') {
        filtered = filtered.filter(exc => exc.priority === priorityFilter);
      }
      
      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(exc => 
          exc.id.toLowerCase().includes(query) ||
          exc.event.toLowerCase().includes(query) ||
          exc.exceptionMsg.toLowerCase().includes(query) ||
          exc.comments.toLowerCase().includes(query)
        );
      }
      
      setResults(filtered);
      setSearching(false);
    }, 500);
  };

  const stats = {
    total: exceptions.filter(e => e.status === 'PENDING').length,
    high: exceptions.filter(e => e.status === 'PENDING' && e.priority === 'HIGH').length,
    medium: exceptions.filter(e => e.status === 'PENDING' && e.priority === 'MEDIUM').length,
    low: exceptions.filter(e => e.status === 'PENDING' && e.priority === 'LOW').length,
    closed: exceptions.filter(e => e.status === 'CLOSED').length,
  };

  return (
    <div className="p-6 max-w-[90vw] mx-auto space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{stats.high}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Medium Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-orange-600">{stats.medium}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Low Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-yellow-600">{stats.low}</div>
          </CardContent>
        </Card>
        

      </div>

      {/* Filters */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Advanced Filters</CardTitle>
                <CardDescription>Refine your exception search</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setSearchQuery('');
                setResults(exceptions.filter(e => e.status === 'PENDING'));
                setColumnFilters([]);
              }}>
                Clear All Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div>
                <Label className="text-xs text-slate-600 mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => {
                  setStatusFilter(v);
                  handleSearch();
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-xs text-slate-600 mb-2 block">Priority</Label>
                <Select value={priorityFilter} onValueChange={(v: any) => {
                  setPriorityFilter(v);
                  handleSearch();
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="size-4 mr-2" />
                      Column Visibility
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
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
                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
            </div>
          </CardContent>
        </Card>
      )}
      

      {/* Results Table */}
      {results.length > 0 && (
        <div className={selectedException ? "grid grid-cols-3 gap-6" : ""}>
          <div className={selectedException ? "col-span-2" : ""}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exception Results</CardTitle>
                    <CardDescription>
                      Found {results.length} exception{results.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                            data-state={row.getIsSelected() && 'selected'}
                            className={`cursor-pointer ${
                              selectedException?.id === row.original.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedException(row.original)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            No results found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-600">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      results.length
                    )}{' '}
                    of {results.length} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exception Details Panel */}
          {selectedException && (
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Exception Details</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedException(null)}
                      className="h-8 w-8 p-0"
                    >
                      <XCircle className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception ID</p>
                      <p className="text-slate-900">{selectedException.id}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Event Reference</p>
                      <p className="text-slate-900">{selectedException.event}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception Type</p>
                      <p className="text-slate-900">{selectedException.exceptionMsg}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Priority</p>
                      <Badge variant={getPriorityColor(selectedException.priority)}>
                        {selectedException.priority}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Comments</p>
                      <p className="text-sm text-slate-900">{selectedException.comments}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Exception Time</p>
                      <p className="text-sm text-slate-900">{selectedException.exceptionTime}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-600 mb-1">Last Update</p>
                      <p className="text-sm text-slate-900">{selectedException.updateTime}</p>
                    </div>
                    
                    <Separator />
                    
                    {selectedException.status === 'PENDING' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full mb-2"
                          onClick={() => console.log('View transaction:', selectedException.event)}
                        >
                          <Eye className="size-4 mr-2" />
                          View Associated Transaction
                        </Button>
                        <Button 
                          className="w-full"
                          onClick={() => console.log('Resolve exception:', selectedException.id)}
                        >
                          <Check className="size-4 mr-2" />
                          Resolve Exception
                        </Button>
                      </>
                    )}
                    
                    {selectedException.status === 'CLOSED' && (
                      <Badge className="w-full justify-center py-2" variant="default">
                        <CheckCircle className="size-4 mr-2" />
                        Closed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !searching && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <Search className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">No exceptions found</p>
              <p className="text-sm">Adjust your filters to see more results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}