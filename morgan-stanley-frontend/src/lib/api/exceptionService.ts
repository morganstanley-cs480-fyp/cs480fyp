import { apiClient } from './client';
import type { Exception } from './types';

export interface SimilarException {
  exception_id: string;
  trade_id: string;
  similarity_score: number;
  priority: string;
  status: string;
  asset_type: string;
  clearing_house: string;
  exception_msg: string;
  text: string;
  explanation: string;
}

export interface SimilarExceptionsResponse {
  source_exception_id: string;
  source_text: string;
  similar_exceptions: SimilarException[];
  count: number;
}

export interface GeneratedSolution {
  exception_id: string;
  generated_solution: {
    exception_id: string;
    root_cause_analysis: string;
    recommended_resolution_steps: string;
    risk_considerations: string;
    confidence_level: string;
    raw_response: string;
  };
  historical_cases: Array<{
    exception_id: string;
    trade_id: string;
    similarity_score: number;
    exception_narrative: string;
    solution: string | null;
  }>;
  message: string;
}

export interface CreateSolutionRequest {
  exceptionId: string;
  title: string;
  exception_description: string;
  reference_event?: string;
  solution_description?: string;
  scores?: number;
}

export interface CreateSolutionResponse {
  exception_id: number;
  title: string;
  exception_description: string;
  reference_event: string;
  solution_description: string;
  scores: number;
}

/**
 * Ensure the base URL uses HTTPS when the page is served over HTTPS.
 * Prevents Mixed Content errors when VITE_EXCEPTION_API_BASE_URL is built
 * with an http:// value (e.g. during a CI/CD build that bakes in the URL).
 */
// function resolveExceptionApiBaseUrl(): string {
//   const raw: string =
//     import.meta.env.VITE_EXCEPTION_API_BASE_URL || window.location.origin;
//   if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
//     return raw.replace(/^http:\/\//, 'https://');
//   }
//   return raw;
// }

// const EXCEPTION_API_BASE_URL = resolveExceptionApiBaseUrl();

// class ExceptionClient {
//   async get<T>(endpoint: string): Promise<T> {
//     const url = `${EXCEPTION_API_BASE_URL}${endpoint}`;
//     const response = await fetch(url);

//     if (!response.ok) {
//       const text = await response.text().catch(() => response.statusText);
//       throw new Error(
//         `Exception service error (${response.status}): ${
//           text.substring(0, 200)
//         }`
//       );
//     }

//     // Guard against the server returning an HTML error page instead of JSON
//     // (e.g. a CloudFront 403/404 page), which would crash JSON.parse.
//     const contentType = response.headers.get('content-type');
//     if (!contentType?.includes('application/json')) {
//       const text = await response.text().catch(() => '');
//       throw new Error(
//         `Exception service returned non-JSON response (${
//           contentType ?? 'unknown'
//         }): ${text.substring(0, 200)}`
//       );
//     }

//     return response.json() as Promise<T>;
//   }
// }

// const exceptionClient = new ExceptionClient();

export const exceptionService = {
  /**
   * Fetch all exceptions from the exception service
   */
  async getExceptions(): Promise<Exception[]> {
    return apiClient.get<Exception[]>('/api/exceptions');
  },

  /**
   * Fetch a single exception by ID
   */
  async getExceptionById(exceptionId: number): Promise<Exception> {
    return apiClient.get<Exception>(`/api/exceptions/${exceptionId}`);
  },

  /**
   * Fetch exceptions for a trade
   */
  async getExceptionsByTrade(tradeId: number): Promise<Exception[]> {
    return apiClient.get<Exception[]>(`/api/exceptions/trade/${tradeId}`);
  },

  // NEW: Get similar exceptions using RAG/Milvus
  async getSimilarExceptions(
    exceptionId: string, 
    limit: number = 3, 
    explain: boolean = true
  ): Promise<SimilarExceptionsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      explain: explain.toString()
    });
    return apiClient.get(`/api/rag/documents/similar-exceptions/${exceptionId}?${params}`);
  },

  // NEW: Generate AI solution using Bedrock LLM
  async generateSolution(exceptionId: string): Promise<GeneratedSolution> {
    return apiClient.get(`/api/rag/generate/${exceptionId}`);
  },

  // NEW: Save manually created solution
  async createSolution(request: CreateSolutionRequest): Promise<CreateSolutionResponse> {
    return apiClient.post('/api/solutions', {
      exceptionId: request.exceptionId,
      title: request.title,
      exception_description: request.exception_description,
      reference_event: request.reference_event || '',
      solution_description: request.solution_description || '',
      scores: request.scores || Math.floor(Math.random() * 38) // Random 0-37 as specified
    });
  }

};
