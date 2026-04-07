import { describe, it, expect, vi } from 'vitest';
import { renderHook, render, screen, fireEvent } from '@testing-library/react';
import { useExceptionColumns } from '@/components/exceptions/useExceptionColumns';
import React from 'react';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatDateShort: (value: string) => `fmt:${value}`,
  };
});

describe('useExceptionColumns', () => {
  const makeRow = (values: Record<string, unknown>) => ({
    getValue: (key: string) => values[key],
  });

  const makeColumn = () => ({
    getIsSorted: vi.fn().mockReturnValue('asc'),
    toggleSorting: vi.fn(),
  });

  it('returns the expected columns', () => {
    const mockOptions = {
      getPriorityColor: vi.fn().mockReturnValue('destructive'),
      getPriorityIcon: vi.fn().mockReturnValue(<span>Icon</span>),
      getStatusBadgeVariant: vi.fn().mockReturnValue('default'),
    };

    const { result } = renderHook(() =>
      useExceptionColumns(
        mockOptions as {
          getPriorityColor: (priority: string) => 'destructive' | 'default' | 'secondary';
          getPriorityIcon: (priority: string) => React.ReactElement;
          getStatusBadgeVariant: (status: string) => 'default' | 'secondary';
        }
      )
    );
    
    expect(result.current).toBeDefined();
    expect(result.current.length).toBeGreaterThan(0);

    const columnIds = result.current.map((col) => String(col.id ?? col.accessorKey));
    expect(columnIds).toContain('id');
    expect(columnIds).toContain('trade_id');
    expect(columnIds).toContain('msg');
    expect(columnIds).toContain('priority');
    expect(columnIds).toContain('status');
    expect(columnIds).toContain('comment');
    expect(columnIds).toContain('create_time');
    expect(columnIds).toContain('update_time');
  });

  it('id and trade_id filterFns perform substring matching', () => {
    const mockOptions = {
      getPriorityColor: vi.fn().mockReturnValue('default'),
      getPriorityIcon: vi.fn().mockReturnValue(<span>i</span>),
      getStatusBadgeVariant: vi.fn().mockReturnValue('secondary'),
    };
    const { result } = renderHook(() =>
      useExceptionColumns(
        mockOptions as {
          getPriorityColor: (priority: string) => 'destructive' | 'default' | 'secondary';
          getPriorityIcon: (priority: string) => React.ReactElement;
          getStatusBadgeVariant: (status: string) => 'default' | 'secondary';
        }
      )
    );

    const idCol = result.current.find((c) => c.accessorKey === 'id');
    const tradeIdCol = result.current.find((c) => c.accessorKey === 'trade_id');

    expect(idCol?.filterFn?.(makeRow({ id: 12345 }) as never, 'id', '234', () => undefined)).toBe(true);
    expect(idCol?.filterFn?.(makeRow({ id: 12345 }) as never, 'id', '999', () => undefined)).toBe(false);
    expect(tradeIdCol?.filterFn?.(makeRow({ trade_id: 'TR-100' }) as never, 'trade_id', 'TR', () => undefined)).toBe(true);
  });

  it('create_time filterFn handles string/date-range/invalid-date branches', () => {
    const mockOptions = {
      getPriorityColor: vi.fn().mockReturnValue('default'),
      getPriorityIcon: vi.fn().mockReturnValue(<span>i</span>),
      getStatusBadgeVariant: vi.fn().mockReturnValue('secondary'),
    };
    const { result } = renderHook(() =>
      useExceptionColumns(
        mockOptions as {
          getPriorityColor: (priority: string) => 'destructive' | 'default' | 'secondary';
          getPriorityIcon: (priority: string) => React.ReactElement;
          getStatusBadgeVariant: (status: string) => 'default' | 'secondary';
        }
      )
    );

    const createTimeCol = result.current.find((c) => c.accessorKey === 'create_time');
    const row = makeRow({ create_time: '2024-01-15T10:00:00Z' });

    expect(createTimeCol?.filterFn?.(row as never, 'create_time', 'fmt:2024', () => undefined)).toBe(true);
    expect(createTimeCol?.filterFn?.(row as never, 'create_time', { from: '', to: '' }, () => undefined)).toBe(true);
    expect(createTimeCol?.filterFn?.(row as never, 'create_time', { from: '2024-01-10', to: '2024-01-20' }, () => undefined)).toBe(true);
    expect(createTimeCol?.filterFn?.(row as never, 'create_time', { from: '2024-01-16', to: undefined }, () => undefined)).toBe(false);
    expect(createTimeCol?.filterFn?.(row as never, 'create_time', { from: undefined, to: '2024-01-10' }, () => undefined)).toBe(false);
    expect(createTimeCol?.filterFn?.(makeRow({ create_time: 'invalid-date' }) as never, 'create_time', { from: '2024-01-01', to: '2024-01-31' }, () => undefined)).toBe(false);
  });

  it('status and priority cells call helper callbacks and render values', () => {
    const getPriorityColor = vi.fn().mockReturnValue('destructive');
    const getPriorityIcon = vi.fn().mockReturnValue(<span data-testid="pri-icon">Icon</span>);
    const getStatusBadgeVariant = vi.fn().mockReturnValue('default');

    const { result } = renderHook(() =>
      useExceptionColumns({ getPriorityColor, getPriorityIcon, getStatusBadgeVariant })
    );

    const statusCol = result.current.find((c) => c.accessorKey === 'status');
    const priorityCol = result.current.find((c) => c.accessorKey === 'priority');

    const statusCell = statusCol?.cell?.({ row: makeRow({ status: 'PENDING' }) } as never);
    const priorityCell = priorityCol?.cell?.({ row: makeRow({ priority: 'HIGH' }) } as never);

    if (statusCell) render(<>{statusCell}</>);
    if (priorityCell) render(<>{priorityCell}</>);

    expect(getStatusBadgeVariant).toHaveBeenCalledWith('PENDING');
    expect(getPriorityColor).toHaveBeenCalledWith('HIGH');
    expect(getPriorityIcon).toHaveBeenCalledWith('HIGH');
    expect(screen.getByTestId('pri-icon')).toBeInTheDocument();
  });

  it('sort header button toggles sorting when clicked', () => {
    const mockOptions = {
      getPriorityColor: vi.fn().mockReturnValue('default'),
      getPriorityIcon: vi.fn().mockReturnValue(<span>i</span>),
      getStatusBadgeVariant: vi.fn().mockReturnValue('secondary'),
    };
    const { result } = renderHook(() =>
      useExceptionColumns(
        mockOptions as {
          getPriorityColor: (priority: string) => 'destructive' | 'default' | 'secondary';
          getPriorityIcon: (priority: string) => React.ReactElement;
          getStatusBadgeVariant: (status: string) => 'default' | 'secondary';
        }
      )
    );

    const idCol = result.current.find((c) => c.accessorKey === 'id');
    const column = makeColumn();

    const headerNode = idCol?.header?.({ column } as never);
    if (headerNode) render(<>{headerNode}</>);

    fireEvent.click(screen.getByRole('button', { name: /Exception ID/i }));
    expect(column.toggleSorting).toHaveBeenCalledWith(true);
  });
});
