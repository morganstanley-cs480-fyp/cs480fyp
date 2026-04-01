import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTransactions } from '../../hooks/useTransactions'

vi.mock('../../lib/api/tradeFlowService', () => ({
  tradeFlowService: {
    getTransactionsByTradeId: vi.fn()
  }
}))

import { tradeFlowService } from '../../lib/api/tradeFlowService'

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty state when tradeId is null', () => {
    const { result } = renderHook(() => useTransactions(null))
    expect(result.current.transactions).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches and sorts transactions on success', async () => {
    const unsorted = [
      { id: 2, step: 20 },
      { id: 1, step: 10 }
    ]
    vi.mocked(tradeFlowService.getTransactionsByTradeId).mockResolvedValue(unsorted as any)

    const { result } = renderHook(() => useTransactions(123))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.transactions).toHaveLength(2)
    expect(result.current.transactions[0].step).toBe(10)
  })

  it('handles errors from tradeFlowService', async () => {
    const err = new Error('Network')
    vi.mocked(tradeFlowService.getTransactionsByTradeId).mockRejectedValue(err)

    const { result } = renderHook(() => useTransactions(999))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.transactions).toEqual([])
    expect(result.current.error).toBe(err.message)
  })
})
