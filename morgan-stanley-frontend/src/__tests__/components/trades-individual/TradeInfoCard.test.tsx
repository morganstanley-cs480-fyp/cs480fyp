import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeInfoCard } from '@/components/trades-individual/TradeInfoCard';
import type { Exception, Trade, Transaction } from '@/lib/api/types';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatDateShort: (value: string) => `formatted:${value}`,
  };
});

describe('TradeInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const trade: Trade = {
    trade_id: 10,
    account: 'AC-1',
    asset_type: 'FX',
    booking_system: 'BS',
    affirmation_system: 'AS',
    clearing_house: 'LCH',
    create_time: '2024-02-01',
    update_time: '2024-02-02',
    status: 'ALLEGED',
  };

  const transactions: Transaction[] = [
    { id: 1, trade_id: 10, create_time: '2024-02-01', entity: 'BANK_A', direction: 'SEND', type: 'BOOKING', status: 'ALLEGED', update_time: '2024-02-01', step: 1 },
    { id: 2, trade_id: 10, create_time: '2024-02-02', entity: 'CCP', direction: 'RECEIVE', type: 'CLEAR', status: 'CLEARED', update_time: '2024-02-02', step: 2 },
  ];

  const exceptions: Exception[] = [
    {
      id: 100,
      trade_id: 10,
      status: 'PENDING',
      priority: 'HIGH',
      msg: 'Mismatch',
      trans_id: 2,
      create_time: '2024-02-03',
      update_time: '2024-02-04',
      comment: 'review',
    },
  ];

  it('renders summary tab and latest transaction status', () => {
    render(
      <TradeInfoCard
        trade={trade}
        transactions={transactions}
        exceptions={exceptions}
        showTradeInfo
        onToggle={vi.fn()}
        getStatusBadgeClassName={() => 'status-class'}
        isConnected
        connectionStatus="Connected"
      />
    );

    expect(screen.getByText('Trade Information')).toBeInTheDocument();
    expect(screen.getByText('Connection status for live updates: Connected')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('CLEARED')).toBeInTheDocument();
    expect(screen.getByText('formatted:2024-02-01')).toBeInTheDocument();
  });

  it('navigates to exception details on exception card click', async () => {
    const user = userEvent.setup();

    render(
      <TradeInfoCard
        trade={trade}
        transactions={transactions}
        exceptions={exceptions}
        showTradeInfo
        onToggle={vi.fn()}
        getStatusBadgeClassName={() => 'status-class'}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Exceptions \(1\)/i }));
    await user.click(await screen.findByRole('button', { name: /Exception 100/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/exceptions/$exceptionId',
      params: { exceptionId: '100' },
    });
  });

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn();

    render(
      <TradeInfoCard
        trade={trade}
        transactions={transactions}
        exceptions={[]}
        showTradeInfo={false}
        onToggle={onToggle}
        getStatusBadgeClassName={() => 'status-class'}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
