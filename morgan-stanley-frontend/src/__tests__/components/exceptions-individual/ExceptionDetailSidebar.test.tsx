import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';

describe('ExceptionDetailSidebar', () => {
  it('renders exception details and calls priority color helper', () => {
    const getPriorityColor = vi.fn().mockReturnValue('destructive');

    render(
      <ExceptionDetailSidebar
        exception={{
          id: 12,
          trade_id: 101,
          trans_id: 501,
          msg: 'Missing affirmation',
          priority: 'HIGH',
          comment: 'check mapping',
          create_time: '2023-01-01',
          update_time: '2023-01-02',
          status: 'PENDING',
        }}
        getPriorityColor={getPriorityColor}
      />
    );

    expect(screen.getByText('Exception Details')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('501')).toBeInTheDocument();
    expect(screen.getByText('Missing affirmation')).toBeInTheDocument();
    expect(screen.getByText('check mapping')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    expect(getPriorityColor).toHaveBeenCalledWith('HIGH');
  });

  it('renders closed status branch and null comment fallback display', () => {
    const getPriorityColor = vi.fn().mockReturnValue('secondary');

    render(
      <ExceptionDetailSidebar
        exception={{
          id: 99,
          trade_id: 88,
          trans_id: 77,
          msg: 'Resolved issue',
          priority: 'LOW',
          comment: null,
          create_time: '2023-02-01',
          update_time: '2023-02-02',
          status: 'CLOSED',
        }}
        getPriorityColor={getPriorityColor}
      />
    );

    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(getPriorityColor).toHaveBeenCalledWith('LOW');
  });
});
