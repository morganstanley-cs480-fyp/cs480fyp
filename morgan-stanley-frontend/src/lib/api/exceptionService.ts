import type { Exception } from './types';

/**
 * Ensure the base URL uses HTTPS when the page is served over HTTPS.
 * Prevents Mixed Content errors when VITE_EXCEPTION_API_BASE_URL is built
 * with an http:// value (e.g. during a CI/CD build that bakes in the URL).
 */
function resolveExceptionApiBaseUrl(): string {
  const raw: string =
    import.meta.env.VITE_EXCEPTION_API_BASE_URL || window.location.origin;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return raw.replace(/^http:\/\//, 'https://');
  }
  return raw;
}

const EXCEPTION_API_BASE_URL = resolveExceptionApiBaseUrl();

class ExceptionClient {
  async get<T>(endpoint: string): Promise<T> {
    const url = `${EXCEPTION_API_BASE_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(
        `Exception service error (${response.status}): ${
          text.substring(0, 200)
        }`
      );
    }

    // Guard against the server returning an HTML error page instead of JSON
    // (e.g. a CloudFront 403/404 page), which would crash JSON.parse.
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Exception service returned non-JSON response (${
          contentType ?? 'unknown'
        }): ${text.substring(0, 200)}`
      );
    }

    return response.json() as Promise<T>;
  }
}

const exceptionClient = new ExceptionClient();

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
};
