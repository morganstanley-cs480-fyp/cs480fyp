import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { SavedQueriesPanel } from '../../../components/trades/SavedQueriesPanel'

describe('SavedQueriesPanel', () => {
  test('shows empty state when no saved queries', () => {
    const onSelectQuery = vi.fn()
    const onDeleteQuery = vi.fn()

    render(
      <SavedQueriesPanel savedQueries={[]} onSelectQuery={onSelectQuery} onDeleteQuery={onDeleteQuery} />
    )

    expect(screen.getByText(/No Saved Queries/i)).toBeInTheDocument()
    expect(screen.getByText(/Save frequently used searches/i)).toBeInTheDocument()
  })

  test('renders saved queries and handles select and delete', async () => {
    const now = new Date('2026-03-30T12:00:00Z').getTime()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const onSelectQuery = vi.fn()
    const onDeleteQuery = vi.fn()

    const savedQueries = [
      {
        query_id: 101,
        query_name: 'Find Apples',
        query_text: 'select * from apples',
        last_use_time: new Date(now - 90 * 60000).toISOString(), // 90 minutes ago => 1h ago
      },
    ]

    render(
      <SavedQueriesPanel savedQueries={savedQueries as any} onSelectQuery={onSelectQuery} onDeleteQuery={onDeleteQuery} />
    )

    // header shows count
    expect(screen.getByText(/Saved Queries/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    // query name and text shown
    expect(screen.getByText('Find Apples')).toBeInTheDocument()
    expect(screen.getByText('select * from apples')).toBeInTheDocument()

    // clicking the main card selects query
    const cardButton = screen.getByText('Find Apples').closest('button') as HTMLElement
    await userEvent.click(cardButton)
    expect(onSelectQuery).toHaveBeenCalledWith('select * from apples')

    // delete button (title="Delete query")
    const deleteBtn = screen.getByTitle('Delete query')
    await userEvent.click(deleteBtn)
    expect(onDeleteQuery).toHaveBeenCalledWith(101)

    nowSpy.mockRestore()
  })

  test('formats timestamps across minute, hour, and day buckets', () => {
    const now = Date.now()

    render(
      <SavedQueriesPanel
        savedQueries={[
          {
            query_id: 1,
            query_name: 'Minute',
            query_text: 'select 1',
            last_use_time: new Date(now - 30 * 1000).toISOString(),
          },
          {
            query_id: 2,
            query_name: 'Hour',
            query_text: 'select 2',
            last_use_time: new Date(now - 90 * 60000).toISOString(),
          },
          {
            query_id: 3,
            query_name: 'Day',
            query_text: 'select 3',
            last_use_time: new Date(now - 3 * 86400000).toISOString(),
          },
        ] as any}
        onSelectQuery={vi.fn()}
        onDeleteQuery={vi.fn()}
      />
    )

    expect(screen.getByText(/Just now/i)).toBeInTheDocument()
    expect(screen.getByText(/1h ago/i)).toBeInTheDocument()
    expect(screen.getByText(/3d ago/i)).toBeInTheDocument()
  })
})
