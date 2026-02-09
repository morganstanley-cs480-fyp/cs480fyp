import { apiClient } from './client';
import type {
  SearchRequest,
  SearchResponse,
  UpdateHistoryResponse,
  QueryHistory,
} from './types';

/**
 * Search API service for trade search operations
 */
export const searchService = {
  /**
   * Perform trade search (natural language or manual filters)
   */
  async searchTrades(request: SearchRequest): Promise<SearchResponse> {
    return apiClient.post<SearchResponse>('/search', request);
  },

  /**
   * Get search history for user
   */
  async getSearchHistory(
    userId: string,
    limit: number = 5
  ): Promise<QueryHistory[]> {
    return apiClient.get<QueryHistory[]>(
      `/history?user_id=${userId}&limit=${limit}`
    );
  },

  /**
   * Update search history entry (like/dislike)
   */
  async updateSearchHistory(
    historyId: number,
    liked: boolean | null
  ): Promise<UpdateHistoryResponse> {
    return apiClient.put<UpdateHistoryResponse>(`/history/${historyId}`, {
      liked,
    });
  },

  /**
   * Delete a search history entry
   */
  async deleteSearchHistory(historyId: number, userId: string): Promise<void> {
    return apiClient.delete<void>(`/history/${historyId}?user_id=${userId}`);
  },

  /**
   * Clear all search history for a user
   */
  async clearSearchHistory(userId: string): Promise<void> {
    return apiClient.delete<void>(`/history?user_id=${userId}`);
  },

  /**
   * Get saved queries for user
   */
  async getSavedQueries(
    userId: string,
    limit: number = 50
  ): Promise<QueryHistory[]> {
    return apiClient.get<QueryHistory[]>(
      `/history/saved-queries?user_id=${userId}&limit=${limit}`
    );
  },

  /**
   * Save a query with a custom name
   */
  async saveQuery(
    queryId: number,
    userId: string,
    queryName: string
  ): Promise<QueryHistory> {
    return apiClient.put<QueryHistory>(
      `/history/${queryId}/save?user_id=${userId}&query_name=${encodeURIComponent(queryName)}`
    );
  },

  /**
   * Update last_use_time for a query when re-running it
   */
  async updateLastUseTime(
    queryId: number,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.put<{ success: boolean; message: string }>(
      `/history/${queryId}/use?user_id=${userId}`
    );
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return apiClient.get<{ status: string; message: string }>('/health');
  },
};
