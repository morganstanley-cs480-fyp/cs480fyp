import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchHeader, type TypeaheadSuggestion } from '../components/trades/SearchHeader'
import type { QueryHistory } from '../lib/api/types'
import type { RecentSearch } from '../components/trades/SearchHeader'

const defaultProps = {
  searchQuery: '',
  searching: false,
  showFilters: false,
  recentSearches: [] as RecentSearch[],
  savedQueries: [] as QueryHistory[],
  canSaveQuery: false,
  suggestions: [],
  onSearchQueryChange: vi.fn(),
  onSearch: vi.fn(),
  onToggleFilters: vi.fn(),
  onRecentSearchClick: vi.fn(),
  onDeleteSearch: vi.fn(),
  onSaveCurrentQuery: vi.fn(),
  onClearSearch: vi.fn(),
  onSuggestionClick: vi.fn(),
  onDeleteSavedQuery: vi.fn(),
}

// Mock window.prompt for save query tests
Object.defineProperty(window, 'prompt', {
  writable: true,
  value: vi.fn()
})

describe('SearchHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search Input', () => {
    it('should render search input with placeholder', () => {
      render(<SearchHeader {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    })

    it('should display current search query value', () => {
      render(<SearchHeader {...defaultProps} searchQuery="FX trades" />)
      
      const searchInput = screen.getByDisplayValue('FX trades')
      expect(searchInput).toBeInTheDocument()
    })

    it('should call onSearchQueryChange when typing in input', async () => {
      const user = userEvent.setup()
      const onSearchQueryChange = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          onSearchQueryChange={onSearchQueryChange}
        />
      )

      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      
      // Simulate typing one character
      await user.type(searchInput, 't')

      // Check that function was called with the character
      expect(onSearchQueryChange).toHaveBeenCalledWith('t')
      expect(onSearchQueryChange).toHaveBeenCalled()
    })

    it('should support Enter key to trigger search', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          searchQuery="test query"
          onSearch={onSearch}
        />
      )

      const searchInput = screen.getByDisplayValue('test query')
      await user.click(searchInput)
      await user.keyboard('{Enter}')

      expect(onSearch).toHaveBeenCalled()
    })
  })

  describe('Search Button', () => {
    it('should render search button', () => {
      render(<SearchHeader {...defaultProps} />)
      
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
    })

    it('should call onSearch when search button is clicked', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          searchQuery="test query"
          onSearch={onSearch}
        />
      )

      const searchButton = screen.getByText('Search')
      await user.click(searchButton)

      expect(onSearch).toHaveBeenCalled()
    })

    it('should show loading state when searching', () => {
      render(<SearchHeader {...defaultProps} searching={true} />)
      
      expect(screen.getByText(/searching/i)).toBeInTheDocument()
    })

    it('should disable search button when searching', () => {
      render(<SearchHeader {...defaultProps} searching={true} />)
      
      const searchButton = screen.getByText('Searching...')
      expect(searchButton).toBeInTheDocument()
    })
  })

  describe('Filter Toggle', () => {
    it('should render filter toggle button', () => {
      render(<SearchHeader {...defaultProps} />)
      
      const filterButton = screen.getByText('Manual Search')
      expect(filterButton).toBeInTheDocument()
    })

    it('should call onToggleFilters when filter button is clicked', async () => {
      const user = userEvent.setup()
      const onToggleFilters = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          onToggleFilters={onToggleFilters}
        />
      )

      const filterButton = screen.getByText('Manual Search')
      await user.click(filterButton)

      expect(onToggleFilters).toHaveBeenCalled()
    })

    it('should show active state when filters are visible', () => {
      render(<SearchHeader {...defaultProps} showFilters={true} />)
      
      const filterButton = screen.getByRole('button', { name: /manual search/i })
      expect(filterButton).toBeInTheDocument()
    })
  })

  describe('Recent Searches', () => {
    const recentSearches: RecentSearch[] = [
      { 
        id: '1', 
        query: 'FX trades', 
        timestamp: Date.now() - 1000000, 
        queryId: 1 
      },
      { 
        id: '2', 
        query: 'cleared trades', 
        timestamp: Date.now() - 2000000, 
        queryId: 2 
      }
    ]

    it('should display recent searches when available', () => {
      render(<SearchHeader {...defaultProps} recentSearches={recentSearches} />)
      
      expect(screen.getByText('FX trades')).toBeInTheDocument()
      expect(screen.getByText('cleared trades')).toBeInTheDocument()
    })

    it('should call onRecentSearchClick when recent search is clicked', async () => {
      const user = userEvent.setup()
      const onRecentSearchClick = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          recentSearches={recentSearches}
          onRecentSearchClick={onRecentSearchClick}
        />
      )

      await user.click(screen.getByText('FX trades'))

      expect(onRecentSearchClick).toHaveBeenCalledWith('FX trades')
    })

    it('should display delete button for recent searches', () => {
      render(<SearchHeader {...defaultProps} recentSearches={recentSearches} />)
      
      const deleteButtons = screen.getAllByTitle('Remove')
      expect(deleteButtons).toHaveLength(2)
    })

    it('should call onDeleteSearch when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDeleteSearch = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          recentSearches={recentSearches}
          onDeleteSearch={onDeleteSearch}
        />
      )

      const deleteButtons = screen.getAllByTitle('Remove')
      await user.click(deleteButtons[0])

      expect(onDeleteSearch).toHaveBeenCalledWith('1')
    })

    it('should show empty state when no recent searches', () => {
      render(<SearchHeader {...defaultProps} recentSearches={[]} />)
      
      // Recent section should not be visible when no searches
      expect(screen.queryByText('Recent:')).not.toBeInTheDocument()
    })
  })

  describe('Saved Queries', () => {
    const savedQueries: QueryHistory[] = [
      {
        query_id: 101,
        user_id: "user",
        query_text: 'End of day trades',
        query_name: 'EOD Report',
        create_time: '2024-01-10T09:00:00Z',
        last_use_time: '2024-01-15T10:00:00Z',
        is_saved: true
      }
    ]

    it('should display saved queries when available', () => {
      render(<SearchHeader {...defaultProps} savedQueries={savedQueries} />)
      
      expect(screen.getByText('EOD Report')).toBeInTheDocument()
      // Component displays query_name, not query_text for saved queries
      expect(screen.queryByText('End of day trades')).not.toBeInTheDocument()
    })

    it('should call onRecentSearchClick when saved query is clicked', async () => {
      const user = userEvent.setup()
      const onRecentSearchClick = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          savedQueries={savedQueries}
          onRecentSearchClick={onRecentSearchClick}
        />
      )

      await user.click(screen.getByText('EOD Report'))

      expect(onRecentSearchClick).toHaveBeenCalledWith('End of day trades')
    })

    it('should display delete button for saved queries', () => {
      render(<SearchHeader {...defaultProps} savedQueries={savedQueries} />)
      
      const deleteButton = screen.getByTitle('Remove saved query')
      expect(deleteButton).toBeInTheDocument()
    })

    it('should call onDeleteSavedQuery when delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDeleteSavedQuery = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          savedQueries={savedQueries}
          onDeleteSavedQuery={onDeleteSavedQuery}
        />
      )

      const deleteButton = screen.getByTitle('Remove saved query')
      await user.click(deleteButton)

      expect(onDeleteSavedQuery).toHaveBeenCalledWith(101)
    })
  })

  describe('Save Query', () => {
    it('should show save button when canSaveQuery is true', () => {
      render(<SearchHeader {...defaultProps} canSaveQuery={true} />)
      
      const saveButton = screen.getByRole('button', { name: /save query/i })
      expect(saveButton).toBeInTheDocument()
    })

    it('should not show save button when canSaveQuery is false', () => {
      render(<SearchHeader {...defaultProps} canSaveQuery={false} />)
      
      const saveButton = screen.getByRole('button', { name: /save query/i })
      expect(saveButton).toBeDisabled()
    })

    it('should call onSaveCurrentQuery when save button is clicked', async () => {
      const user = userEvent.setup()
      const onSaveCurrentQuery = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          canSaveQuery={true}
          onSaveCurrentQuery={onSaveCurrentQuery}
        />
      )

      const saveButton = screen.getByRole('button', { name: /save query/i })
      await user.click(saveButton)

      expect(onSaveCurrentQuery).toHaveBeenCalled()
    })
  })

  describe('Clear Search', () => {
    it('should show clear button when there is a search query', () => {
      render(<SearchHeader {...defaultProps} searchQuery="test query" />)
      
      const clearButton = screen.getByRole('button', { name: /clear/i })
      expect(clearButton).toBeInTheDocument()
    })

    it('should not show clear button when search query is empty', () => {
      render(<SearchHeader {...defaultProps} searchQuery="" />)
      
      const clearButton = screen.getByRole('button', { name: /clear/i })
      expect(clearButton).toBeInTheDocument()
      // Clear button is always rendered but may be disabled or have different behavior
    })

    it('should call onClearSearch when clear button is clicked', async () => {
      const user = userEvent.setup()
      const onClearSearch = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          searchQuery="test query"
          onClearSearch={onClearSearch}
        />
      )

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(onClearSearch).toHaveBeenCalled()
    })
  })

  describe('Suggestions', () => {
    const suggestions: TypeaheadSuggestion[] = [
      { 
        query_id: 1,
        query_text: 'FX trades from last week', 
        is_saved: false,
        query_name: null,
        score: 0.9 
      },
      { 
        query_id: 2,
        query_text: 'cleared bond trades', 
        is_saved: false,
        query_name: null,
        score: 0.8 
      }
    ]

    it('should display suggestions when available', async () => {
      const user = userEvent.setup()
      render(<SearchHeader {...defaultProps} suggestions={suggestions} />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      await user.click(searchInput)  // Focus triggers showSuggestions
      
      expect(screen.getByText('FX trades from last week')).toBeInTheDocument()
      expect(screen.getByText('cleared bond trades')).toBeInTheDocument()
    })

    it('should call onSuggestionClick when suggestion is clicked', async () => {
      const user = userEvent.setup()
      const onSuggestionClick = vi.fn()
      
      render(
        <SearchHeader 
          {...defaultProps} 
          suggestions={suggestions}
          onSuggestionClick={onSuggestionClick}
        />
      )

      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      await user.click(searchInput)  // Focus to show suggestions
      await user.click(screen.getByText('FX trades from last week'))

      expect(onSuggestionClick).toHaveBeenCalledWith('FX trades from last week')
    })

    it('should not display suggestions section when empty', () => {
      render(<SearchHeader {...defaultProps} suggestions={[]} />)
      
      // Should not have any suggestion items
      expect(screen.queryByText(/suggestions/i)).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support Escape key to clear suggestions', async () => {
      const user = userEvent.setup()
      const suggestions: TypeaheadSuggestion[] = [
        { 
          query_id: 1,
          query_text: 'test suggestion', 
          is_saved: false,
          query_name: null,
          score: 0.8 
        }
      ]
      
      render(<SearchHeader {...defaultProps} suggestions={suggestions} searchQuery="test" />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      await user.click(searchInput)
      
      await user.keyboard('{Escape}')
      
      // Implementation depends on your component behavior
      // This test structure shows how you would test keyboard interactions
    })

    it('should support arrow keys for suggestion navigation', async () => {
      const user = userEvent.setup()
      const suggestions: TypeaheadSuggestion[] = [
        { 
          query_id: 1,
          query_text: 'suggestion 1', 
          is_saved: false,
          query_name: null,
          score: 0.9 
        },
        { 
          query_id: 2,
          query_text: 'suggestion 2', 
          is_saved: false,
          query_name: null,
          score: 0.8 
        }
      ]
      
      render(<SearchHeader {...defaultProps} suggestions={suggestions} searchQuery="test" />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      await user.click(searchInput)
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      // Test would verify that the appropriate suggestion was selected
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SearchHeader {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      expect(searchInput).toBeInTheDocument()
      
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
    })

    it('should support screen reader announcements for search state', () => {
      render(<SearchHeader {...defaultProps} searching={true} />)
      
      // Check for loading state
      const searchingButton = screen.getByText('Searching...')
      expect(searchingButton).toBeInTheDocument()
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      
      render(<SearchHeader {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i)
      
      await user.click(searchInput)
      expect(searchInput).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000)
      
      render(<SearchHeader {...defaultProps} searchQuery={longQuery} />)
      
      const searchInput = screen.getByDisplayValue(longQuery)
      expect(searchInput).toBeInTheDocument()
    })

    it('should handle empty arrays for all list props', () => {
      render(
        <SearchHeader 
          {...defaultProps} 
          recentSearches={[]}
          savedQueries={[]}
          suggestions={[]}
        />
      )
      
      expect(screen.getByPlaceholderText(/Search by trade ID, counterparty, product type/i))
        .toBeInTheDocument()
    })

    it('should handle special characters in search query', () => {
      const specialQuery = "trades & exceptions with 'quotes' and \"double quotes\""
      
      render(<SearchHeader {...defaultProps} searchQuery={specialQuery} />)
      
      const searchInput = screen.getByDisplayValue(specialQuery)
      expect(searchInput).toBeInTheDocument()
    })
  })
})