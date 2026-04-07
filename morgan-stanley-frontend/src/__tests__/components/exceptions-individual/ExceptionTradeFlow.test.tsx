import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExceptionTradeFlow } from '@/components/exceptions-individual/ExceptionTradeFlow';
import { tradeFlowService } from '@/lib/api/tradeFlowService';
import type { Trade, Transaction } from '@/lib/api/types';

vi.mock('@/lib/api/tradeFlowService', () => ({
  tradeFlowService: {
    getTransactionById: vi.fn(),
    getTradeById: vi.fn(),
  },
}));

describe('ExceptionTradeFlow', () => {
  const transaction: Transaction = {
    id: 21,
    trade_id: 10,
    create_time: '2024-02-01',
    update_time: '2024-02-01',
    entity: 'CCP',
    direction: 'receive',
    type: 'CLEAR',
    status: 'CLEARED',
    step: 2,
  };

  const trade: Trade = {
    trade_id: 10,
    account: 'ACC-1',
    asset_type: 'FX',
    booking_system: 'BOOK',
    affirmation_system: 'AFFIRM',
    clearing_house: 'LCH',
    create_time: '2024-02-01',
    update_time: '2024-02-02',
    status: 'ALLEGED',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders linked trade and transaction details', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue(transaction);
    vi.mocked(tradeFlowService.getTradeById).mockResolvedValue(trade);

    render(<ExceptionTradeFlow transactionId={21} />);

    expect(screen.getByText('Loading trade and transaction details...')).toBeInTheDocument();

    expect(await screen.findByText('Trade ID')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('ACC-1')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('RECEIVE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Trade Page/i })).toBeInTheDocument();

    expect(tradeFlowService.getTransactionById).toHaveBeenCalledWith(21);
    expect(tradeFlowService.getTradeById).toHaveBeenCalledWith(10);
  });

  it('uses fallbackTradeId when transaction trade_id is missing', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue({
      ...transaction,
      trade_id: 0,
    });
    vi.mocked(tradeFlowService.getTradeById).mockResolvedValue({
      ...trade,
      trade_id: 99,
    });

    render(<ExceptionTradeFlow transactionId={21} fallbackTradeId={99} />);

    expect(await screen.findByText('99')).toBeInTheDocument();
    expect(tradeFlowService.getTradeById).toHaveBeenCalledWith(99);
    expect(screen.getByRole('button', { name: /Open Trade Page/i })).toBeInTheDocument();
  });

  it('does not request trade details when no trade id can be resolved', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue({
      ...transaction,
      trade_id: 0,
    });

    render(<ExceptionTradeFlow transactionId={21} />);

    expect(await screen.findByText('Transaction ID')).toBeInTheDocument();
    expect(tradeFlowService.getTradeById).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Open Trade Page/i })).not.toBeInTheDocument();
  });

  it('shows error state when request fails', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockRejectedValue(new Error('boom'));

    render(<ExceptionTradeFlow transactionId={21} />);

    expect(await screen.findByText('Failed to load linked trade and transaction details.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Trade Page/i })).not.toBeInTheDocument();
  });

  it('hides open-trade button when hideOpenTradeButton is true', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue(transaction);
    vi.mocked(tradeFlowService.getTradeById).mockResolvedValue(trade);

    render(<ExceptionTradeFlow transactionId={21} hideOpenTradeButton />);

    expect(await screen.findByText('Transaction ID')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Trade Page/i })).not.toBeInTheDocument();
  });

  it('opens trade modal iframe when open-trade button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue(transaction);
    vi.mocked(tradeFlowService.getTradeById).mockResolvedValue(trade);

    render(<ExceptionTradeFlow transactionId={21} />);

    await user.click(await screen.findByRole('button', { name: /Open Trade Page/i }));

    const iframe = await screen.findByTitle('Trade 10');
    expect(iframe).toHaveAttribute('src', '/trades/10?embedded=1');
  });

  it('renders embedded layout without card wrapper', async () => {
    vi.mocked(tradeFlowService.getTransactionById).mockResolvedValue(transaction);
    vi.mocked(tradeFlowService.getTradeById).mockResolvedValue(trade);

    render(<ExceptionTradeFlow transactionId={21} embedded />);

    await waitFor(() => {
      expect(screen.getByText('Transaction ID')).toBeInTheDocument();
    });
    expect(screen.queryByText('Exception Trade Flow')).not.toBeInTheDocument();
  });
});
