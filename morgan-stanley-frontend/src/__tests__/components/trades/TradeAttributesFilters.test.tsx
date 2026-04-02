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

  it('renders clear buttons for non-all select values and clears each field', async () => {
    const onTradeIdChange = vi.fn()
    const onAccountChange = vi.fn()
    const onAssetTypeChange = vi.fn()
    const onBookingSystemChange = vi.fn()
    const onAffirmationSystemChange = vi.fn()
    const onClearingHouseChange = vi.fn()
    const onStatusChange = vi.fn()

    render(
      <TradeAttributesFilters
        tradeId="T001"
        account="ACC1"
        assetType="FX"
        bookingSystem="BK1"
        affirmationSystem="AS1"
        clearingHouse="CH1"
        status={[]}
        onTradeIdChange={onTradeIdChange}
        onAccountChange={onAccountChange}
        onAssetTypeChange={onAssetTypeChange}
        onBookingSystemChange={onBookingSystemChange}
        onAffirmationSystemChange={onAffirmationSystemChange}
        onClearingHouseChange={onClearingHouseChange}
        onStatusChange={onStatusChange}
        getUniqueAccounts={() => ['ACC1']}
        getUniqueAssetTypes={() => ['FX']}
        getUniqueBookingSystems={() => ['BK1']}
        getUniqueAffirmationSystems={() => ['AS1']}
        getUniqueClearingHouses={() => ['CH1']}
        getUniqueStatuses={() => ['PENDING']}
      />
    )

    const user = userEvent.setup()
    const clearButtons = screen.getAllByTitle('Clear filter')
    expect(clearButtons.length).toBeGreaterThanOrEqual(6)

    for (const btn of clearButtons) {
      await user.click(btn)
    }

    expect(onTradeIdChange).toHaveBeenCalledWith('')
    expect(onAccountChange).toHaveBeenCalledWith('all')
    expect(onAssetTypeChange).toHaveBeenCalledWith('all')
    expect(onBookingSystemChange).toHaveBeenCalledWith('all')
    expect(onAffirmationSystemChange).toHaveBeenCalledWith('all')
    expect(onClearingHouseChange).toHaveBeenCalledWith('all')
  })

  it('adds and removes status values when checkbox is toggled', async () => {
    const onStatusChange = vi.fn()

    render(
      <TradeAttributesFilters
        tradeId=""
        account="all"
        assetType="all"
        bookingSystem="all"
        affirmationSystem="all"
        clearingHouse="all"
        status={['PENDING']}
        onTradeIdChange={vi.fn()}
        onAccountChange={vi.fn()}
        onAssetTypeChange={vi.fn()}
        onBookingSystemChange={vi.fn()}
        onAffirmationSystemChange={vi.fn()}
        onClearingHouseChange={vi.fn()}
        onStatusChange={onStatusChange}
        getUniqueAccounts={() => []}
        getUniqueAssetTypes={() => []}
        getUniqueBookingSystems={() => []}
        getUniqueAffirmationSystems={() => []}
        getUniqueClearingHouses={() => []}
        getUniqueStatuses={() => ['PENDING', 'CLEARED']}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('CLEARED'))
    await user.click(screen.getByText('PENDING'))

    expect(onStatusChange).toHaveBeenCalled()
    const payloads = onStatusChange.mock.calls.map((call) => call[0] as string[])
    expect(payloads.some((v) => v.includes('CLEARED'))).toBe(true)
    expect(payloads.some((v) => !v.includes('PENDING'))).toBe(true)
  })
})
