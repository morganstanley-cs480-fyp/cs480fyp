// processor.test.js
import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient } from '@aws-sdk/client-sqs';

// 1. Mock External Dependencies BEFORE importing the processor
// We use unstable_mockModule for ES Modules support
jest.unstable_mockModule('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn()
  }))
}));

jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    publish: jest.fn(),
    on: jest.fn()
  }))
}));

// 2. Import the functions to test
const { 
  handleTrade, 
  handleTransaction, 
  handleException, 
  pool, 
  publisher 
} = await import('./main.js');

const sqsMock = mockClient(SQSClient);

describe('Data Processor Service', () => {
  let mockDbClient;

  beforeEach(() => {
    jest.clearAllMocks();
    sqsMock.reset();

    // Setup Mock DB Client for Transactions (connect/release pattern)
    mockDbClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockDbClient);
  });

  // --- TEST: TRADE HANDLER ---
  describe('handleTrade', () => {
    const sampleTrade = {
      id: 10001,
      account: "ACC-999",
      asset_type: "Equity",
      booking_system: "Murex",
      affirmation_system: "Omgeo",
      clearing_house: "LCH",
      create_time: "2025-01-01T10:00:00Z",
      update_time: "2025-01-01T10:00:00Z",
      status: "OPEN"
    };

    it('should insert trade into DB and publish to Redis', async () => {
      // Mock successful DB insert
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      
      await handleTrade(sampleTrade);

      // Verify DB Call
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trades'),
        expect.arrayContaining([10001, "ACC-999", "OPEN"])
      );

      // Verify Redis Publish
      expect(publisher.publish).toHaveBeenCalledWith(
        'trade-updates',
        expect.stringContaining('"trade_id":"10001"')
      );
    });

    it('should throw error if DB fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB Connection Failed'));
      
      await expect(handleTrade(sampleTrade)).rejects.toThrow('DB Connection Failed');
      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });

  // --- TEST: TRANSACTION HANDLER ---
  describe('handleTransaction', () => {
    const sampleTrans = {
      id: 50001,
      trade_id: 10001, // References sampleTrade.id
      create_time: "2025-01-01T10:05:00Z",
      entity: "LegalEntityA",
      direction: "BUY",
      type: "NEW",
      status: "PENDING",
      update_time: "2025-01-01T10:05:00Z",
      step: "VALIDATION"
    };

    it('should process transaction successfully (COMMIT)', async () => {
      await handleTransaction(sampleTrans);

      // Verify Transaction Flow
      expect(mockDbClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockDbClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('INSERT INTO transactions'), expect.anything());
      expect(mockDbClient.query).toHaveBeenNthCalledWith(3, 
        expect.stringContaining('UPDATE trades'), expect.anything());
      expect(mockDbClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      
      // Verify Release
      expect(mockDbClient.release).toHaveBeenCalled();

      // Verify Redis
      expect(publisher.publish).toHaveBeenCalled();
    });

    it('should rollback if SQL error occurs', async () => {
      // Make the INSERT fail
      mockDbClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Duplicate Key')); // INSERT

      await expect(handleTransaction(sampleTrans)).rejects.toThrow('Duplicate Key');

      // Verify Rollback called
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockDbClient.release).toHaveBeenCalled();
      
      // Verify Redis was NOT called
      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });

  // --- TEST: EXCEPTION HANDLER ---
  describe('handleException', () => {
    const sampleExcep = {
      id: 90001,
      trade_id: 10001,       // References sampleTrade.id
      transaction_id: 50001, // References sampleTrans.id
      event: "Validation Failure",
      status: "ERROR",
      msg: "Invalid Account Number",
      create_time: "2025-01-01T10:10:00Z",
      comment: "Auto-generated exception",
      priority: "HIGH",
      update_time: "2025-01-01T10:10:00Z"
    };

    it('should insert exception and reject trade/transaction', async () => {
      await handleException(sampleExcep);

      expect(mockDbClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      
      // Insert Exception
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exceptions'), expect.anything()
      );

      // Update Transaction status
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE transactions SET status = 'REJECTED'"),
        expect.anything()
      );

      // Update Trade status
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE trades SET status = 'REJECTED'"),
        expect.anything()
      );

      expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});