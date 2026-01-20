// Mock Data - Central data source for the application

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Trade {
  trade_id: string;
  account: string;
  asset_type: string;
  booking_system: string;
  affirmation_system: string;
  clearing_house: string;
  create_time: string;
  update_time: string;
  status: 'CANCELLED' | 'ALLEGED' | 'REJECTED' | 'CLEARED';
}

export interface Transaction {
  trade_id: string;
  trans_id: string;
  create_time: string;
  entity: string;
  direction: string;
  type: string;
  status: string;
  update_time: string;
  step: number;
}

export interface Exception {
  trade_id: string;
  trans_id: string;
  exception_id: string;
  status: 'PENDING' | 'CLOSED';
  msg: string;
  create_time: string;
  comment: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  update_time: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

export const mockTrades: Trade[] = [
  {
    trade_id: '69690882',
    account: 'ACC084',
    asset_type: 'CDS',
    booking_system: 'HIGHGARDEN',
    affirmation_system: 'TRAI',
    clearing_house: 'LCH',
    create_time: '2025-01-06 10:33:00',
    update_time: '2025-09-17 06:13:44',
    status: 'ALLEGED',
  },
  {
    trade_id: '48712564',
    account: 'ACC054',
    asset_type: 'CDS',
    booking_system: 'KINGSLANDING',
    affirmation_system: 'MARC',
    clearing_house: 'CME',
    create_time: '2025-05-04 09:45:44',
    update_time: '2025-09-22 21:34:55',
    status: 'ALLEGED',
  },
  {
    trade_id: '67447216',
    account: 'ACC071',
    asset_type: 'CDS',
    booking_system: 'WINTERFELL',
    affirmation_system: 'FIRELINK',
    clearing_house: 'OTCCHK',
    create_time: '2025-02-05 03:01:52',
    update_time: '2025-08-10 14:53:23',
    status: 'ALLEGED',
  },
  {
    trade_id: '67515456',
    account: 'ACC046',
    asset_type: 'CDS',
    booking_system: 'KINGSLANDING',
    affirmation_system: 'BLM',
    clearing_house: 'CME',
    create_time: '2025-04-03 02:22:13',
    update_time: '2025-09-20 19:30:02',
    status: 'ALLEGED',
  },
  {
    trade_id: '69755320',
    account: 'ACC045',
    asset_type: 'CDS',
    booking_system: 'WINTERFELL',
    affirmation_system: 'FIRELINK',
    clearing_house: 'LCH',
    create_time: '2025-06-09 04:32:02',
    update_time: '2025-09-07 08:09:03',
    status: 'ALLEGED',
  },
  {
    trade_id: '17194044',
    account: 'ACC040',
    asset_type: 'IRS',
    booking_system: 'KINGSLANDING',
    affirmation_system: 'MARC',
    clearing_house: 'LCH',
    create_time: '2025-06-20 11:44:53',
    update_time: '2025-08-19 19:46:50',
    status: 'REJECTED',
  },
  {
    trade_id: '60724962',
    account: 'ACC023',
    asset_type: 'IRS',
    booking_system: 'RED KEEP',
    affirmation_system: 'BLM',
    clearing_house: 'OTCCHK',
    create_time: '2025-06-11 02:27:23',
    update_time: '2025-10-19 12:18:51',
    status: 'REJECTED',
  },
  {
    trade_id: '35821903',
    account: 'ACC133',
    asset_type: 'FX',
    booking_system: 'HIGHGARDEN',
    affirmation_system: 'TRAI',
    clearing_house: 'ISCC',
    create_time: '2025-03-15 08:15:22',
    update_time: '2025-08-25 16:42:11',
    status: 'CLEARED',
  },
  {
    trade_id: '42198745',
    account: 'ACC0466',
    asset_type: 'IRS',
    booking_system: 'WINTERFELL',
    affirmation_system: 'FIRELINK',
    clearing_house: 'CME',
    create_time: '2025-02-28 14:20:45',
    update_time: '2025-09-05 10:33:18',
    status: 'CLEARED',
  },
  {
    trade_id: '58392014',
    account: 'ACC0982',
    asset_type: 'CDS',
    booking_system: 'RED KEEP',
    affirmation_system: 'MARC',
    clearing_house: 'LCH',
    create_time: '2025-07-12 18:55:30',
    update_time: '2025-10-02 22:14:05',
    status: 'CANCELLED',
  },
];

export const mockTransactions: Transaction[] = [
  {
    trade_id: '69690882',
    trans_id: '10001234',
    create_time: '2025-01-06 10:35:00',
    entity: 'MORGAN STANLEY',
    direction: 'BUY',
    type: 'CLEARING',
    status: 'PENDING',
    update_time: '2025-09-17 06:15:00',
    step: 1,
  },
  {
    trade_id: '69690882',
    trans_id: '10001235',
    create_time: '2025-01-06 11:00:00',
    entity: 'GOLDMAN SACHS',
    direction: 'SELL',
    type: 'SETTLEMENT',
    status: 'PENDING',
    update_time: '2025-09-17 07:00:00',
    step: 2,
  },
  {
    trade_id: '48712564',
    trans_id: '10002341',
    create_time: '2025-05-04 09:50:00',
    entity: 'JP MORGAN',
    direction: 'BUY',
    type: 'CLEARING',
    status: 'COMPLETED',
    update_time: '2025-09-22 22:00:00',
    step: 1,
  },
  {
    trade_id: '67447216',
    trans_id: '10003456',
    create_time: '2025-02-05 03:15:00',
    entity: 'BARCLAYS',
    direction: 'SELL',
    type: 'AFFIRMATION',
    status: 'FAILED',
    update_time: '2025-08-10 15:20:00',
    step: 1,
  },
  {
    trade_id: '67515456',
    trans_id: '10004567',
    create_time: '2025-04-03 02:30:00',
    entity: 'CITIBANK',
    direction: 'BUY',
    type: 'CLEARING',
    status: 'PENDING',
    update_time: '2025-09-20 20:00:00',
    step: 1,
  },
  {
    trade_id: '69755320',
    trans_id: '10005678',
    create_time: '2025-06-09 04:45:00',
    entity: 'HSBC',
    direction: 'SELL',
    type: 'SETTLEMENT',
    status: 'COMPLETED',
    update_time: '2025-09-07 09:00:00',
    step: 1,
  },
];

export const mockExceptions: Exception[] = [
  {
    trade_id: '69690882',
    trans_id: '10001234',
    exception_id: '51253968',
    status: 'PENDING',
    msg: 'MISSING BIC',
    create_time: '2025-08-15 10:23:45',
    comment: 'NO BIC',
    priority: 'HIGH',
    update_time: '2025-08-15 10:25:12',
  },
  {
    trade_id: '48712564',
    trans_id: '10002341',
    exception_id: '50155689',
    status: 'PENDING',
    msg: 'INSUFFICIENT MARGIN',
    create_time: '2025-09-03 14:12:33',
    comment: 'RETRY LIMIT EXCEEDED',
    priority: 'HIGH',
    update_time: '2025-09-03 15:41:22',
  },
  {
    trade_id: '67447216',
    trans_id: '10003456',
    exception_id: '62847123',
    status: 'PENDING',
    msg: 'MAPPING ISSUE',
    create_time: '2025-09-18 08:45:11',
    comment: 'NO MAPPING FOR BLM',
    priority: 'MEDIUM',
    update_time: '2025-09-18 09:12:05',
  },
  {
    trade_id: '67515456',
    trans_id: '10004567',
    exception_id: '73921456',
    status: 'PENDING',
    msg: 'TIME OUT OF RANGE',
    create_time: '2025-10-02 16:33:27',
    comment: 'RETRY LIMIT EXCEEDED',
    priority: 'LOW',
    update_time: '2025-10-02 17:02:18',
  },
  {
    trade_id: '69755320',
    trans_id: '10005678',
    exception_id: '84562390',
    status: 'PENDING',
    msg: 'MAPPING ISSUE',
    create_time: '2025-10-14 11:22:08',
    comment: 'NO MAPPING FOR MARC',
    priority: 'MEDIUM',
    update_time: '2025-10-14 12:15:33',
  },
  {
    trade_id: '35821903',
    trans_id: '10006789',
    exception_id: '95678123',
    status: 'PENDING',
    msg: 'DATA VALIDATION ERROR',
    create_time: '2025-10-20 14:30:22',
    comment: 'INVALID FORMAT',
    priority: 'LOW',
    update_time: '2025-10-20 15:10:45',
  },
  {
    trade_id: '17194044',
    trans_id: '10007890',
    exception_id: '91234567',
    status: 'CLOSED',
    msg: 'MISSING BIC',
    create_time: '2025-08-22 09:15:42',
    comment: 'NO BIC',
    priority: 'HIGH',
    update_time: '2025-08-23 10:30:15',
  },
  {
    trade_id: '60724962',
    trans_id: '10008901',
    exception_id: '82345678',
    status: 'CLOSED',
    msg: 'INSUFFICIENT MARGIN',
    create_time: '2025-09-10 13:45:20',
    comment: 'RETRY LIMIT EXCEEDED',
    priority: 'MEDIUM',
    update_time: '2025-09-11 08:22:44',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all transactions for a specific trade
 */
export function getTransactionsForTrade(tradeId: string): Transaction[] {
  return mockTransactions.filter(t => t.trade_id === tradeId);
}

/**
 * Get all exceptions for a specific trade
 */
export function getExceptionsForTrade(tradeId: string): Exception[] {
  return mockExceptions.filter(e => e.trade_id === tradeId);
}

/**
 * Get all exceptions for a specific transaction
 */
export function getExceptionsForTransaction(transId: string): Exception[] {
  return mockExceptions.filter(e => e.trans_id === transId);
}

/**
 * Get a trade by ID
 */
export function getTradeById(tradeId: string): Trade | undefined {
  return mockTrades.find(t => t.trade_id === tradeId);
}

/**
 * Get an exception by ID
 */
export function getExceptionById(exceptionId: string): Exception | undefined {
  return mockExceptions.find(e => e.exception_id === exceptionId);
}

/**
 * Get a transaction by ID
 */
export function getTransactionById(transId: string): Transaction | undefined {
  return mockTransactions.find(t => t.trans_id === transId);
}

/**
 * Get unique values for filter dropdowns
 */
export function getUniqueAssetTypes(): string[] {
  return [...new Set(mockTrades.map(t => t.asset_type))].sort();
}

export function getUniqueAccounts(): string[] {
  return [...new Set(mockTrades.map(t => t.account))].sort();
}

export function getUniqueBookingSystems(): string[] {
  return [...new Set(mockTrades.map(t => t.booking_system))].sort();
}

export function getUniqueAffirmationSystems(): string[] {
  return [...new Set(mockTrades.map(t => t.affirmation_system))].sort();
}

export function getUniqueClearingHouses(): string[] {
  return [...new Set(mockTrades.map(t => t.clearing_house))].sort();
}

export function getUniqueStatuses(): string[] {
  return [...new Set(mockTrades.map(t => t.status))].sort();
}
