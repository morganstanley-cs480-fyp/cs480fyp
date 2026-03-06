import type { Trade, Transaction } from './types';

/**
 * Ensure the base URL uses HTTPS when the page is served over HTTPS.
 * Prevents Mixed Content errors if VITE_TRADE_FLOW_API_BASE_URL is baked
 * into the production bundle with an http:// value.
 */
function resolveTradeFlowApiBaseUrl(): string {
  const raw: string =
    import.meta.env.VITE_TRADE_FLOW_API_BASE_URL || window.location.origin;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return raw.replace(/^http:\/\//, 'https://');
  }
  return raw;
}

const TRADE_FLOW_API_BASE_URL = resolveTradeFlowApiBaseUrl();

type TradeApiResponse = Omit<Trade, 'trade_id'> & { id: number };

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

interface TradeTableResponse {
  data: TradeApiResponse[];
  limit: number;
  offset: number;
}

async function request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${TRADE_FLOW_API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Trade flow request failed (${response.status}): ${text.substring(0, 200)}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Trade flow service returned non-JSON response (${contentType ?? 'unknown'}): ${text.substring(0, 200)}`
    );
  }

  return response.json() as Promise<T>;
}

export const tradeFlowService = {
  async getTradeById(tradeId: number): Promise<Trade> {
    const raw = await request<TradeApiResponse>(`/api/trades/${tradeId}`);
    return mapTrade(raw);
  },

  async getTrades(limit: number = 20, offset: number = 0): Promise<Trade[]> {
    const response = await request<TradeTableResponse>(`/api/trades?limit=${limit}&offset=${offset}`);
    return response.data.map(mapTrade);
  },

  // async getRecentTrades(limit: number = 20): Promise<Trade[]> {
  //   return await request<Trade[]>(`/api/trades/recent?limit=${limit}`);
  // },

  async getTransactionsByTradeId(tradeId: number): Promise<Transaction[]> {
    return await request<Transaction[]>(
      `/api/trades/${tradeId}/transactions`
    );
  },
};
