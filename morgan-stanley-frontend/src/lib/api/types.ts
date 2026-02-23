/**
 * API Types - Matching backend schemas
 * All field names use snake_case to match Python backend
 */

// ============================================================================
// Domain Models (matching backend)
// ============================================================================

export interface Trade {
  trade_id: number;
  account: string;
  asset_type: string;
  booking_system: string;
  affirmation_system: string;
  clearing_house: string;
  create_time: string;
  update_time: string;
  status: 'CANCELLED' | 'ALLEGED' | 'REJECTED' | 'CLEARED';
}

export interface Transaction {
  trans_id: number;
  trade_id: number;
  create_time: string;
  entity: string;
  direction: string;
  type: string;
  status: string;
  update_time: string;
  step: number;
}

export interface Exception {
  trade_id: number; 
  trans_id: number;  
  exception_id: number;  
  status: string;
  msg: string;
  create_time: string;
  comment: string;
  priority: string;
  update_time: string;
}

export interface QueryHistory {
  query_id: number;
  user_id: string;
  query_text: string;
  is_saved: boolean;
  query_name: string | null;
  create_time: string;
  last_use_time: string;
}

export interface ExtractedParams {
  trade_id: number | null;
  account: string | null;
  asset_type: string | null;
  booking_system: string | null;
  affirmation_system: string | null;
  clearing_house: string | null;
  status: string[];
  date_from: string | null;
  date_to: string | null;
}

// ============================================================================
// Request Types
// ============================================================================

export interface ManualSearchFilters {
  trade_id?: string;
  account?: string;
  asset_type?: string;
  booking_system?: string;
  affirmation_system?: string;
  clearing_house?: string;
  status?: string[];
  date_type?: 'create_time' | 'update_time';
  date_from?: string;
  date_to?: string;
  with_exceptions_only?: boolean;
  cleared_trades_only?: boolean;
}

export interface NaturalLanguageSearchRequest {
  user_id: string;
  search_type: 'natural_language';
  query_text: string;
}

export interface ManualSearchRequest {
  user_id: string;
  search_type: 'manual';
  filters: ManualSearchFilters;
}

export type SearchRequest = NaturalLanguageSearchRequest | ManualSearchRequest;

export interface UpdateHistoryRequest {
  is_saved?: boolean;
  query_name?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface SearchResponse {
  query_id: number;
  total_results: number;
  results: Trade[];
  search_type: 'natural_language' | 'manual';
  cached: boolean;
  execution_time_ms: number | null;
  extracted_params?: ExtractedParams | null;
}

export interface HistoryListResponse {
  user_id: string;
  total_count: number;
  saved_count: number;
  recent_count: number;
  queries: QueryHistory[];
}

export interface UpdateHistoryResponse {
  query_id: number;
  user_id: string;
  is_saved: boolean;
  query_name: string | null;
  message: string;
}

export interface DeleteHistoryResponse {
  query_id: number;
  user_id: string;
  message: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: {
    connected: boolean;
    latency_ms: number | null;
  };
  redis: {
    connected: boolean;
    latency_ms: number | null;
  };
}
