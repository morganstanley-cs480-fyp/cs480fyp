import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExceptionResultsTable } from '@/components/exceptions/ExceptionResultsTable';
import type { Exception } from '@/lib/api/types';
import type { Table as TableType } from '@tanstack/react-table';

describe('ExceptionResultsTable', () => {
  const mockExceptions: Exception[] = [
    { id: 1, trade_id: 'T1', trans_id: 'TX1', msg: 'Err 1', priority: 'HIGH', comment: '', create_time: '2023-01-01', update_time: '2023-01-01', status: 'PENDING' },
    { id: 2, trade_id: 'T2', trans_id: 'TX2', msg: 'Err 2', priority: 'LOW', comment: '', create_time: '2023-01-02', update_time: '2023-01-02', status: 'CLOSED' },
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


  // it('handles CSV download', async () => {
  //   // Keep reference to real values we mock
  //   const createElementOriginal = document.createElement;
    
  //   // Mock URL and document.createElement specifically for 'a' tag
  //   window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    
  //   const mockAnchor = {
  //       setAttribute: vi.fn(),
  //       style: { visibility: '' },
  //       click: vi.fn(),
  //   };

  //   const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  //   const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

  //   const { container } = render(
  //     <ExceptionResultsTable
  //       table={mockTable}
  //       resultsCount={2}
  //       selectedExceptionId={null}
  //       onRowClick={mockOnRowClick}
  //     />
  //   );

  //   const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
  //     if (tagName === 'a') {
  //       return mockAnchor as unknown as HTMLAnchorElement;
  //     }
  //     return createElementOriginal.call(document, tagName, options);
  //   });

  //   const downloadBtn = screen.getByTitle('Download as CSV');
  //   fireEvent.click(downloadBtn);
    
  //   expect(createElementSpy).toHaveBeenCalledWith('a');
  //   expect(mockAnchor.setAttribute).toHaveBeenCalledWith('href', 'blob:url');
  //   expect(mockAnchor.click).toHaveBeenCalled();

  //   createElementSpy.mockRestore();
  //   appendChildSpy.mockRestore();
  //   removeChildSpy.mockRestore();
  // });


  // it('renders empty state when no results', () => {
  //   const emptyTable = {
  //     ...mockTable,
  //     getRowModel: () => ({ rows: [] }),
  //   } as unknown as TableType<Exception>;

  //   render(
  //     <ExceptionResultsTable
  //       table={emptyTable}
  //       resultsCount={0}
  //       selectedExceptionId={null}
  //       onRowClick={mockOnRowClick}
  //     />
  //   );

  //   const textElements = screen.getAllByText(/0 exception/);
  //   expect(textElements.length).toBeGreaterThan(0);
    
  //   expect(screen.getByText('No results found.')).toBeInTheDocument();
  // });
});

