import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/exceptions/EmptyState';

describe('EmptyState', () => {
  it('renders correctly', () => {
    render(<EmptyState />);
    expect(screen.getByText('No exceptions found')).toBeInTheDocument();
    expect(screen.getByText('Adjust your filters to see more results')).toBeInTheDocument();
  });
});
