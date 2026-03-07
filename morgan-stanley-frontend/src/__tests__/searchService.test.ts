import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchService } from '../lib/api/searchService'
import { apiClient } from '../lib/api/client'
import type { SearchRequest, ManualSearchFilters } from '../lib/api/types'

// Mock the API client
vi.mock('../lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}))

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchTrades', () => {
    it('should call API with correct parameters for natural language search', async () => {
      const mockResponse = {
        results: [
          { trade_id: 'T001', account: 'ACC001', status: 'CLEARED' },
          { trade_id: 'T002', account: 'ACC002', status: 'PENDING' }
        ],
        query_id: 123
      }
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const request: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'show me cleared trades from last week'
      }

      const result = await searchService.searchTrades(request)

      expect(apiClient.post).toHaveBeenCalledWith('/api/search', request)
      expect(result).toEqual(mockResponse)
    })

    it('should call API with correct parameters for manual search', async () => {
      const mockResponse = {
        results: [
          { trade_id: 'T003', account: 'ACC003', status: 'EXCEPTION' }
        ],
        query_id: 456
      }
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const filters: ManualSearchFilters = {
        trade_id: 'T003',
        account: 'ACC003',
        asset_type: 'FX',
        status: ['EXCEPTION'],
        date_type: 'update_time',
        date_from: '2024-01-01',
        date_to: '2024-12-31'
      }

      const request: SearchRequest = {
        search_type: 'manual',
        user_id: 'test-user',
        filters
      }

      const result = await searchService.searchTrades(request)

      expect(apiClient.post).toHaveBeenCalledWith('/api/search', request)
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors properly', async () => {
      const mockError = new Error('Network error')
      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      const request: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'invalid query'
      }

      await expect(searchService.searchTrades(request)).rejects.toThrow('Network error')
      expect(apiClient.post).toHaveBeenCalledWith('/api/search', request)
    })

    it('should handle empty search results', async () => {
      const mockResponse = {
        results: [],
        query_id: 789
      }
      
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const request: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'nonexistent trades'
      }

      const result = await searchService.searchTrades(request)

      expect(result.results).toHaveLength(0)
      expect(result.query_id).toBe(789)
    })
  })

  describe('getSearchHistory', () => {
    it('should fetch search history with correct parameters', async () => {
      const mockHistory = [
        {
          query_id: 1,
          query_text: 'FX trades',
          last_use_time: '2024-01-15T10:00:00Z',
          use_count: 5
        },
        {
          query_id: 2, 
          query_text: 'cleared trades',
          last_use_time: '2024-01-14T15:30:00Z',
          use_count: 3
        }
      ]

      vi.mocked(apiClient.get).mockResolvedValue(mockHistory)

      const result = await searchService.getSearchHistory('test-user', 10)

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history?user_id=test-user&limit=10'
      )
      expect(result).toEqual(mockHistory)
    })

    it('should handle default limit when not provided', async () => {
      const mockHistory = []
      vi.mocked(apiClient.get).mockResolvedValue(mockHistory)

      await searchService.getSearchHistory('test-user')

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history?user_id=test-user&limit=5'
      )
    })

    it('should handle API errors for search history', async () => {
      const mockError = new Error('Failed to fetch history')
      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(searchService.getSearchHistory('test-user', 10))
        .rejects.toThrow('Failed to fetch history')
    })
  })

  describe('getSavedQueries', () => {
    it('should fetch saved queries with correct parameters', async () => {
      const mockSavedQueries = [
        {
          query_id: 101,
          query_text: 'End of day trades',
          query_name: 'EOD Report',
          saved_time: '2024-01-10T09:00:00Z'
        }
      ]

      vi.mocked(apiClient.get).mockResolvedValue(mockSavedQueries)

      const result = await searchService.getSavedQueries('test-user', 25)

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history/saved-queries?user_id=test-user&limit=25'
      )
      expect(result).toEqual(mockSavedQueries)
    })

    it('should use default limit for saved queries', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([])

      await searchService.getSavedQueries('test-user')

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history/saved-queries?user_id=test-user&limit=50'
      )
    })
  })

  describe('saveQuery', () => {
    it('should save query with correct parameters', async () => {
      const mockResponse = { 
        query_id: 123,
        query_text: 'My Custom Query',
        query_name: 'My Custom Query',
        saved_time: '2024-01-01T00:00:00Z'
      }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const result = await searchService.saveQuery(123, 'test-user', 'My Custom Query')

      expect(apiClient.put).toHaveBeenCalledWith('/api/history/123?user_id=test-user', {
        is_saved: true,
        query_name: 'My Custom Query'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle save query errors', async () => {
      const mockError = new Error('Failed to save query')
      vi.mocked(apiClient.put).mockRejectedValue(mockError)

      await expect(searchService.saveQuery(123, 'test-user', 'Test Query'))
        .rejects.toThrow('Failed to save query')
    })
  })

  describe('deleteSearchHistory', () => {
    it('should delete search history item', async () => {
      const mockResponse = { success: true }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await searchService.deleteSearchHistory(123, 'test-user')

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/api/history/123?user_id=test-user'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle delete errors', async () => {
      const mockError = new Error('Failed to delete')
      vi.mocked(apiClient.delete).mockRejectedValue(mockError)

      await expect(searchService.deleteSearchHistory(123, 'test-user'))
        .rejects.toThrow('Failed to delete')
    })
  })

  describe('clearSearchHistory', () => {
    it('should clear all search history for user', async () => {
      const mockResponse = { deleted_count: 5 }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await searchService.clearSearchHistory('test-user')

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/api/history?user_id=test-user'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle clear history errors', async () => {
      const mockError = new Error('Failed to clear history')
      vi.mocked(apiClient.delete).mockRejectedValue(mockError)

      await expect(searchService.clearSearchHistory('test-user'))
        .rejects.toThrow('Failed to clear history')
    })
  })

  describe('getTypeaheadSuggestions', () => {
    it('should fetch typeahead suggestions', async () => {
      const mockSuggestions = [
        { text: 'FX trades', type: 'query', confidence: 0.9 },
        { text: 'cleared trades', type: 'query', confidence: 0.8 }
      ]

      vi.mocked(apiClient.get).mockResolvedValue(mockSuggestions)

      const result = await searchService.getTypeaheadSuggestions(
        'test-user', 
        'fx tr', 
        8
      )

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history/suggestions?user_id=test-user&q=fx%20tr&limit=8'
      )
      expect(result).toEqual(mockSuggestions)
    })

    it('should handle URL encoding for special characters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([])

      await searchService.getTypeaheadSuggestions(
        'test-user',
        'trades & exceptions',
        5
      )

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history/suggestions?user_id=test-user&q=trades%20%26%20exceptions&limit=5'
      )
    })

    it('should use default limit for suggestions', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([])

      await searchService.getTypeaheadSuggestions('test-user', 'query')

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/history/suggestions?user_id=test-user&q=query&limit=10'
      )
    })
  })

  describe('getFilterOptions', () => {
    it('should fetch filter options from aggregation endpoint', async () => {
      const mockOptions = {
        accounts: ['ACC001', 'ACC002', 'ACC003'],
        asset_types: ['FX', 'Bond', 'Equity'],
        booking_systems: ['BloombergTradeBook', 'Murex'],
        affirmation_systems: ['Euroclear', 'DTCC'],
        clearing_houses: ['LCH', 'NSCC'],
        statuses: ['CLEARED', 'PENDING', 'EXCEPTION']
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockOptions)

      const result = await searchService.getFilterOptions()

      expect(apiClient.get).toHaveBeenCalledWith('/api/filter-options')
      expect(result).toEqual(mockOptions)
    })

    it('should handle filter options API errors', async () => {
      const mockError = new Error('Failed to fetch filter options')
      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(searchService.getFilterOptions())
        .rejects.toThrow('Failed to fetch filter options')
    })

    it('should handle empty filter options', async () => {
      const emptyOptions = {
        accounts: [],
        asset_types: [],
        booking_systems: [],
        affirmation_systems: [],
        clearing_houses: [],
        statuses: []
      }

      vi.mocked(apiClient.get).mockResolvedValue(emptyOptions)

      const result = await searchService.getFilterOptions()

      expect(result).toEqual(emptyOptions)
      Object.values(result).forEach(array => {
        expect(array).toHaveLength(0)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle network timeout', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      
      vi.mocked(apiClient.post).mockRejectedValue(timeoutError)

      const request: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'test'
      }

      await expect(searchService.searchTrades(request))
        .rejects.toThrow('Request timeout')
    })

    it('should handle malformed API responses', async () => {
      const malformedResponse = { 
        data: 'not the expected format',
        missing: 'required fields'
      }
      
      vi.mocked(apiClient.post).mockResolvedValue(malformedResponse)

      const request: SearchRequest = {
        search_type: 'natural_language',
        user_id: 'test-user',
        query_text: 'test'
      }

      // Should not throw, but return malformed response as-is
      const result = await searchService.searchTrades(request)
      expect(result).toEqual(malformedResponse)
    })

    it('should handle concurrent requests', async () => {
      const responses = [
        { results: [{ trade_id: 'T001' }], query_id: 1 },
        { results: [{ trade_id: 'T002' }], query_id: 2 },
        { results: [{ trade_id: 'T003' }], query_id: 3 }
      ]

      vi.mocked(apiClient.post)
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2])

      const requests = [
        { search_type: 'natural_language' as const, user_id: 'user1', query_text: 'query1' },
        { search_type: 'natural_language' as const, user_id: 'user2', query_text: 'query2' },
        { search_type: 'natural_language' as const, user_id: 'user3', query_text: 'query3' }
      ]

      const results = await Promise.all(
        requests.map(req => searchService.searchTrades(req))
      )

      expect(results).toHaveLength(3)
      expect(apiClient.post).toHaveBeenCalledTimes(3)
      results.forEach((result, index) => {
        expect(result).toEqual(responses[index])
      })
    })
  })
})