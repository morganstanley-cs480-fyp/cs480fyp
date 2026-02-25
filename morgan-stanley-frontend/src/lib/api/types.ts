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
  trade_id: number;
  trans_id: number;
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
  status: 'PENDING' | 'RESOLVED' | 'IGNORED' | 'CLOSED';
  msg: string;
  create_time: string;
  comment: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
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

/**
 * Typeahead Autocomplete System
 * 
 * How it works:
 * 
 * When you start typing in the search box, the system springs into action after a brief 
 * 200ms pause (giving you time to type a few characters without hammering the server).
 * 
 * Behind the scenes, the backend queries the actual trades database, looking across seven 
 * different fields: trade IDs, accounts, asset types, booking systems, affirmation systems, 
 * clearing houses, and statuses. For each field, it pulls distinct values that match what 
 * you've typed using a fuzzy search (so "fx" will find "FX", "fxd", etc.).
 * 
 * The magic happens in the scoring. Each potential match gets rated based on how closely 
 * it resembles your input - exact prefix matches score highest, followed by substring 
 * matches, then fuzzy word-overlap matches. Only suggestions scoring above 0.3 make the cut.
 * 
 * The results come back formatted as natural suggestions like "asset type FX" or 
 * "account ACC001", with a category label so you know which field you're looking at. 
 * These aren't from your search history - they're real values currently in the database, 
 * which means you're always seeing what actually exists right now.
 * 
 * Click a suggestion and it fills your search box, ready to submit. The whole flow feels 
 * instant and intuitive, like Google's autocomplete but tailored specifically to your 
 * trade data.
 */
export interface TypeaheadSuggestion {
  query_id: number;
  query_text: string;
  is_saved: boolean;
  query_name: string | null;
  last_use_time?: string | null;
  score: number;
  category?: string | null;
}

export interface FilterOptions {
  accounts: string[];
  asset_types: string[];
  booking_systems: string[];
  affirmation_systems: string[];
  clearing_houses: string[];
  statuses: string[];
}

export interface ExtractedParams {
  accounts?: string[] | null;
  asset_types?: string[] | null;
  booking_systems?: string[] | null;
  affirmation_systems?: string[] | null;
  clearing_houses?: string[] | null;
  statuses?: string[] | null;
  date_from?: string | null;
  date_to?: string | null;
  with_exceptions_only?: boolean;
  cleared_trades_only?: boolean;
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
  is_saved: boolean;
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
  query_text: string;
  is_saved: boolean;
  query_name: string | null;
  create_time: string;
  last_use_time: string;
}

export interface DeleteHistoryResponse {
  query_id: number;
  user_id: string;
  message: string;
}

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: {
      status: "ok" | "failed" | "error";
      required: boolean;
      error?: string;
    };
    cache: {
      status: "ok" | "degraded" | "error";
      required: boolean;
      error?: string;
    };
  };
}
