import type { Transaction } from "./types";

const TRANSACTION_API_BASE_URL = import.meta.env.VITE_TRANSACTION_API_BASE_URL || 'http://localhost:8000';

class TransactionClient {
  private baseUrl: string;

  constructor(baseUrl: string = TRANSACTION_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

const transactionClient = new TransactionClient();

export const transactionService = {
  async getTransactionsByTradeId(tradeId: string | number): Promise<Transaction[]> {
    console.log(`📡 Fetching transactions for trade ${tradeId}...`);
    
    try {
      const transactions = await transactionClient.get<Transaction[]>(`/api/trades/${tradeId}/transactions`);
      console.log(`✅ Fetched ${transactions.length} transactions for trade ${tradeId}`);
      return transactions;
    } catch (error) {
      console.error(`❌ Failed to fetch transactions for trade ${tradeId}:`, error);
      throw error;
    }
  },

  async getTransactionById(transactionId: string | number): Promise<Transaction> {
    return transactionClient.get<Transaction>(`/api/transactions/${transactionId}`);
  },

  // Add more transaction-related methods as needed
  async getTransactionsByStatus(status: string): Promise<Transaction[]> {
    return transactionClient.get<Transaction[]>(`/api/transactions?status=${status}`);
  }
}