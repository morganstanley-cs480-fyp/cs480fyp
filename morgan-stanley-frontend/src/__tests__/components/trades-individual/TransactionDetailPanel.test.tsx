import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionDetailPanel } from '@/components/trades-individual/TransactionDetailPanel';
import type { Exception, Transaction } from '@/lib/api/types';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatDateShort: (value: string) => `formatted:${value}`,
  };
});

describe('TransactionDetailPanel', () => {
  const selectedTransaction: Transaction = {
    id: 55,
    trade_id: 88,
    entity: 'BANK_A',
    direction: 'send',
    type: 'BOOKING',
    step: 3,
    status: 'ALLEGED',
    create_time: '2024-01-01',
    update_time: '2024-01-02',
  };

  it('renders transaction details without exception section when none', () => {
    render(
      <TransactionDetailPanel
        selectedTransaction={selectedTransaction}
        relatedExceptions={[]}
        getTransactionStatusColor={() => 'secondary'}
        getPriorityColor={() => 'secondary'}
        getPriorityIcon={() => <span>icon</span>}
        onResolveException={vi.fn()}
      />
    );

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('formatted:2024-01-01')).toBeInTheDocument();
    expect(screen.queryByText(/Related Exceptions/i)).not.toBeInTheDocument();
  });

  it('renders pending exception and calls resolve callback', () => {
    const onResolveException = vi.fn();
    const relatedExceptions = [
      {
        id: 7,
        trade_id: 88,
        trans_id: 55,
        msg: 'Timeout',
        priority: 'HIGH',
        status: 'PENDING',
        comment: 'investigate',
        create_time: '2024-02-01',
        update_time: '2024-02-02',
      },
    ] as unknown as Exception[];

    render(
      <TransactionDetailPanel
        selectedTransaction={selectedTransaction}
        relatedExceptions={relatedExceptions}
        getTransactionStatusColor={() => 'secondary'}
        getPriorityColor={() => 'destructive'}
        getPriorityIcon={() => <span>icon</span>}
        onResolveException={onResolveException}
      />
    );

    expect(screen.getByText('Related Exceptions (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View Exception Details'));
    expect(onResolveException).toHaveBeenCalledWith('7');
  });

  it('renders receive direction and closed exception without resolve action', () => {
    render(
      <TransactionDetailPanel
        selectedTransaction={{ ...selectedTransaction, direction: 'receive' }}
        relatedExceptions={[
          {
            id: 8,
            trade_id: 88,
            trans_id: 55,
            msg: 'Handled',
            priority: 'LOW',
            status: 'CLOSED',
            comment: 'done',
            create_time: '2024-02-05',
            update_time: '2024-02-06',
          },
        ] as unknown as Exception[]}
        getTransactionStatusColor={() => 'secondary'}
        getPriorityColor={() => 'secondary'}
        getPriorityIcon={() => <span>icon</span>}
        onResolveException={vi.fn()}
      />
    );

    expect(screen.getByText('RECEIVE')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Exception Details/i })).not.toBeInTheDocument();
  });
});
