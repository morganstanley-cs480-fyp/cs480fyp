import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AISuggestionsTab } from '@/components/exceptions-individual/AISuggestionsTab';

vi.mock('@/components/exceptions-individual/AISuggestionCard', () => ({
  AISuggestionCard: ({ suggestion, onClick, isSelected, isLoadingSolution }: { suggestion: { title: string }; onClick: () => void; isSelected?: boolean; isLoadingSolution?: boolean }) => (
    <button onClick={onClick}>
      {suggestion.title}-{String(Boolean(isSelected))}-{String(Boolean(isLoadingSolution))}
    </button>
  ),
}));

describe('AISuggestionsTab', () => {
  const suggestions = [
    {
      exception_id: '1',
      title: 'Suggestion A',
      description: 'd',
      trade_id: 'T1',
      similarity_score: 88,
    },
    {
      exception_id: '2',
      title: 'Suggestion B',
      description: 'd',
      trade_id: 'T2',
      similarity_score: 81,
    },
  ];

  it('renders filtered suggestions and triggers click callback', () => {
    const onSuggestionClick = vi.fn();

    render(
      <AISuggestionsTab
        aiSearching={false}
        aiSuggestions={suggestions}
        filteredSuggestions={suggestions}
        onSuggestionClick={onSuggestionClick}
        selectedSuggestion={suggestions[0]}
        loadingSolutionId={'2'}
      />
    );

    expect(screen.getByText('Suggestion A-true-false')).toBeInTheDocument();
    expect(screen.getByText('Suggestion B-false-true')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Suggestion B-false-true'));
    expect(onSuggestionClick).toHaveBeenCalledWith(suggestions[1]);
  });

  it('shows searching indicator while aiSearching is true', () => {
    render(
      <AISuggestionsTab
        aiSearching
        aiSuggestions={[]}
        filteredSuggestions={[]}
        onSuggestionClick={vi.fn()}
        selectedSuggestion={null}
        loadingSolutionId={null}
      />
    );

    expect(screen.getByText('AI is analyzing the exception...')).toBeInTheDocument();
  });
});
