import type { Trade, Transaction } from './types';

const TRADE_FLOW_API_BASE_URL =
  import.meta.env.VITE_TRADE_FLOW_API_BASE_URL || 'http://localhost:8003';

type TradeApiResponse = Omit<Trade, 'trade_id'> & { id: number };

type TransactionApiResponse = Omit<Transaction, 'trans_id'> & { id: number };

const mapTrade = (trade: TradeApiResponse): Trade => ({
  trade_id: trade.id,
  account: trade.account,
  asset_type: trade.asset_type,
  booking_system: trade.booking_system,
  affirmation_system: trade.affirmation_system,
  clearing_house: trade.clearing_house,
  create_time: trade.create_time,
  update_time: trade.update_time,
  status: trade.status,
});

const mapTransaction = (transaction: TransactionApiResponse): Transaction => ({
  trade_id: transaction.trade_id,
  trans_id: transaction.id,
  create_time: transaction.create_time,
  entity: transaction.entity,
  direction: transaction.direction,
  type: transaction.type,
  status: transaction.status,
  update_time: transaction.update_time,
  step: transaction.step,
});

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${TRADE_FLOW_API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`Trade flow request failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const tradeFlowService = {
  async getTradeById(tradeId: number): Promise<Trade> {
    const trade = await request<TradeApiResponse>(`/trades/${tradeId}`);
    return mapTrade(trade);
  },

  async getTrades(limit: number = 1000, offset: number = 0): Promise<Trade[]> {
    const trades = await request<TradeApiResponse[]>(`/trades?limit=${limit}&offset=${offset}`);
    return trades.map(mapTrade);
  },

  async getRecentTrades(limit: number = 20): Promise<Trade[]> {
    const trades = await request<TradeApiResponse[]>(`/trades/recent?limit=${limit}`);
    return trades.map(mapTrade);
  },

  async getTransactionsByTradeId(tradeId: number): Promise<Transaction[]> {
    const transactions = await request<TransactionApiResponse[]>(
      `/trades/${tradeId}/transactions`
    );
    return transactions.map(mapTransaction);
  },
};
