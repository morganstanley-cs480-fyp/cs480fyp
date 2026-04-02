import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExceptionFilters } from '@/components/exceptions/ExceptionFilters';
import type { Table as TableType } from "@tanstack/react-table";
import type { Exception } from "@/lib/api/types";

describe('ExceptionFilters', () => {
  const createMockTable = (overrides?: Partial<TableType<Exception>>) => ({
    getAllColumns: vi.fn().mockReturnValue([
      { id: 'id', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: vi.fn() },
      { id: 'status', getCanHide: () => true, getIsVisible: () => false, toggleVisibility: vi.fn() },
      { id: 'priority', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: vi.fn() },
      { id: 'nonHideable', getCanHide: () => false, getIsVisible: () => true, toggleVisibility: vi.fn() },
    ]),
    ...overrides,
  }) as unknown as TableType<Exception>;

  const mockOnClearFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter controls', () => {
    const mockTable = createMockTable();
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

  it('calls onClearFilters when clear button is clicked', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    const clearBtn = screen.getByText('Clear All Filters');
    await user.click(clearBtn);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('opens column visibility dropdown', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    const columnVisibilityBtn = screen.getByText('Column Visibility');
    await user.click(columnVisibilityBtn);

    expect(screen.getByText('Toggle Columns')).toBeInTheDocument();
  });

  it('displays hideable columns with correct labels in dropdown', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    await user.click(screen.getByText('Column Visibility'));

    // Should show Exception_id for id column (special handling)
    expect(screen.getByText('Exception_id')).toBeInTheDocument();
    // Should show other column names as-is
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
  });

  it('filters out non-hideable columns from dropdown', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    await user.click(screen.getByText('Column Visibility'));

    // Non-hideable column should not appear
    expect(screen.queryByText('nonHideable')).not.toBeInTheDocument();
  });

  it('toggles column visibility when checkbox is clicked', async () => {
    const mockToggleVisibility = vi.fn();
    const mockTable = createMockTable({
      getAllColumns: vi.fn().mockReturnValue([
        { id: 'id', getCanHide: () => true, getIsVisible: () => true, toggleVisibility: mockToggleVisibility },
        { id: 'status', getCanHide: () => true, getIsVisible: () => false, toggleVisibility: vi.fn() },
      ]),
    });
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    await user.click(screen.getByText('Column Visibility'));
    
    // Find the checkbox for 'id' column and click it
    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    await user.click(checkboxes[0]);

    expect(mockToggleVisibility).toHaveBeenCalledWith(false);
  });

  it('reflects correct visibility state in checkboxes', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    await user.click(screen.getByText('Column Visibility'));

    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    // id and priority are visible (true)
    expect(checkboxes[0]).toHaveAttribute('data-state', 'checked');
    expect(checkboxes[1]).toHaveAttribute('data-state', 'unchecked');
    expect(checkboxes[2]).toHaveAttribute('data-state', 'checked');
  });

  it('prevents event propagation when selecting column', async () => {
    const mockTable = createMockTable();
    const user = userEvent.setup();

    render(
      <ExceptionFilters
        table={mockTable}
        onClearFilters={mockOnClearFilters}
      />
    );

    await user.click(screen.getByText('Column Visibility'));

    const checkboxes = screen.getAllByRole('menuitemcheckbox');
    const firstCheckbox = checkboxes[0];

    // The onSelect handler should prevent default
    fireEvent.click(firstCheckbox);

    // Verify menu stays open (no close action triggered by event propagation)
    expect(screen.getByText('Toggle Columns')).toBeInTheDocument();
  });
});
