import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ResizeObserver as a proper constructor class BEFORE imports
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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
          { id: 'CCP', x: 100, y: 100, width: 180, height: 120 },
          { id: 'BANK_A', x: 100, y: 300, width: 180, height: 120 },
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

  it('invokes onTabChange when switching tabs', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(
      <FlowVisualization
        {...baseProps}
        activeTab="timeline"
        onTabChange={onTabChange}
        transactions={[]}
      />
    );

    await user.click(screen.getByRole('tab', { name: /System Flow/i }));
    expect(onTabChange).toHaveBeenCalledWith('system');
  });

//   it('renders system-flow panel controls when activeTab is system', async () => {
//     const transactions: Transaction[] = [
//       {
//         id: 1,
//         trade_id: 11,
//         create_time: '2024-03-01',
//         update_time: '2024-03-01',
//         step: 1,
//         entity: 'BANK_A',
//         direction: 'SEND',
//         type: 'BOOKING',
//         status: 'ALLEGED',
//       },
//     ];

//     render(
//       <FlowVisualization
//         {...baseProps}
//         activeTab="system"
//         transactions={transactions}
//       />
//     );

//     await waitFor(() => {
//       expect(screen.getByText(/System architecture and data flow visualization/i)).toBeInTheDocument();
//     });
//     expect(screen.getByRole('button', { name: /Play/i })).toBeInTheDocument();
//     expect(screen.getByRole('button', { name: /Reset Layout/i })).toBeInTheDocument();
//     expect(screen.getByRole('button', { name: /Full Screen/i })).toBeInTheDocument();
//   });

  it('toggles playback when multiple steps are available', async () => {
    const user = userEvent.setup();
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
      {
        id: 2,
        trade_id: 11,
        create_time: '2024-03-01',
        update_time: '2024-03-01',
        step: 2,
        entity: 'BANK_A',
        direction: 'SEND',
        type: 'BOOKING',
        status: 'CLEARED',
      },
    ];

    render(
      <FlowVisualization
        {...baseProps}
        activeTab="system"
        transactions={transactions}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Play/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /Play/i }));
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
  });
});
