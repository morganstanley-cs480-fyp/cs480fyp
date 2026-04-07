import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AISuggestionCard } from '@/components/exceptions-individual/AISuggestionCard';

describe('AISuggestionCard', () => {
  const baseSuggestion = {
    exception_id: '1001',
    title: 'Settlement mismatch',
    description: 'desc',
    trade_id: 'T-11',
    similarity_score: 85.2,
    priority: 'HIGH',
    status: 'PENDING',
    asset_type: 'EQ',
    clearing_house: 'LCH',
    explanation: 'AI explanation',
    text: '**Root Cause:**\n- Item one\n- Item two',
  };

  it('renders core suggestion content and match badge', () => {
    render(<AISuggestionCard suggestion={baseSuggestion} onClick={vi.fn()} />);

    expect(screen.getByText(/Exception Message:/i)).toBeInTheDocument();
    expect(screen.getByText('Settlement mismatch')).toBeInTheDocument();
    expect(screen.getByText('Exception #1001')).toBeInTheDocument();
    expect(screen.getByText('Trade #T-11')).toBeInTheDocument();
    expect(screen.getByText('85.2% Match')).toBeInTheDocument();
    expect(screen.getByText('AI explanation')).toBeInTheDocument();
  });

  it('calls onClick and shows loading state when details are missing', () => {
    const onClick = vi.fn();

    render(
      <AISuggestionCard
        suggestion={{ ...baseSuggestion, solution_description: undefined, exception_description: undefined }}
        onClick={onClick}
        isLoadingSolution
      />
    );

    fireEvent.click(screen.getByText('Settlement mismatch'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Loading additional context...')).toBeInTheDocument();
  });

  it('shows solution and exception sections when available', () => {
    render(
      <AISuggestionCard
        suggestion={{
          ...baseSuggestion,
          solution_title: 'INDEX VERSION',
          solution_description: 'Use retry memo flow',
          exception_description: 'Mismatch between systems',
        }}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Solution')).toBeInTheDocument();
    expect(screen.getByText('Solution Title:')).toBeInTheDocument();
    expect(screen.getByText('Solution Description:')).toBeInTheDocument();
    expect(screen.getByText('INDEX VERSION')).toBeInTheDocument();
    expect(screen.getByText('Use retry memo flow')).toBeInTheDocument();
    expect(screen.getByText('Exception Description:')).toBeInTheDocument();
    expect(screen.getByText('Mismatch between systems')).toBeInTheDocument();
  });

  it('renders fallback loading prompt when not loading and details are missing', () => {
    render(
      <AISuggestionCard
        suggestion={{ ...baseSuggestion, solution_description: undefined, exception_description: undefined }}
        onClick={vi.fn()}
        isLoadingSolution={false}
      />
    );

    expect(screen.getByText('Additional context is currently unavailable.')).toBeInTheDocument();
  });

  it('renders arrow-format solution blocks', () => {
    render(
      <AISuggestionCard
        suggestion={{
          ...baseSuggestion,
          text: '-> validate booking\n-> forward to CCP',
          solution_description: 's',
          exception_description: 'e',
        }}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('validate booking')).toBeInTheDocument();
    expect(screen.getByText('forward to CCP')).toBeInTheDocument();
  });

  it('renders default priority branch and similarity fallback branch', () => {
    render(
      <AISuggestionCard
        suggestion={{
          ...baseSuggestion,
          priority: 'UNKNOWN',
          status: 'CLOSED',
          similarity_score: 79.9,
          solution_description: 'resolved',
          exception_description: 'details',
          text: 'plain paragraph',
        }}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Priority: UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('79.9% Match')).toBeInTheDocument();
    expect(screen.getByText('plain paragraph')).toBeInTheDocument();
  });
});
