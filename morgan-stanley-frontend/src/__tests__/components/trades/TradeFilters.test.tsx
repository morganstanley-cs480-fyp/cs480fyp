import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
