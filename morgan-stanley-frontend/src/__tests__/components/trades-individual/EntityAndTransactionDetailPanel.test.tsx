import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityAndTransactionDetailPanel } from '@/components/trades-individual/EntityAndTransactionDetailPanel';
import type { Exception, Transaction } from '@/lib/api/types';

vi.mock('@/components/trades-individual/EntityDetailPanel.tsx', () => ({
  EntityDetailPanel: ({ entityName }: { entityName: string }) => <div>Entity panel {entityName}</div>,
}));

vi.mock('@/components/trades-individual/TransactionDetailPanel.tsx', () => ({
  TransactionDetailPanel: ({ relatedExceptions }: { relatedExceptions: Array<{ id: number }> }) => (
    <div>Transaction panel exceptions {relatedExceptions.length}</div>
  ),
}));

vi.mock('@/lib/tradeDetailUtils', () => ({
  getPriorityColor: vi.fn(),
  getPriorityIcon: vi.fn(),
  getTransactionStatusColor: vi.fn(),
}));

describe('EntityAndTransactionDetailPanel', () => {
  it('renders empty prompt when nothing is selected', () => {
    render(
      <EntityAndTransactionDetailPanel
        selectedEntity={null}
        selectedTransaction={null}
        lastSelectedType={null}
        transactions={[]}
        relatedExceptions={[]}
        onResolveException={vi.fn()}
      />
    );

    expect(screen.getByText('Select a participant or transaction from the timeline')).toBeInTheDocument();
  });

  it('renders entity detail panel when entity is selected', () => {
    render(
      <EntityAndTransactionDetailPanel
        selectedEntity={{ name: 'BANK_A', isHub: false }}
        selectedTransaction={null}
        lastSelectedType={'entity'}
        transactions={[]}
        relatedExceptions={[]}
        onResolveException={vi.fn()}
      />
    );

    expect(screen.getByText('Entity panel BANK_A')).toBeInTheDocument();
  });

  it('filters out non-pending exceptions before rendering transaction panel', () => {
    const selectedTransaction = { id: 20, status: 'ALLEGED' } as unknown as Transaction;
    const transactions = [{ id: 20, status: 'ALLEGED' }] as unknown as Transaction[];
    const relatedExceptions = [
      { id: 1, status: 'PENDING' },
      { id: 2, status: 'CLOSED' },
    ] as unknown as Exception[];

    render(
      <EntityAndTransactionDetailPanel
        selectedEntity={null}
        selectedTransaction={selectedTransaction}
        lastSelectedType={'transaction'}
        transactions={transactions}
        relatedExceptions={relatedExceptions}
        onResolveException={vi.fn()}
      />
    );

    expect(screen.getByText('Transaction panel exceptions 1')).toBeInTheDocument();
  });
});
