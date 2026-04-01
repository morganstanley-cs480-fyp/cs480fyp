import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TradeStatsCards } from '../../../../src/components/trades/TradeStatsCards'

describe('TradeStatsCards', () => {
  it('renders cards with correct counts', () => {
    const trades = [
      { id: 1, status: 'CLEARED' },
      { id: 2, status: 'CLEARED' },
      { id: 3, status: 'ALLEGED' },
      { id: 4, status: 'REJECTED' },
    ] as any

    render(<TradeStatsCards trades={trades} />)

    // CLEARED count should be 2
    expect(screen.getByText('CLEARED')).toBeInTheDocument()
    // Find the CLEARED card and its count
    const clearedLabel = screen.getByText('CLEARED')
    const clearedCountDiv = clearedLabel.parentElement?.nextElementSibling as HTMLElement
    expect(clearedCountDiv).toHaveTextContent('2')

    // ALLEGED count should be 1 (locate it relative to its label)
    const allegedLabel = screen.getByText('ALLEGED')
    const allegedCountDiv = allegedLabel.parentElement?.nextElementSibling as HTMLElement
    expect(allegedCountDiv).toHaveTextContent('1')
  })
})
