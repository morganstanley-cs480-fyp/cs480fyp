import type { Exception } from './types';

const EXCEPTION_API_BASE_URL =
  import.meta.env.VITE_EXCEPTION_API_BASE_URL || window.location.origin;

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

export const exceptionService = {
  /**
   * Fetch all exceptions from the exception service
   */
  async getExceptions(): Promise<Exception[]> {
    return exceptionClient.get<Exception[]>('/api/exceptions/');
  },

  /**
   * Fetch a single exception by ID
   */
  async getExceptionById(exceptionId: number): Promise<Exception> {
    return exceptionClient.get<Exception>(`/api/exceptions/${exceptionId}/`);
  },

  /**
   * Fetch exceptions for a trade
   */
  async getExceptionsByTrade(tradeId: number): Promise<Exception[]> {
    return exceptionClient.get<Exception[]>(`/api/exceptions/trade/${tradeId}/`);
  },
};
