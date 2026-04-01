import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResolvedSolutionDetails } from '@/components/exceptions-individual/ResolvedSolutionDetails';
import type { RetrievedSolution } from '@/lib/api/exceptionService';

describe('ResolvedSolutionDetails', () => {
  it('renders solution details and fallback values', () => {
    const solution: RetrievedSolution = {
      id: 10,
      exception_id: 99,
      title: 'Retry Memo',
      exception_description: '',
      reference_event: '',
      solution_description: '',
      scores: 0,
      create_time: '2024-01-01',
    };

    render(
      <ResolvedSolutionDetails solution={solution} />
    );

    expect(screen.getByText('Applied Solution Details')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('Retry Memo')).toBeInTheDocument();

    const naValues = screen.getAllByText('N/A');
    expect(naValues.length).toBeGreaterThanOrEqual(3);
  });
});
