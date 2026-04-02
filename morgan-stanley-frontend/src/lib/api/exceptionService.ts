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

	
// exception_id	19757932
// title	"INSUFFICIENT MARGIN"
// exception_description	"IRS trade through JSCC failed during credit reject phase due to insufficient margin. TAS system rejected the trade after exceeding retry limits during credit approval process."
// reference_event	""
// solution_description	"Contact counterparty to post additional collateral to meet Initial Margin requirements. Review margin calculation methodology with JSCC to ensure accuracy. If margin is borderline, consider reducing notional amount or restructuring trade to lower margin requirements."
// scores	18
// id	100000
// create_time	"2026-03-07T06:46:41.910192Z"

export interface RetrievedSolution {
  exception_id: number; // convert from number to string.
  title: string;
  exception_description?: string;
  reference_event?: string;
  solution_description: string;
  scores: number;
  id: number;
  create_time: string;
}

export interface CreateSolutionRequest {
  exception_id: number;
  title: string;
  exception_description: string;
  reference_event?: string;
  solution_description?: string;
  scores?: number;
}

export interface UpdateSolutionRequest {
  title?: string;
  exception_description?: string;
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
  id: number;
  create_time: string;
}

function resolveExceptionApiBaseUrl(): string {
  const raw: string =
    import.meta.env.VITE_EXCEPTION_API_BASE_URL || window.location.origin;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return raw.replace(/^http:\/\//, 'https://');
  }
  return raw;
}

const EXCEPTION_API_BASE_URL = resolveExceptionApiBaseUrl();
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

/**
 * Exception-specific API client that connects directly to exception service
 */
class ExceptionClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(
          `Exception service error (${response.status}): ${text.substring(0, 200)}`
        );
      }

      // Guard against HTML error pages
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `Exception service returned non-JSON response (${contentType ?? 'unknown'}): ${text.substring(0, 200)}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

const exceptionClient = new ExceptionClient(EXCEPTION_API_BASE_URL);

export const exceptionService = {
  /**
   * Fetch all exceptions from the exception service
   */
  async getExceptions(): Promise<Exception[]> {
    return exceptionClient.get<Exception[]>('/api/exceptions');
  },

  /**
   * Fetch a single exception by ID
   */
  async getExceptionById(exceptionId: number): Promise<Exception> {
    return exceptionClient.get<Exception>(`/api/exceptions/${exceptionId}`);
  },

  /**
   * Fetch exceptions for a trade
   */
  async getExceptionsByTrade(tradeId: number): Promise<Exception[]> {
    return exceptionClient.get<Exception[]>(`/api/exceptions/trade/${tradeId}`);
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
    return exceptionClient.get(`/api/rag/documents/similar-exceptions/${exceptionId}?${params}`);
  },

  // NEW: Generate AI solution using Bedrock LLM
  async generateSolution(exceptionId: string): Promise<GeneratedSolution> {
    return exceptionClient.get(`/api/rag/generate/${exceptionId}`);
  },

  // NEW: Retrieve solution tied to a similar exception. Just grab exception_description and solution_description.
  async getSolution(exceptionId: string): Promise<RetrievedSolution> {
    return exceptionClient.get(`/api/solutions/${exceptionId}`);
  },

  // NEW: Save manually created solution
  async createSolution(request: CreateSolutionRequest): Promise<CreateSolutionResponse> {
    return exceptionClient.post('/api/solutions', {
      exception_id: request.exception_id, // Convert to snake_case and ensure it's a number
      title: request.title,
      exception_description: request.exception_description,
      reference_event: request.reference_event || '', // not being used
      solution_description: request.solution_description,
      scores: request.scores || Math.floor(Math.random() * 28) // Random 0-27 as specified
    });
  },

  async updateSolution(
    solutionId: number,
    request: UpdateSolutionRequest
  ): Promise<CreateSolutionResponse> {
    return exceptionClient.put(`/api/solutions/${solutionId}`, request);
  }


};
