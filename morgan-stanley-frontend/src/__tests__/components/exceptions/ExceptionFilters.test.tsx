import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExceptionFilters } from '@/components/exceptions/ExceptionFilters';
import type { Table as TableType } from "@tanstack/react-table";
import type { Exception } from "@/lib/api/types";

describe('ExceptionFilters', () => {
  const mockTable = {
    getAllColumns: () => [
      { id: 'id', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: vi.fn() },
      { id: 'status', getCanHide: () => true, getIsVisible: () => false, toggleVisibility: vi.fn() },
    ],
  } as unknown as TableType<Exception>;

  const mockOnClearFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    expect(screen.getByText('Column Visibility')).toBeInTheDocument();
  });

  it('calls onClearFilters when clear button is clicked', () => {
    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    const clearBtn = screen.getByText('Clear All Filters');
    fireEvent.click(clearBtn);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });
});
