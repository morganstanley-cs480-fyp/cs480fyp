import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TradeAttributesFilters } from '../../../../src/components/trades/TradeAttributesFilters'

describe('TradeAttributesFilters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders inputs and calls handlers on change and clear', async () => {
    const onTradeIdChange = vi.fn()
    const onAccountChange = vi.fn()
    const onAssetTypeChange = vi.fn()
    const onBookingSystemChange = vi.fn()
    const onAffirmationSystemChange = vi.fn()
    const onClearingHouseChange = vi.fn()
    const onStatusChange = vi.fn()

    const getUniqueAccounts = () => ['ACC1', 'ACC2']
    const getUniqueAssetTypes = () => ['EQ', 'FX']
    const getUniqueBookingSystems = () => ['BK1']
    const getUniqueAffirmationSystems = () => ['AS1']
    const getUniqueClearingHouses = () => ['CH1']
    const getUniqueStatuses = () => ['CLEARED', 'PENDING']

    render(
      <TradeAttributesFilters
        tradeId="T001"
        account="all"
        assetType="all"
        bookingSystem="all"
        affirmationSystem="all"
        clearingHouse="all"
        status={[]}
        onTradeIdChange={onTradeIdChange}
        onAccountChange={onAccountChange}
        onAssetTypeChange={onAssetTypeChange}
        onBookingSystemChange={onBookingSystemChange}
        onAffirmationSystemChange={onAffirmationSystemChange}
        onClearingHouseChange={onClearingHouseChange}
        onStatusChange={onStatusChange}
        getUniqueAccounts={getUniqueAccounts}
        getUniqueAssetTypes={getUniqueAssetTypes}
        getUniqueBookingSystems={getUniqueBookingSystems}
        getUniqueAffirmationSystems={getUniqueAffirmationSystems}
        getUniqueClearingHouses={getUniqueClearingHouses}
        getUniqueStatuses={getUniqueStatuses}
      />
    )

    // Trade ID input exists and has value
    const tradeInput = screen.getByPlaceholderText('Enter trade ID...') as HTMLInputElement
    expect(tradeInput).toBeInTheDocument()
    expect(tradeInput.value).toBe('T001')

    // Clear button should be present for trade id
    const clearBtn = screen.getByTitle('Clear filter')
    expect(clearBtn).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(clearBtn)
    expect(onTradeIdChange).toHaveBeenCalledWith('')
  })
})
