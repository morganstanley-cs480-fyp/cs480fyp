import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlowVisualization } from '@/components/trades-individual/FlowVisualization';
import type { Transaction } from '@/lib/api/types';

vi.mock('@/components/trades-individual/TimelineTransactionCard', () => ({
  TimelineTransactionCard: ({ transaction, onClick }: { transaction: { id: number }; onClick: () => void }) => (
    <button onClick={onClick}>Timeline item {transaction.id}</button>
  ),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => <div data-testid="reactflow">{children}</div>,
  Background: () => <div data-testid="bg" />,
  Controls: () => <div data-testid="controls" />,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  MarkerType: { ArrowClosed: 'arrow' },
  BaseEdge: () => null,
  EdgeLabelRenderer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
  useNodes: () => [],
}));

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    async layout() {
      return {
        children: [
          { id: 'CCP', x: 0, y: 0 },
          { id: 'BANK_A', x: 0, y: 200 },
        ],
        edges: [{ id: 'e-1', sources: ['BANK_A'], targets: ['CCP'] }],
      };
    }
  },
}));

describe('FlowVisualization', () => {
  const baseProps = {
    onTabChange: vi.fn(),
    clearingHouse: 'LCH',
    selectedTransaction: null,
    onTransactionSelect: vi.fn(),
    onEntitySelect: vi.fn(),
    exceptions: [],
    getRelatedExceptions: vi.fn().mockReturnValue([]),
    getTransactionBackgroundColor: vi.fn().mockReturnValue('bg-black/10 border-black/10'),
    getTransactionStatusColor: vi.fn().mockReturnValue('secondary'),
  };

  it('shows timeline empty state when no transactions are available', () => {
    render(
      <FlowVisualization
        {...baseProps}
        activeTab="timeline"
        transactions={[]}
      />
    );

    expect(screen.getByText('No transactions found for this trade.')).toBeInTheDocument();
  });

  it('renders timeline items and forwards click to onTransactionSelect', () => {
    const onTransactionSelect = vi.fn();
    const transactions: Transaction[] = [
      {
        id: 1,
        trade_id: 11,
        create_time: '2024-03-01',
        update_time: '2024-03-01',
        step: 1,
        entity: 'BANK_A',
        direction: 'SEND',
        type: 'BOOKING',
        status: 'ALLEGED',
      },
    ];

    render(
      <FlowVisualization
        {...baseProps}
        activeTab="timeline"
        transactions={transactions}
        onTransactionSelect={onTransactionSelect}
      />
    );

    fireEvent.click(screen.getByText('Timeline item 1'));
    expect(onTransactionSelect).toHaveBeenCalledWith(transactions[0]);
  });
});
