import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeResultsTable } from '@/components/trades/TradeResultsTable';
import type { Table as TableType } from '@tanstack/react-table';
import type { Trade } from '@/lib/api/types';

// Mock navigator API for URL.createObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');

// Mock useNavigate hook
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('TradeResultsTable', () => {
  // Helper to create mock table
  const createMockTable = (overrides?: Partial<TableType<Trade>>) => {
    const tradeIdSetFilterValue = vi.fn();
    const accountSetFilterValue = vi.fn();
    const createTimeSetFilterValue = vi.fn();

    const tradeIdColumn = {
      id: 'trade_id',
      columnDef: { header: 'Trade ID', cell: () => '1234' },
      getCanFilter: () => true,
      getFilterValue: () => '',
      setFilterValue: tradeIdSetFilterValue,
    };

    const accountColumn = {
      id: 'account',
      columnDef: { header: 'Account', cell: () => 'ACC1' },
      getCanFilter: () => true,
      getFilterValue: () => '',
      setFilterValue: accountSetFilterValue,
    };

    const dateColumn = {
      id: 'create_time',
      columnDef: { header: 'Create Time', cell: () => '2024-01-01' },
      getCanFilter: () => true,
      getFilterValue: () => undefined,
      setFilterValue: createTimeSetFilterValue,
    };

    return {
    __mocks: {
      tradeIdSetFilterValue,
      accountSetFilterValue,
      createTimeSetFilterValue,
    },
    getAllColumns: vi.fn().mockReturnValue([
      {
        id: 'trade_id',
        getCanHide: () => true,
        getIsVisible: () => true,
        toggleVisibility: vi.fn(),
        getCanFilter: () => true,
        getFilterValue: () => '',
        setFilterValue: tradeIdSetFilterValue,
      },
      {
        id: 'account',
        getCanHide: () => true,
        getIsVisible: () => true,
        toggleVisibility: vi.fn(),
        getCanFilter: () => true,
        getFilterValue: () => '',
        setFilterValue: accountSetFilterValue,
      },
      {
        id: 'create_time',
        getCanHide: () => true,
        getIsVisible: () => true,
        toggleVisibility: vi.fn(),
        getCanFilter: () => true,
        getFilterValue: () => undefined,
        setFilterValue: createTimeSetFilterValue,
      },
    ]),
    getHeaderGroups: vi.fn().mockReturnValue([
      {
        id: 'header-group-1',
        headers: [
          {
            id: 'trade_id',
            column: tradeIdColumn,
            isPlaceholder: false,
            getContext: () => ({}),
          },
          {
            id: 'account',
            column: accountColumn,
            isPlaceholder: false,
            getContext: () => ({}),
          },
          {
            id: 'create_time',
            column: dateColumn,
            isPlaceholder: false,
            getContext: () => ({}),
          },
        ],
      },
    ]),
    getVisibleLeafColumns: vi.fn().mockReturnValue([
      {
        id: 'trade_id',
        getSize: () => 100,
      },
    ]),
    getRowModel: vi.fn().mockReturnValue({
      rows: [
        {
          id: '1',
          original: { trade_id: 1234, account: 'ACC1', create_time: '2024-01-01' },
          getVisibleCells: () => [
            {
              id: 'trade_id-1',
              column: { columnDef: { cell: '1234' } },
              getContext: () => ({}),
            },
          ],
        },
      ],
    }),
    getFilteredRowModel: vi.fn().mockReturnValue({
      rows: [
        {
          id: '1',
          original: { trade_id: 1234, account: 'ACC1', create_time: '2024-01-01' },
        },
      ],
    }),
    getPreFilteredRowModel: vi.fn().mockReturnValue({
      flatRows: [
        { original: { trade_id: 1234, account: 'ACC1', asset_type: 'EQUITY', booking_system: 'SYS1', affirmation_system: 'AFF1', clearing_house: 'LCH', status: 'PENDING' } },
      ],
    }),
    resetColumnFilters: vi.fn(),
    resetSorting: vi.fn(),
    resetPageIndex: vi.fn(),
    resetColumnVisibility: vi.fn(),
    getState: vi.fn().mockReturnValue({
      pagination: { pageIndex: 0, pageSize: 10 },
    }),
    getCanPreviousPage: vi.fn().mockReturnValue(false),
    getCanNextPage: vi.fn().mockReturnValue(false),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    ...overrides,
  } as unknown as TableType<Trade>;
  };

  const defaultProps = {
    table: createMockTable(),
    resultsCount: 1,
    columnFiltersCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders results count', () => {
    render(<TradeResultsTable {...defaultProps} />);
    expect(screen.getByText('1 trades')).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    render(<TradeResultsTable {...defaultProps} />);
    expect(screen.getByTitle('Download as CSV')).toBeInTheDocument();
    expect(screen.getByTitle('Refresh data and clear filters')).toBeInTheDocument();
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
  });

  it('calls handleRefresh and triggers onRefresh callback', async () => {
    const onRefresh = vi.fn();
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <TradeResultsTable {...defaultProps} table={mockTable} onRefresh={onRefresh} />
    );

    await user.click(screen.getByTitle('Refresh data and clear filters'));

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
    expect(mockTable.resetSorting).toHaveBeenCalled();
    expect(mockTable.resetPageIndex).toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('clears all filters when Clear All Filters is clicked', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    await user.click(screen.getByText('Clear All Filters'));

    expect(mockTable.resetColumnFilters).toHaveBeenCalled();
    expect(mockTable.resetSorting).toHaveBeenCalled();
    expect(mockTable.resetPageIndex).toHaveBeenCalled();
    expect(mockTable.resetColumnVisibility).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    const mockTable = createMockTable({
      getRowModel: vi.fn().mockReturnValue({ rows: [] }),
    });
    render(
      <TradeResultsTable {...defaultProps} table={mockTable} isLoading={true} />
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows no results message when there are no rows', () => {
    const mockTable = createMockTable({
      getRowModel: vi.fn().mockReturnValue({ rows: [] }),
    });
    render(
      <TradeResultsTable {...defaultProps} table={mockTable} isLoading={false} />
    );
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders column visibility dropdown', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const columnsButton = screen.getByText('Columns Visibility');
    await user.click(columnsButton);

    expect(screen.getByText('Toggle columns')).toBeInTheDocument();
  });

  it('downloads CSV when download button is clicked', async () => {
    const mockTable = createMockTable({
      getFilteredRowModel: vi.fn().mockReturnValue({
        rows: [
          {
            id: '1',
            original: { trade_id: 1234, account: 'ACC1' },
            getValue: (id: string) => (id === 'trade_id' ? 1234 : 'ACC1'),
          },
        ],
      }),
    });
    const user = userEvent.setup();

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    await user.click(screen.getByTitle('Download as CSV'));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not attempt CSV download when no filtered rows exist', async () => {
    const mockTable = createMockTable({
      getFilteredRowModel: vi.fn().mockReturnValue({ rows: [] }),
    });
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);
    await user.click(screen.getByTitle('Download as CSV'));

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('handles pagination buttons', async () => {
    const mockTable = createMockTable({
      getCanPreviousPage: vi.fn().mockReturnValue(true),
      getCanNextPage: vi.fn().mockReturnValue(true),
    });
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const previousBtn = screen.getByText('Previous');
    const nextBtn = screen.getByText('Next');

    await user.click(previousBtn);
    expect(mockTable.previousPage).toHaveBeenCalled();

    await user.click(nextBtn);
    expect(mockTable.nextPage).toHaveBeenCalled();
  });

  it('disables pagination buttons when not applicable', () => {
    const mockTable = createMockTable({
      getCanPreviousPage: vi.fn().mockReturnValue(false),
      getCanNextPage: vi.fn().mockReturnValue(false),
    });

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    expect(screen.getByText('Previous')).toHaveAttribute('disabled');
    expect(screen.getByText('Next')).toHaveAttribute('disabled');
  });

  it('renders rows when table has data', () => {
    render(<TradeResultsTable {...defaultProps} />);
    expect(screen.getByText('Showing results 0-1 out of 1')).toBeInTheDocument();
  });

  it('applies text filter and clears it via clear button', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const tradeIdInput = screen.getByPlaceholderText('Filter by Trade ID');
    await user.type(tradeIdInput, '12');
    expect((mockTable as unknown as { __mocks: { tradeIdSetFilterValue: ReturnType<typeof vi.fn> } }).__mocks.tradeIdSetFilterValue).toHaveBeenCalled();

    const tableWithValue = createMockTable({
      getHeaderGroups: vi.fn().mockReturnValue([
        {
          id: 'header-group-1',
          headers: [
            {
              id: 'trade_id',
              column: {
                id: 'trade_id',
                columnDef: { header: 'Trade ID', cell: () => '1234' },
                getCanFilter: () => true,
                getFilterValue: () => '12',
                setFilterValue: (mockTable as unknown as { __mocks: { tradeIdSetFilterValue: ReturnType<typeof vi.fn> } }).__mocks.tradeIdSetFilterValue,
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
            {
              id: 'account',
              column: {
                id: 'account',
                columnDef: { header: 'Account', cell: () => 'ACC1' },
                getCanFilter: () => true,
                getFilterValue: () => '',
                setFilterValue: vi.fn(),
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
            {
              id: 'create_time',
              column: {
                id: 'create_time',
                columnDef: { header: 'Create Time', cell: () => '2024-01-01' },
                getCanFilter: () => true,
                getFilterValue: () => undefined,
                setFilterValue: vi.fn(),
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
          ],
        },
      ]),
    });

    render(<TradeResultsTable {...defaultProps} table={tableWithValue} />);
    await user.click(screen.getAllByTitle('Clear filter')[0]);
    expect((mockTable as unknown as { __mocks: { tradeIdSetFilterValue: ReturnType<typeof vi.fn> } }).__mocks.tradeIdSetFilterValue).toHaveBeenCalledWith('');
  });

  it('opens account suggestion dropdown and selects an option', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const accountInput = screen.getAllByPlaceholderText('Filter...')[0];
    await user.click(accountInput);
    await user.click(screen.getAllByRole('button', { name: /ACC1/i })[0]);

    expect((mockTable as unknown as { __mocks: { accountSetFilterValue: ReturnType<typeof vi.fn> } }).__mocks.accountSetFilterValue).toHaveBeenCalledWith('ACC1');
  });

  it('closes filter suggestions when Escape is pressed', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const accountInput = screen.getAllByPlaceholderText('Filter...')[0];
    await user.click(accountInput);
    expect(screen.getAllByRole('button', { name: /ACC1/i })[0]).toBeInTheDocument();

    fireEvent.keyDown(accountInput, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /ACC1/i })).not.toBeInTheDocument();
  });

  it('clears date range filter to undefined when both from/to become empty', async () => {
    const setDateFilter = vi.fn();

    const mockTable = createMockTable({
      getHeaderGroups: vi.fn().mockReturnValue([
        {
          id: 'header-group-1',
          headers: [
            {
              id: 'trade_id',
              column: {
                id: 'trade_id',
                columnDef: { header: 'Trade ID', cell: () => '1234' },
                getCanFilter: () => true,
                getFilterValue: () => '',
                setFilterValue: vi.fn(),
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
            {
              id: 'account',
              column: {
                id: 'account',
                columnDef: { header: 'Account', cell: () => 'ACC1' },
                getCanFilter: () => true,
                getFilterValue: () => '',
                setFilterValue: vi.fn(),
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
            {
              id: 'create_time',
              column: {
                id: 'create_time',
                columnDef: { header: 'Create Time', cell: () => '2024-01-01' },
                getCanFilter: () => true,
                getFilterValue: () => ({ from: '2024-01-01', to: '' }),
                setFilterValue: setDateFilter,
              },
              isPlaceholder: false,
              getContext: () => ({}),
            },
          ],
        },
      ]),
    });

    const { container } = render(<TradeResultsTable {...defaultProps} table={mockTable} />);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    const fromInput = dateInputs[0] as HTMLInputElement;
    const toInput = dateInputs[1] as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: '' } });
    expect(setDateFilter).toHaveBeenCalledWith(undefined);

    fireEvent.change(toInput, { target: { value: '' } });
    expect(setDateFilter).toHaveBeenCalled();
  });
});
