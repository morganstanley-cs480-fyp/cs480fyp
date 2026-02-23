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
  async getTransactionsByTradeId(tradeId: number): Promise<Transaction[]> {
//     return [{
//     trans_id: 14478043,
//     trade_id: 96809076,
//     create_time: "2025-08-02T16:38:48",
//     entity: "OCTCCHK",
//     direction: "RECEIVE",
//     type: "REQUEST_CONSENT",
//     status: "CLEARED",
//     update_time: "2025-08-02T16:38:48",
//     step: 1
// }]}
    console.log(`📡 Fetching transactions for trade ${tradeId}...`);
    
    try {
      const transactions = await transactionClient.get<Transaction[]>(`/${tradeId}/transactions`);
      console.log(`✅ Fetched ${transactions.length} transactions for trade ${tradeId}`);
      return transactions;
    } catch (error) {
      console.error(`❌ Failed to fetch transactions for trade ${tradeId}:`, error);
      throw error;
    }
  },

  async getTransactionById(transactionId: string | number): Promise<Transaction> {
    return transactionClient.get<Transaction>(`/${transactionId}`);
  },

}