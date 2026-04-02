import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeFilters, type ManualSearchFilters } from '../../../../src/components/trades/TradeFilters'

describe('TradeFilters', () => {
  beforeEach(() => vi.clearAllMocks())

  const baseFilters: ManualSearchFilters = {
    trade_id: '',
    account: 'all',
    asset_type: 'all',
    booking_system: 'all',
    affirmation_system: 'all',
    clearing_house: 'all',
    status: [],
    date_type: 'create_time',
    date_from: '',
    date_to: '',
    with_exceptions_only: false,
    cleared_trades_only: false,
  }

  it('invokes onFiltersChange when quick date range is selected', async () => {
    const onFiltersChange = vi.fn()
    const onSearch = vi.fn()
    const onClearFilters = vi.fn()

    render(
      <TradeFilters
        filters={baseFilters}
        searching={false}
        onFiltersChange={onFiltersChange}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        getUniqueAccounts={() => []}
        getUniqueAssetTypes={() => []}
        getUniqueBookingSystems={() => []}
        getUniqueAffirmationSystems={() => []}
        getUniqueClearingHouses={() => []}
        getUniqueStatuses={() => []}
      />
    )

    const user = userEvent.setup()
    // Click 1 Week quick range
    const oneWeek = screen.getByRole('button', { name: /1 Week/i })
    await user.click(oneWeek)

    expect(onFiltersChange).toHaveBeenCalled()
    const newFilters = onFiltersChange.mock.calls[0][0]
    // date_to should be set to today's date string (YYYY-MM-DD)
    expect(typeof newFilters.date_to).toBe('string')
    expect(newFilters.date_to.length).toBe(10)
  })

  it('handles all quick date range buttons', async () => {
    const onFiltersChange = vi.fn()

    render(
      <TradeFilters
        filters={baseFilters}
        searching={false}
        onFiltersChange={onFiltersChange}
        onSearch={vi.fn()}
        onClearFilters={vi.fn()}
        getUniqueAccounts={() => []}
        getUniqueAssetTypes={() => []}
        getUniqueBookingSystems={() => []}
        getUniqueAffirmationSystems={() => []}
        getUniqueClearingHouses={() => []}
        getUniqueStatuses={() => []}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Today/i }))
    fireEvent.click(screen.getByRole('button', { name: /3 Days/i }))
    fireEvent.click(screen.getByRole('button', { name: /1 Week/i }))
    fireEvent.click(screen.getByRole('button', { name: /2 Weeks/i }))
    fireEvent.click(screen.getByRole('button', { name: /1 Month/i }))

    expect(onFiltersChange).toHaveBeenCalledTimes(5)

    const payloads = onFiltersChange.mock.calls.map((call) => call[0])
    payloads.forEach((payload) => {
      expect(typeof payload.date_to).toBe('string')
      expect(payload.date_to.length).toBe(10)
      expect(typeof payload.date_from).toBe('string')
      expect(payload.date_from.length).toBe(10)
    })
  })

  it('propagates search and clear actions from FilterOptions', async () => {
    const onSearch = vi.fn()
    const onClearFilters = vi.fn()

    render(
      <TradeFilters
        filters={baseFilters}
        searching={false}
        onFiltersChange={vi.fn()}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        getUniqueAccounts={() => []}
        getUniqueAssetTypes={() => []}
        getUniqueBookingSystems={() => []}
        getUniqueAffirmationSystems={() => []}
        getUniqueClearingHouses={() => []}
        getUniqueStatuses={() => []}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Search/i }))
    fireEvent.click(screen.getByRole('button', { name: /Clear All Filters/i }))

    expect(onSearch).toHaveBeenCalled()
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('propagates checkbox toggles via onFiltersChange', async () => {
    const onFiltersChange = vi.fn()

    render(
      <TradeFilters
        filters={baseFilters}
        searching={false}
        onFiltersChange={onFiltersChange}
        onSearch={vi.fn()}
        onClearFilters={vi.fn()}
        getUniqueAccounts={() => []}
        getUniqueAssetTypes={() => []}
        getUniqueBookingSystems={() => []}
        getUniqueAffirmationSystems={() => []}
        getUniqueClearingHouses={() => []}
        getUniqueStatuses={() => []}
      />
    )

    fireEvent.click(screen.getByText(/With Exceptions Only/i))
    fireEvent.click(screen.getByText(/Cleared Trades Only/i))

    expect(onFiltersChange).toHaveBeenCalled()
    const calls = onFiltersChange.mock.calls.map((c) => c[0])
    expect(calls.some((c) => c.with_exceptions_only === true)).toBe(true)
    expect(calls.some((c) => c.cleared_trades_only === true)).toBe(true)
  })
})
