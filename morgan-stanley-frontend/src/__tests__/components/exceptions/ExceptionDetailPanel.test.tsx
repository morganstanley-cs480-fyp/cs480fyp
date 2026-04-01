import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExceptionDetailPanel } from '@/components/exceptions/ExceptionDetailPanel';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('ExceptionDetailPanel', () => {
  const mockException = {
    id: 1,
    trade_id: 'TRD123',
    trans_id: 'TXN456',
    msg: 'Validation error',
    priority: 'HIGH',
    comment: 'Needs review',
    create_time: '2023-01-01',
    update_time: '2023-01-02',
    status: 'PENDING',
  };

  const mockGetPriorityColor = vi.fn().mockReturnValue('destructive');
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when exception is provided', () => {
    render(
      <ExceptionDetailPanel
        // @ts-ignore
        exception={mockException}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );

    expect(screen.getByText('Exception Details')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('TRD123')).toBeInTheDocument();
    expect(screen.getByText('TXN456')).toBeInTheDocument();
    expect(screen.getByText('Validation error')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('2023-01-02')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ExceptionDetailPanel
        // @ts-ignore
        exception={mockException}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('navigates to trade when "View Associated Trade" is clicked', () => {
    render(
      <ExceptionDetailPanel
        // @ts-ignore
        exception={mockException}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );

    const viewTradeBtn = screen.getByText('View Associated Trade');
    fireEvent.click(viewTradeBtn);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/trades/$tradeId',
      params: { tradeId: 'TRD123' },
    });
  });

  it('navigates to exception when "View Exception" is clicked', () => {
    render(
      <ExceptionDetailPanel
         // @ts-ignore
        exception={mockException}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );

    const viewExceptionBtn = screen.getByText('View Exception');
    fireEvent.click(viewExceptionBtn);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/exceptions/$exceptionId',
      params: { exceptionId: '1' },
    });
  });

  it('renders "View Solution" when status is not PENDING', () => {
    const closedException = { ...mockException, status: 'CLOSED' };
    render(
      <ExceptionDetailPanel
         // @ts-ignore
        exception={closedException}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );

    const viewObjBtn = screen.getByText('View Solution');
    expect(viewObjBtn).toBeInTheDocument();
    
    fireEvent.click(viewObjBtn);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/exceptions/$exceptionId',
      params: { exceptionId: '1' },
    });
  });

  it('returns null when exception is null', () => {
    const { container } = render(
      <ExceptionDetailPanel
        exception={null}
        onClose={mockOnClose}
        getPriorityColor={mockGetPriorityColor}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

