import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { DateRangeFilter } from '../../../components/trades/DateRangeFilter'

describe('DateRangeFilter', () => {
  test('renders radios and quick-range buttons, and calls handlers', async () => {
    const onDateTypeChange = vi.fn()
    const onDateFromChange = vi.fn()
    const onDateToChange = vi.fn()
    const onQuickDateRange = vi.fn()

    render(
      <DateRangeFilter
        dateType="create_time"
        dateFrom=""
        dateTo=""
        onDateTypeChange={onDateTypeChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onQuickDateRange={onQuickDateRange}
      />
    )

    // radios
    const updateRadio = screen.getByRole('radio', { name: /Update Date/i })
    const createRadio = screen.getByRole('radio', { name: /Create Date/i })
    expect(createRadio).toBeChecked()
    expect(updateRadio).not.toBeChecked()

    await userEvent.click(updateRadio)
    expect(onDateTypeChange).toHaveBeenCalledWith('update_time')

    // quick range buttons
    const todayBtn = screen.getByRole('button', { name: /Today/i })
    await userEvent.click(todayBtn)
    expect(onQuickDateRange).toHaveBeenCalledWith('today')

    const oneWeek = screen.getByRole('button', { name: /1 Week/i })
    await userEvent.click(oneWeek)
    expect(onQuickDateRange).toHaveBeenCalledWith('1week')
  })

  test('date inputs change and clear buttons invoke handlers', async () => {
    const onDateTypeChange = vi.fn()
    const onDateFromChange = vi.fn()
    const onDateToChange = vi.fn()
    const onQuickDateRange = vi.fn()

    render(
      <DateRangeFilter
        dateType="create_time"
        dateFrom="2025-05-01"
        dateTo="2025-05-10"
        onDateTypeChange={onDateTypeChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onQuickDateRange={onQuickDateRange}
      />
    )

    const fromInput = screen.getByDisplayValue('2025-05-01')
    const toInput = screen.getByDisplayValue('2025-05-10')

    // change values
    fireEvent.change(fromInput, { target: { value: '2025-05-02' } })
    expect(onDateFromChange).toHaveBeenCalledWith('2025-05-02')

    fireEvent.change(toInput, { target: { value: '2025-05-11' } })
    expect(onDateToChange).toHaveBeenCalledWith('2025-05-11')

    // clear buttons (they have title "Clear date")
    const clearButtons = screen.getAllByTitle('Clear date')
    expect(clearButtons.length).toBeGreaterThanOrEqual(2)
    await userEvent.click(clearButtons[0])
    expect(onDateFromChange).toHaveBeenCalledWith('')
  })
})
