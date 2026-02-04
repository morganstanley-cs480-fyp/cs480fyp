/**
 * HTTP Client Configuration
 * Centralized API client with error handling, timeouts, and interceptors
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;
const ENABLE_DEBUG_LOGGING = import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true';

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Generic API response structure
 */
interface APIResponse<T> {
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
}

/**
 * Make HTTP request with error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    if (ENABLE_DEBUG_LOGGING) {
      console.log('[API Request]', options.method || 'GET', endpoint, options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (ENABLE_DEBUG_LOGGING) {
      console.log('[API Response]', response.status, endpoint, data);
    }

    // Handle error responses
    if (!response.ok) {
      const errorData = data as { detail?: string; message?: string };
      const errorMessage = errorData?.detail || errorData?.message || 'An error occurred';
      
      throw new APIError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw new APIError(error.message, undefined, error);
    }

    throw new APIError('Unknown error occurred');
  }
}

/**
 * HTTP methods
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
