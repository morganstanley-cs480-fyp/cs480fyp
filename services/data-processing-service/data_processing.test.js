// processor.test.js
import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient } from '@aws-sdk/client-sqs';

// 1. Mock External Dependencies BEFORE importing the processor
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
  jest.setTimeout(15000);
  let mockDbClient;

  beforeEach(() => {
    jest.clearAllMocks();
    sqsMock.reset();

    // Setup Mock DB Client for Transactions
    mockDbClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockDbClient);
  });

  // --- TEST: TRADE HANDLER ---
  describe('handleTrade', () => {
    const sampleTrade = {
      id: 10000000,
      account: "ACC-999",
      asset_type: "Equity",
      booking_system: "Murex",
      affirmation_system: "Omgeo",
      clearing_house: "LCH",
      create_time: "2025-01-01T10:00:00Z",
      update_time: "2025-01-01T10:00:00Z",
      status: "OPEN"
    };

    it('should insert trade into DB', async () => {
      // Mock successful DB insert
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      
      await handleTrade(sampleTrade);

      // Verify DB Call
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trades'),
        expect.arrayContaining([10000000, "ACC-999", "OPEN"])
      );
      // Note: Removed Redis publish assertion because handleTrade no longer publishes in the new code
    });

    it('should throw error if DB fails', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB Connection Failed'));
      await expect(handleTrade(sampleTrade)).rejects.toThrow('DB Connection Failed');
    });
  });

  // --- TEST: TRANSACTION HANDLER ---
  describe('handleTransaction', () => {
    const sampleTrans = {
      id: 50000000,
      trade_id: 10000000, 
      create_time: "2025-01-01T10:05:00Z",
      entity: "LegalEntityA",
      direction: "BUY",
      type: "NEW",
      status: "PENDING",
      update_time: "2025-01-01T10:05:00Z",
      step: "VALIDATION"
    };

    it('should process a NEW transaction successfully and publish 1 payload', async () => {
      // Mock queries for a brand new transaction insert
      mockDbClient.query.mockImplementation(async (queryText) => {
        if (queryText.includes('SELECT status FROM transactions')) return { rowCount: 0, rows: [] }; // isInsert = true
        if (queryText.includes('SELECT * FROM exceptions')) return { rows: [] }; // No existing exception
        return { rowCount: 1, rows: [] };
      });

      await handleTransaction(sampleTrans);

      // Verify queries were called
      expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO transactions'), expect.anything());
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE trades SET status'), expect.anything());
      expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify exactly ONE Redis Publish occurred (just the transaction)
      expect(publisher.publish).toHaveBeenCalledTimes(1);
      expect(publisher.publish).toHaveBeenCalledWith(
        'trade-updates',
        expect.stringContaining('"id":50000000')
      );
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('should process an UPDATED transaction (fixing a REJECTED status) and publish 2 payloads', async () => {
      const fixedTrans = { ...sampleTrans, status: "CLEARED" };
      
      // Mock queries for updating a previously rejected transaction
      mockDbClient.query.mockImplementation(async (queryText) => {
        if (queryText.includes('SELECT status FROM transactions')) return { rowCount: 1, rows: [{ status: 'REJECTED' }] }; // isInsert = false
        if (queryText.includes('UPDATE exceptions')) return { rows: [{ id: 999, status: 'CLOSED' }] }; // Returning the closed exception
        return { rowCount: 1, rows: [] };
      });

      await handleTransaction(fixedTrans);

      // Verify it ran the correct exception update query
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE exceptions \n        SET status = 'CLOSED'"), 
        expect.anything()
      );

      // Verify TWO Redis Publishes occurred (Transaction AND Exception)
      expect(publisher.publish).toHaveBeenCalledTimes(2);
      
      // First payload should be the transaction
      expect(publisher.publish).toHaveBeenNthCalledWith(1, 'trade-updates', expect.stringContaining('"status":"CLEARED"'));
      
      // Second payload should be the updated exception data
      expect(publisher.publish).toHaveBeenNthCalledWith(2, 'trade-updates', expect.stringContaining('"status":"CLOSED"'));
    });

    it('should rollback if SQL error occurs', async () => {
      mockDbClient.query.mockRejectedValueOnce(new Error('DB Query Failed'));

      await expect(handleTransaction(sampleTrans)).rejects.toThrow('DB Query Failed');

      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockDbClient.release).toHaveBeenCalled();
      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });

  // --- TEST: EXCEPTION HANDLER ---
  describe('handleException', () => {
    const sampleExcep = {
      id: 90000000,
      trade_id: 10000000,      
      trans_id: 50000000, 
      event: "Validation Failure",
      status: "ERROR",
      msg: "Invalid Account Number",
      create_time: "2025-01-01T10:10:00Z",
      comment: "Auto-generated exception",
      priority: "HIGH",
      update_time: "2025-01-01T10:10:00Z"
    };

    it('should insert exception, update trans/trade to REJECTED, and publish 2 formatted payloads', async () => {
      const mockUpdatedTransaction = { id: 50000000, status: 'REJECTED', entity: 'LegalEntityA' };

      mockDbClient.query.mockImplementation(async (queryText) => {
        // Mock the RETURNING * from the transaction update
        if (queryText.includes('UPDATE transactions')) {
          return { rows: [mockUpdatedTransaction] };
        }
        return { rowCount: 1, rows: [] };
      });

      await handleException(sampleExcep);

      // Verify Queries
      expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO exceptions'), expect.anything());
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE transactions \n      SET status = 'REJECTED'"), expect.anything());
      expect(mockDbClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE trades SET status = 'REJECTED'"), expect.anything());
      expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify TWO formatted Redis Publishes occurred
      expect(publisher.publish).toHaveBeenCalledTimes(2);

      // Check Payload 1: The Exception
      expect(publisher.publish).toHaveBeenNthCalledWith(
        1, 
        'trade-updates', 
        expect.stringContaining('"type":"exception"')
      );

      // Check Payload 2: The newly rejected Transaction
      expect(publisher.publish).toHaveBeenNthCalledWith(
        2, 
        'trade-updates', 
        expect.stringContaining('"type":"transaction"')
      );
      
      // Verify the transaction payload contains the mock updated data
      expect(publisher.publish).toHaveBeenNthCalledWith(
        2, 
        'trade-updates', 
        expect.stringContaining('"entity":"LegalEntityA"')
      );
    });
  });
});