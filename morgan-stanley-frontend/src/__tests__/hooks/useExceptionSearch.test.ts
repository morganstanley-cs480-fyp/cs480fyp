import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useExceptionSearch } from '../../hooks/useExceptionSearch'

vi.mock('../../lib/api/exceptionService', () => ({
  exceptionService: {
    getExceptions: vi.fn()
  }
}))

import { exceptionService } from '../../lib/api/exceptionService'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchInterval: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

describe('useExceptionSearch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads exceptions and returns results', async () => {
    const mockExceptions = [
      { id: 1, message: 'e1' },
      { id: 2, message: 'e2' }
    ]

    vi.mocked(exceptionService.getExceptions).mockResolvedValue(mockExceptions as any)

    const { result } = renderHook(() => useExceptionSearch(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    expect(result.current.data?.results).toHaveLength(2)
    expect(exceptionService.getExceptions).toHaveBeenCalled()
  })

  it('handles errors from the exception service', async () => {
    const err = new Error('Service down')
    vi.mocked(exceptionService.getExceptions).mockRejectedValue(err)

    const { result } = renderHook(() => useExceptionSearch(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error).toEqual(err)
    })

    expect(result.current.data).toBeUndefined()
  })
})
