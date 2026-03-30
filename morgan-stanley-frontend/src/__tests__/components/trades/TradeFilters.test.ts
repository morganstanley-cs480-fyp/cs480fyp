import { describe, it, expect, beforeEach } from 'vitest';

// Mock trade data
const mockTrades = [
  {
    trade_id: 'T001',
    account: 'ACC001',
    asset_type: 'Bond',
    booking_system: 'BloombergTradeBook',
    affirmation_system: 'Euroclear',
    clearing_house: 'LCH',
    create_time: '2026-01-15T10:00:00Z',
    update_time: '2026-01-20T14:30:00Z',
    status: 'Settled',
  },
  {
    trade_id: 'T002',
    account: 'ACC002',
    asset_type: 'Equity',
    booking_system: 'Murex',
    affirmation_system: 'DTCC',
    clearing_house: 'NSCC',
    create_time: '2026-01-10T09:15:00Z',
    update_time: '2026-01-18T11:45:00Z',
    status: 'Pending',
  },
  {
    trade_id: 'T003',
    account: 'ACC001',
    asset_type: 'FX',
    booking_system: 'BloombergTradeBook',
    affirmation_system: 'Euroclear',
    clearing_house: 'LCH',
    create_time: '2026-01-05T08:30:00Z',
    update_time: '2026-01-19T16:20:00Z',
    status: 'Exception',
  },
];

type Trade = typeof mockTrades[0];

type ManualSearchFilters = {
  tradeId: string;
  account: string;
  assetType: string;
  bookingSystem: string;
  affirmationSystem: string;
  clearingHouse: string;
  status: string[];
  dateType: 'create_time' | 'update_time';
  dateFrom: string;
  dateTo: string;
  withExceptionsOnly: boolean;
  clearedTradesOnly: boolean;
};

// Helper function to apply filters (mirrors your component logic)
function applyFilters(
  trades: Trade[],
  filters: ManualSearchFilters,
  searchQuery: string
): Trade[] {
  return trades.filter((trade) => {
    // Text filters (case-insensitive partial match)
    if (
      filters.tradeId &&
      !trade.trade_id.toLowerCase().includes(filters.tradeId.toLowerCase())
    )
      return false;
    if (
      filters.account &&
      !trade.account.toLowerCase().includes(filters.account.toLowerCase())
    )
      return false;
    if (filters.assetType && trade.asset_type !== filters.assetType)
      return false;
    if (
      filters.bookingSystem &&
      trade.booking_system !== filters.bookingSystem
    )
      return false;
    if (
      filters.affirmationSystem &&
      trade.affirmation_system !== filters.affirmationSystem
    )
      return false;
    if (filters.clearingHouse && trade.clearing_house !== filters.clearingHouse)
      return false;

    // Status filter (multi-select)
    if (filters.status.length > 0 && !filters.status.includes(trade.status))
      return false;

    // Date range filter
    const dateField =
      filters.dateType === 'create_time'
        ? trade.create_time
        : trade.update_time;
    if (filters.dateFrom && dateField < filters.dateFrom) return false;
    if (filters.dateTo && dateField > filters.dateTo) return false;

    // Exception filter
    if (filters.withExceptionsOnly && trade.status !== 'Exception')
      return false;

    // Cleared trades filter
    if (filters.clearedTradesOnly && trade.status !== 'Settled') return false;

    // Global search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        trade.trade_id.toLowerCase().includes(query) ||
        trade.account.toLowerCase().includes(query) ||
        trade.asset_type.toLowerCase().includes(query) ||
        trade.booking_system.toLowerCase().includes(query) ||
        trade.affirmation_system.toLowerCase().includes(query) ||
        trade.clearing_house.toLowerCase().includes(query) ||
        trade.status.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    return true;
  });
}

