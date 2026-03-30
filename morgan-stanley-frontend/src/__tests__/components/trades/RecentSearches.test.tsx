import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { RecentSearches, RecentSearch } from '../../../components/trades/RecentSearches'

describe('RecentSearches', () => {
  test('shows empty state when no searches', () => {
    const onSearchClick = vi.fn()
    const onDeleteSearch = vi.fn()
    const onClearAll = vi.fn()

    render(
      <RecentSearches
        searches={[]}
        onSearchClick={onSearchClick}
        onDeleteSearch={onDeleteSearch}
        onClearAll={onClearAll}
      />
    )

    expect(screen.getByText(/No recent searches yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Clear All/i })).not.toBeInTheDocument()
  })

  test('renders search items, formats timestamps, and handles interactions', async () => {
    // freeze time to a known point by mocking Date.now
    const now = new Date('2026-03-30T12:00:00Z').getTime()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const onSearchClick = vi.fn()
    const onDeleteSearch = vi.fn()
    const onClearAll = vi.fn()

    const searches: RecentSearch[] = [
      { id: '1', query: 'apple', timestamp: now - 30 * 1000 }, // Just now
      { id: '2', query: 'banana', timestamp: now - 2 * 3600000 }, // 2h ago
    ]

    render(
      <RecentSearches
        searches={searches}
        onSearchClick={onSearchClick}
        onDeleteSearch={onDeleteSearch}
        onClearAll={onClearAll}
      />
    )

    // Clear All exists
    const clearBtn = screen.getByRole('button', { name: /Clear All/i })
    await userEvent.click(clearBtn)
    expect(onClearAll).toHaveBeenCalled()

    // Items rendered with correct queries
    expect(screen.getByText('apple')).toBeInTheDocument()
    expect(screen.getByText('banana')).toBeInTheDocument()

    // Clicking the main item triggers search
    const appleMainBtn = screen.getByText('apple').closest('button') as HTMLElement
    await userEvent.click(appleMainBtn)
    expect(onSearchClick).toHaveBeenCalledWith('apple')

    // The delete button is the sibling of the main button
    const appleDeleteBtn = appleMainBtn.nextElementSibling as HTMLElement
    await userEvent.click(appleDeleteBtn)
    expect(onDeleteSearch).toHaveBeenCalledWith('1')

    nowSpy.mockRestore()
  })
})
