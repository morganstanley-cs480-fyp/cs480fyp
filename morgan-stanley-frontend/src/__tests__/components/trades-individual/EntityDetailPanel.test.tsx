import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityDetailPanel } from '@/components/trades-individual/EntityDetailPanel';
import type { Transaction } from '@/lib/api/types';

describe('EntityDetailPanel', () => {
  const transactions: Transaction[] = [
    { id: 1, entity: 'BANK_A', direction: 'from_ccp', status: 'ALLEGED', type: 'BOOKING', step: 1 },
    { id: 2, entity: 'BANK_A', direction: 'send', status: 'CLEARED', type: 'AFFIRM', step: 2 },
    { id: 3, entity: 'BANK_B', direction: 'to_ccp', status: 'REJECTED', type: 'CLEAR', step: 3 },
  ] as unknown as Transaction[];

  it('renders entity-specific transaction stats and recent transactions', () => {
    render(<EntityDetailPanel entityName="BANK_A" isHub={false} transactions={transactions} />);

    expect(screen.getByText('BANK_A')).toBeInTheDocument();
    expect(screen.getByText('Market Participant')).toBeInTheDocument();
    expect(screen.getByText('Transaction Activity')).toBeInTheDocument();
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Transaction ID: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Transaction ID: 2/)).toBeInTheDocument();
  });

  it('treats hub view as all transactions', () => {
    render(<EntityDetailPanel entityName="CCP" isHub transactions={transactions} />);

    expect(screen.getByText('Central Clearing House')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Inbound')).toBeInTheDocument();
    expect(screen.getByText('Outbound')).toBeInTheDocument();
  });
});