describe('Trade Search Filters', () => {
  let defaultFilters: ManualSearchFilters;

  beforeEach(() => {
    defaultFilters = {
      tradeId: '',
      account: '',
      assetType: '',
      bookingSystem: '',
      affirmationSystem: '',
      clearingHouse: '',
      status: [],
      dateType: 'update_time',
      dateFrom: '',
      dateTo: '',
      withExceptionsOnly: false,
      clearedTradesOnly: false,
    };
  });

  describe('Single Filter Tests', () => {
    it('should filter by tradeId (partial match)', () => {
      const filters = { ...defaultFilters, tradeId: 'T00' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(3);
    });

    it('should filter by tradeId (exact match)', () => {
      const filters = { ...defaultFilters, tradeId: 'T001' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T001');
    });

    it('should filter by account', () => {
      const filters = { ...defaultFilters, account: 'ACC001' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2);
    });

    it('should filter by assetType', () => {
      const filters = { ...defaultFilters, assetType: 'Bond' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].asset_type).toBe('Bond');
    });

    it('should filter by bookingSystem', () => {
      const filters = { ...defaultFilters, bookingSystem: 'BloombergTradeBook' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2);
    });

    it('should filter by affirmationSystem', () => {
      const filters = { ...defaultFilters, affirmationSystem: 'Euroclear' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2);
    });

    it('should filter by clearingHouse', () => {
      const filters = { ...defaultFilters, clearingHouse: 'LCH' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2);
    });

    it('should filter by single status', () => {
      const filters = { ...defaultFilters, status: ['Settled'] };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Settled');
    });

    it('should filter by multiple statuses', () => {
      const filters = { ...defaultFilters, status: ['Settled', 'Exception'] };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2);
    });
  });

  describe('Date Range Tests', () => {
    it('should filter by dateFrom (create_time)', () => {
      const filters = {
        ...defaultFilters,
        dateType: 'create_time' as const,
        dateFrom: '2026-01-10T00:00:00Z',
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2); // T001, T002
    });

    it('should filter by dateTo (update_time)', () => {
      const filters = {
        ...defaultFilters,
        dateType: 'update_time' as const,
        dateTo: '2026-01-20T00:00:00Z',
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2); // T003 (2026-01-19T16:20:00Z), T002 (2026-01-18T11:45:00Z)
    });

    it('should filter by date range', () => {
      const filters = {
        ...defaultFilters,
        dateType: 'update_time' as const,
        dateFrom: '2026-01-18T00:00:00Z',
        dateTo: '2026-01-20T00:00:00Z',
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2); // T001, T002
    });

    it('should return empty array for date range with no matches', () => {
      const filters = {
        ...defaultFilters,
        dateType: 'create_time' as const,
        dateFrom: '2026-02-01T00:00:00Z',
        dateTo: '2026-02-28T00:00:00Z',
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(0);
    });
  });

  describe('Toggle Filter Tests', () => {
    it('should filter by withExceptionsOnly', () => {
      const filters = { ...defaultFilters, withExceptionsOnly: true };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Exception');
    });

    it('should filter by clearedTradesOnly', () => {
      const filters = { ...defaultFilters, clearedTradesOnly: true };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Settled');
    });

    it('should return empty when both withExceptionsOnly and clearedTradesOnly are true', () => {
      const filters = {
        ...defaultFilters,
        withExceptionsOnly: true,
        clearedTradesOnly: true,
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(0);
    });
  });

  describe('Multi-Filter Combination Tests', () => {
    it('should apply account + assetType filters', () => {
      const filters = {
        ...defaultFilters,
        account: 'ACC001',
        assetType: 'Bond',
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T001');
    });

    it('should apply bookingSystem + status filters', () => {
      const filters = {
        ...defaultFilters,
        bookingSystem: 'BloombergTradeBook',
        status: ['Settled'],
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T001');
    });

    it('should apply account + date range + status', () => {
      const filters = {
        ...defaultFilters,
        account: 'ACC001',
        dateType: 'update_time' as const,
        dateFrom: '2026-01-18T00:00:00Z',
        status: ['Settled', 'Exception'],
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(2); // T001, T003
    });

    it('should apply all non-toggle filters together', () => {
      const filters = {
        ...defaultFilters,
        account: 'ACC001',
        assetType: 'Bond',
        bookingSystem: 'BloombergTradeBook',
        affirmationSystem: 'Euroclear',
        clearingHouse: 'LCH',
        status: ['Settled'],
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T001');
    });
  });

  describe('Global Search Query Tests', () => {
    it('should search by tradeId in query', () => {
      const result = applyFilters(mockTrades, defaultFilters, 'T002');
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T002');
    });

    it('should search by account in query', () => {
      const result = applyFilters(mockTrades, defaultFilters, 'ACC001');
      expect(result).toHaveLength(2);
    });

    it('should search by assetType in query', () => {
      const result = applyFilters(mockTrades, defaultFilters, 'Equity');
      expect(result).toHaveLength(1);
    });

    it('should search by status in query', () => {
      const result = applyFilters(mockTrades, defaultFilters, 'Settled');
      expect(result).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      const result = applyFilters(mockTrades, defaultFilters, 'bond');
      expect(result).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters and empty search (return all)', () => {
      const result = applyFilters(mockTrades, defaultFilters, '');
      expect(result).toHaveLength(3);
    });

    it('should return empty array for non-existent tradeId', () => {
      const filters = { ...defaultFilters, tradeId: 'NONEXISTENT' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(0);
    });

    it('should handle empty status array (no filtering)', () => {
      const filters = { ...defaultFilters, status: [] };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(3);
    });

    it('should handle conflicting filters (no results)', () => {
      const filters = {
        ...defaultFilters,
        assetType: 'Bond',
        account: 'ACC002', // ACC002 has no Bond trades
      };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(0);
    });

    it('should handle partial match case-insensitivity', () => {
      const filters = { ...defaultFilters, tradeId: 't00' };
      const result = applyFilters(mockTrades, filters, '');
      expect(result).toHaveLength(3);
    });

    it('should combine filters and search query (AND logic)', () => {
      const filters = { ...defaultFilters, account: 'ACC001' };
      const result = applyFilters(mockTrades, filters, 'Bond'); // ACC001 + Bond search
      expect(result).toHaveLength(1);
      expect(result[0].trade_id).toBe('T001');
    });

    it('should return empty when filter matches but search doesnt', () => {
      const filters = { ...defaultFilters, account: 'ACC001' };
      const result = applyFilters(mockTrades, filters, 'Equity'); // ACC001 exists but no Equity
      expect(result).toHaveLength(0);
    });
  });
});
