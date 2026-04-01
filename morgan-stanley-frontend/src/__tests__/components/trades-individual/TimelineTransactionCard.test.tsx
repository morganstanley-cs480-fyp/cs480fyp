import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineTransactionCard } from '@/components/trades-individual/TimelineTransactionCard';
import type { Exception, Transaction } from '@/lib/api/types';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatDateShort: (value: string) => `formatted:${value}`,
  };
});

describe('TimelineTransactionCard', () => {
  const transaction: Transaction = {
    id: 15,
    trade_id: 1,
    entity: 'BANK_A',
    direction: 'send',
    type: 'BOOKING',
    status: 'ALLEGED',
    create_time: '2024-02-01',
    update_time: '2024-02-01',
    step: 1,
  };

  it('renders transaction details and exception indicator', () => {
    render(
      <TimelineTransactionCard
        transaction={transaction}
        index={1}
        isSelected={false}
        isLast={false}
        relatedExceptions={[{ id: 1 }, { id: 2 }] as unknown as Exception[]}
        getTransactionBackgroundColor={() => 'bg-red-50 border-red-200'}
        getTransactionStatusColor={() => 'secondary'}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('BANK_A')).toBeInTheDocument();
    expect(screen.getByText('SEND')).toBeInTheDocument();
    expect(screen.getByText('2 Exceptions')).toBeInTheDocument();
    expect(screen.getByText('formatted:2024-02-01')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();

    render(
      <TimelineTransactionCard
        transaction={transaction}
        index={0}
        isSelected
        isLast
        relatedExceptions={[]}
        getTransactionBackgroundColor={() => 'bg-red-50 border-red-200'}
        getTransactionStatusColor={() => 'secondary'}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('15'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
