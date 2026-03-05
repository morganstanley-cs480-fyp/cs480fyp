import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useTradeSearch } from '../hooks/useTradeSearch'
import { searchService } from '../lib/api/searchService'
import type { SearchRequest, ManualSearchFilters } from '../lib/api/types'

// Mock the search service
vi.mock('../lib/api/searchService', () => ({
  searchService: {
    searchTrades: vi.fn()
  }
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        staleTime: 0, // Disable stale time for tests
        refetchInterval: false, // Disable auto refetch for tests
      },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTradeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Execution', () => {
    it('should return undefined data when searchParams is null', () => {
      const { result } = renderHook(() => useTradeSearch(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should fetch data when natural language searchParams is provided', async () => {
      const mockResponse = {
        results: [
          { trade_id: 'T001', account: 'ACC001', status: 'CLEARED' },
          { trade_id: 'T002', account: 'ACC002', status: 'PENDING' }
        ],
        query_id: 123
      }
      
      vi.mocked(searchService.searchTrades).mockResolvedValue(mockResponse)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'show me cleared trades'
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.error).toBeNull()
      expect(searchService.searchTrades).toHaveBeenCalledWith(searchParams)
      expect(searchService.searchTrades).toHaveBeenCalledTimes(1)
    })

    it('should fetch data when manual searchParams is provided', async () => {
      const mockResponse = {
        results: [
          { trade_id: 'T003', account: 'ACC003', status: 'EXCEPTION' }
        ],
        query_id: 456
      }
      
      vi.mocked(searchService.searchTrades).mockResolvedValue(mockResponse)

      const filters: ManualSearchFilters = {
        trade_id: 'T003',
        account: 'ACC003',
        asset_type: 'FX',
        date_type: 'update_time'
      }

      const searchParams: SearchRequest = {
        search_type: 'manual',
        user_id: 'test-user',
        filters
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(searchService.searchTrades).toHaveBeenCalledWith(searchParams)
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error: Invalid search parameters')
      vi.mocked(searchService.searchTrades).mockRejectedValue(mockError)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'invalid query'
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError)
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Query Key Changes', () => {
    it('should refetch when searchParams change', async () => {
      const mockResponse1 = {
        results: [{ trade_id: 'T001', status: 'CLEARED' }],
        query_id: 111
      }
      const mockResponse2 = {
        results: [{ trade_id: 'T002', status: 'PENDING' }],
        query_id: 222
      }
      
      vi.mocked(searchService.searchTrades)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const searchParams1: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'cleared trades'
      }

      const { result, rerender } = renderHook(
        ({ params }) => useTradeSearch(params),
        {
          wrapper: createWrapper(),
          initialProps: { params: searchParams1 }
        }
      )

      // Wait for first query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockResponse1)
      expect(searchService.searchTrades).toHaveBeenCalledTimes(1)

      // Change searchParams
      const searchParams2: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'pending trades'
      }

      rerender({ params: searchParams2 })

      // Should trigger new query
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse2)
      })

      expect(searchService.searchTrades).toHaveBeenCalledTimes(2)
      expect(searchService.searchTrades).toHaveBeenNthCalledWith(1, searchParams1)
      expect(searchService.searchTrades).toHaveBeenNthCalledWith(2, searchParams2)
    })

    it('should not refetch when switching from valid params to null', async () => {
      const mockResponse = {
        results: [{ trade_id: 'T001' }],
        query_id: 123
      }
      
      vi.mocked(searchService.searchTrades).mockResolvedValue(mockResponse)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'test query'
      }

      const { result, rerender } = renderHook(
        ({ params }) => useTradeSearch(params),
        {
          wrapper: createWrapper(),
          initialProps: { params: searchParams }
        }
      )

      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse)
      })

      expect(searchService.searchTrades).toHaveBeenCalledTimes(1)

      // Switch to null params
      rerender({ params: null })

      // Should not trigger new fetch but data might be undefined
      expect(result.current.data).toBeUndefined()
      expect(searchService.searchTrades).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading States', () => {
    it('should show loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      vi.mocked(searchService.searchTrades).mockReturnValue(promise)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'test query'
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      // Should be loading initially
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
      expect(result.current.error).toBeNull()

      // Resolve the promise
      resolvePromise!({ results: [], query_id: 123 })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual({ results: [], query_id: 123 })
    })

    it('should handle multiple rapid searchParam changes', async () => {
      const mockResponses = [
        { results: [{ trade_id: 'T001' }], query_id: 111 },
        { results: [{ trade_id: 'T002' }], query_id: 222 },
        { results: [{ trade_id: 'T003' }], query_id: 333 }
      ]
      
      vi.mocked(searchService.searchTrades)
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])

      const { result, rerender } = renderHook(
        ({ query }) => useTradeSearch({
          search_type: 'natural_language',
          user_id: 'test-user',
          query_text: query
        }),
        {
          wrapper: createWrapper(),
          initialProps: { query: 'query1' }
        }
      )

      // Rapid changes
      rerender({ query: 'query2' })
      rerender({ query: 'query3' })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have the latest data
      expect(result.current.data).toEqual(mockResponses[2])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const mockResponse = {
        results: [],
        query_id: 123
      }
      
      vi.mocked(searchService.searchTrades).mockResolvedValue(mockResponse)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'nonexistent trades'
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse)
      })

      expect(result.current.data.results).toHaveLength(0)
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'TimeoutError'
      
      vi.mocked(searchService.searchTrades).mockRejectedValue(timeoutError)

      const searchParams: SearchRequest = {
        search_type: 'manual',
        user_id: 'test-user',
        filters: { date_type: 'update_time' }
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toEqual(timeoutError)
      })

      expect(result.current.data).toBeUndefined()
    })

    it('should handle malformed response data', async () => {
      const malformedResponse = {
        // Missing required fields
        data: 'invalid'
      }
      
      vi.mocked(searchService.searchTrades).mockResolvedValue(malformedResponse as any)

      const searchParams: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'test'
      }

      const { result } = renderHook(() => useTradeSearch(searchParams), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toEqual(malformedResponse)
      })

      // Should still complete without throwing
      expect(result.current.error).toBeNull()
    })
  })
})