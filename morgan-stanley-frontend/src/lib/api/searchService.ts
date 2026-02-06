import { apiClient } from './client';
import type {
  SearchRequest,
  SearchResponse,
  HistoryListResponse,
  UpdateHistoryResponse,
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
  ): Promise<HistoryListResponse> {
    return apiClient.get<HistoryListResponse>(
      `/history/${userId}?limit=${limit}`
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
  async deleteSearchHistory(historyId: number): Promise<void> {
    return apiClient.delete<void>(`/history/${historyId}`);
  },

  /**
   * Clear all search history for a user
   */
  async clearSearchHistory(userId: string): Promise<void> {
    return apiClient.delete<void>(`/history/${userId}`);
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    return apiClient.get<{ status: string; message: string }>('/health');
  },
};
