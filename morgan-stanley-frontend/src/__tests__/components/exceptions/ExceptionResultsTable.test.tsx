import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExceptionResultsTable } from '@/components/exceptions/ExceptionResultsTable';
import type { Exception } from '@/lib/api/types';
import type { Table as TableType } from '@tanstack/react-table';

describe('ExceptionResultsTable', () => {
  const mockExceptions: Exception[] = [
    { id: 1, trade_id: 1001, trans_id: 2001, msg: 'Err 1', priority: 'HIGH', comment: '', create_time: '2023-01-01', update_time: '2023-01-01', status: 'PENDING' },
    { id: 2, trade_id: 1002, trans_id: 2002, msg: 'Err 2', priority: 'LOW', comment: '', create_time: '2023-01-02', update_time: '2023-01-02', status: 'CLOSED' },
  ];

  const mockTable = {
    getState: () => ({
      pagination: { pageIndex: 0, pageSize: 10 },
    }),
    getRowModel: () => ({
      rows: mockExceptions.map(ex => ({
        id: String(ex.id),
        original: ex,
        getIsSelected: () => false,
        getVisibleCells: () => [
          { id: `${ex.id}-id`, column: { columnDef: { cell: () => ex.id } }, getContext: () => ({}) },
          { id: `${ex.id}-msg`, column: { columnDef: { cell: () => ex.msg } }, getContext: () => ({}) },
        ],
      })),
    }),
    getPreFilteredRowModel: () => ({
      flatRows: mockExceptions.map(ex => ({ original: ex })),
    }),
    getFilteredRowModel: () => ({
      rows: mockExceptions.map(ex => ({
        getValue: (colId: string) => ex[colId as keyof Exception],
      }))
    }),
    getHeaderGroups: () => [
      {
        id: 'header-group-1',
        headers: [
          { 
            id: 'id', 
            isPlaceholder: false, 
            column: { 
              id: 'id',
              columnDef: { header: () => 'ID' },
              getCanFilter: () => true,
              getFilterValue: () => '',
              setFilterValue: vi.fn(),
            },
            getContext: () => ({})
          },
          { 
            id: 'status', 
            isPlaceholder: false, 
            column: { 
              id: 'status',
              columnDef: { header: () => 'Status' },
              getCanFilter: () => true,
              getFilterValue: () => 'ALL',
              setFilterValue: vi.fn(),
            },
            getContext: () => ({})
          }
        ]
      }
    ],
    getAllColumns: () => [
      { id: 'id', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: vi.fn() },
      { id: 'status', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: vi.fn() },
    ],
    getVisibleLeafColumns: () => [
      { id: 'id' }, { id: 'status' }
    ],
    resetColumnFilters: vi.fn(),
    resetSorting: vi.fn(),
    resetPageIndex: vi.fn(),
    resetColumnVisibility: vi.fn(),
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    previousPage: vi.fn(),
    nextPage: vi.fn(),
  } as unknown as TableType<Exception>;

  const mockOnRowClick = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnClearStatsFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with given data', () => {
    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('Exception Results')).toBeInTheDocument();
    expect(screen.getByText('2 exceptions')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Err 1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Err 2')).toBeInTheDocument();
  });

  it('handles row click', () => {
    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    const firstRowValue = screen.getByText('1').closest('tr');
    fireEvent.click(firstRowValue!);

    expect(mockOnRowClick).toHaveBeenCalledWith(mockExceptions[0]);
  });

  it('handles clear filters button', () => {
    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
        onClearStatsFilters={mockOnClearStatsFilters}
      />
    );

    const clearBtn = screen.getByText('Clear All Filters');
    fireEvent.click(clearBtn);

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
    expect(mockTable.resetSorting).toHaveBeenCalled();
    expect(mockTable.resetPageIndex).toHaveBeenCalled();
    expect(mockTable.resetColumnVisibility).toHaveBeenCalled();
    expect(mockOnClearStatsFilters).toHaveBeenCalled();
  });

  it('handles refresh button', () => {
    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
        onRefresh={mockOnRefresh}
      />
    );

    const refreshBtn = screen.getByTitle('Refresh data and clear filters');
    fireEvent.click(refreshBtn);

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
    expect(mockTable.resetSorting).toHaveBeenCalled();
    expect(mockTable.resetPageIndex).toHaveBeenCalled();
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('downloads CSV when rows exist', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    fireEvent.click(screen.getByTitle('Download as CSV'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('renders singular label and pagination text correctly', () => {
    render(
      <ExceptionResultsTable
        table={mockTable}
        resultsCount={1}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('1 exception')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 to 1 of 1 results/i)).toBeInTheDocument();
  });

  it('renders empty state when no rows', () => {
    const emptyTable = {
      ...mockTable,
      getRowModel: () => ({ rows: [] }),
      getFilteredRowModel: () => ({ rows: [] }),
    } as unknown as TableType<Exception>;

    render(
      <ExceptionResultsTable
        table={emptyTable}
        resultsCount={0}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText(/Showing 0 to 0 of 0 results/i)).toBeInTheDocument();
  });

  it('triggers pagination callbacks', () => {
    const pagedTable = {
      ...mockTable,
      getCanPreviousPage: () => true,
      getCanNextPage: () => true,
    } as unknown as TableType<Exception>;

    render(
      <ExceptionResultsTable
        table={pagedTable}
        resultsCount={2}
        selectedExceptionId={null}
        onRowClick={mockOnRowClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Previous/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(pagedTable.previousPage).toHaveBeenCalled();
    expect(pagedTable.nextPage).toHaveBeenCalled();
  });


});

