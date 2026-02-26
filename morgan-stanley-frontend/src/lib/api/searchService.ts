import { apiClient } from './client';
import type {
  SearchRequest,
  SearchResponse,
  UpdateHistoryResponse,
  QueryHistory,
  HealthCheckResponse,
  UpdateHistoryRequest,
  Exception,
  TypeaheadSuggestion,
  FilterOptions,
} from './types';

/**
 * Exception API client - separate endpoint for exception service
 */
const EXCEPTION_API_BASE_URL = import.meta.env.VITE_EXCEPTION_API_BASE_URL ||  window.location.origin;

class ExceptionClient {
  async get<T>(endpoint: string): Promise<T> {
    const url = `${EXCEPTION_API_BASE_URL}${endpoint}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from exception service: ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  }
}

const exceptionClient = new ExceptionClient();

// type ExceptionApiResponse = Omit<Exception, 'exception_id'> & { id: number };

// const mapException = (exception: ExceptionApiResponse): Exception => ({
//   exception_id: exception.id,
//   trade_id: exception.trade_id,
//   trans_id: exception.trans_id,
//   status: exception.status === 'PENDING' ? 'PENDING' : 'CLOSED',
//   msg: exception.msg,
//   create_time: exception.create_time,
//   comment: exception.comment ?? null,
//   priority: exception.priority as Exception['priority'],
//   update_time: exception.update_time,
// });

/**
 * Search API service for trade search operations
 */
export const searchService = {
  /**
   * Perform trade search (natural language or manual filters)
   */
  async searchTrades(request: SearchRequest): Promise<SearchResponse> {
    return apiClient.post<SearchResponse>('/api/search', request);
  },

  /**
   * Get search history for user
   */
  async getSearchHistory(
    userId: string,
    limit: number = 5
  ): Promise<QueryHistory[]> {
    return apiClient.get<QueryHistory[]>(
      `/api/history?user_id=${userId}&limit=${limit}`
    );
  },

  /**
   * Update search history entry (save/rename)
   */
  async updateSearchHistory(
    historyId: number,
    userId: string,
    update: UpdateHistoryRequest
  ): Promise<UpdateHistoryResponse> {
    return apiClient.put<UpdateHistoryResponse>(
      `/api/history/${historyId}?user_id=${userId}`,
      update
    );
  },

  /**
   * Delete a search history entry
   */
  async deleteSearchHistory(historyId: number, userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/history/${historyId}?user_id=${userId}`);
  },

  /**
   * Clear all search history for a user
   */
  async clearSearchHistory(userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/history?user_id=${userId}`);
  },

  /**
   * Get saved queries for user
   */
  async getSavedQueries(
    userId: string,
    limit: number = 50
  ): Promise<QueryHistory[]> {
    return apiClient.get<QueryHistory[]>(
      `/api/history/saved-queries?user_id=${userId}&limit=${limit}`
    );
  },

  /**
   * Get typeahead suggestions for the current input
   */
  async getTypeaheadSuggestions(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<TypeaheadSuggestion[]> {
    const encoded = encodeURIComponent(query);
    return apiClient.get<TypeaheadSuggestion[]>(
      `/api/history/suggestions?user_id=${userId}&q=${encoded}&limit=${limit}`
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
      `/api/history/${queryId}/save?user_id=${userId}&query_name=${encodeURIComponent(queryName)}`
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
      `/api/history/${queryId}/use?user_id=${userId}`
    );
  },

  /**
   * Fetch all exceptions from the exception service
   */
  async getExceptions(): Promise<Exception[]> {
    const exceptions = await exceptionClient.get<Exception[]>(
      '/api/exceptions'
    );

    return exceptions;
  },

  /**
   * Fetch a single exception by ID
   */
  async getExceptionById(exceptionId: number): Promise<Exception> {
    const exception = await exceptionClient.get<Exception>(
      `/api/exceptions/${exceptionId}`
    );
    return exception;
  },

  /**
   * Fetch exceptions for a trade
   */
  async getExceptionsByTrade(tradeId: number): Promise<Exception[]> {
    const exceptions = await exceptionClient.get<Exception[]>(
      `/api/exceptions/trade/${tradeId}`
    );
    return exceptions;
  },

  /**
   * Fetch all distinct values for trade filter dropdowns.
   * Uses a single aggregation query on the backend — does not fetch trade rows.
   */
  async getFilterOptions(): Promise<FilterOptions> {
    return apiClient.get<FilterOptions>('/api/filter-options');
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return apiClient.get<HealthCheckResponse>('/health');
  },
};
