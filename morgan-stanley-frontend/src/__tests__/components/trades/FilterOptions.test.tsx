import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FilterOptions } from '../../../components/trades/FilterOptions'

describe('FilterOptions', () => {
  test('checkbox toggles and buttons call handlers', async () => {
    const onWithExceptionsChange = vi.fn()
    const onClearedTradesChange = vi.fn()
    const onClearFilters = vi.fn()
    const onSearch = vi.fn()

    render(
      <FilterOptions
        withExceptionsOnly={false}
        clearedTradesOnly={true}
        searching={false}
        onWithExceptionsChange={onWithExceptionsChange}
        onClearedTradesChange={onClearedTradesChange}
        onClearFilters={onClearFilters}
        onSearch={onSearch}
      />
    )

    const withExceptionsCheckbox = screen.getByRole('checkbox', { name: /With Exceptions Only/i })
    const clearedTradesCheckbox = screen.getByRole('checkbox', { name: /Cleared Trades Only/i })
    expect(withExceptionsCheckbox).not.toBeChecked()
    expect(clearedTradesCheckbox).toBeChecked()

    await userEvent.click(withExceptionsCheckbox)
    expect(onWithExceptionsChange).toHaveBeenCalled()

    await userEvent.click(clearedTradesCheckbox)
    expect(onClearedTradesChange).toHaveBeenCalled()

    const clearBtn = screen.getByRole('button', { name: /Clear All Filters/i })
    await userEvent.click(clearBtn)
    expect(onClearFilters).toHaveBeenCalled()

    const searchBtn = screen.getByRole('button', { name: /Search/i })
    await userEvent.click(searchBtn)
    expect(onSearch).toHaveBeenCalled()
  })
})
