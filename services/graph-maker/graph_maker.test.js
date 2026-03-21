import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient } from "@aws-sdk/client-sqs";

// 1. Mock Neo4j BEFORE importing your code
const mockSession = {
  run: jest.fn().mockResolvedValue({ records: [] }),
  close: jest.fn().mockResolvedValue()
};

const mockDriver = {
  session: jest.fn(() => mockSession),
  close: jest.fn().mockResolvedValue()
};

jest.unstable_mockModule('neo4j-driver', () => ({
  default: {
    driver: jest.fn(() => mockDriver),
    auth: { none: jest.fn() }
  }
}));

// 2. Set the environment variable so startPolling() doesn't hang Jest
process.env.NODE_ENV = 'test';

// 3. Import the function
const { processGraphData } = await import('./main.js');

// 4. Mock the SQS Client
const sqsMock = mockClient(SQSClient);

describe('Graph Maker Service - processGraphData', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    sqsMock.reset();
  });

  const samplePayload = {
    trade_id: 1000502,
    account: "ACC-7744-X",
    asset_type: "Equity",
    booking_system: "Murex",
    affirmation_system: "Omgeo",
    clearing_house: "LCH",
    trade_status: "REJECTED",
    created_at: "2026-03-21T08:00:00.000Z",
    trans_id: 5000991,
    trans_status: "REJECTED",
    step: 2,
    entity: "Goldman Sachs",
    direction: "receive",
    type: "NEW",
    trans_created_at: "2026-03-21T08:05:15.000Z",
    excep_id: 9000112,
    excep_status: "OPEN",
    comment: "Invalid settlement instructions provided.",
    msg: "SETTLE_ERR_04",
    priority: "HIGH",
    excep_created_at: "2026-03-21T08:05:20.000Z"
  };

  it('should execute the Cypher query and strictly cast IDs to strings', async () => {
    await processGraphData(mockSession, samplePayload);

    expect(mockSession.run).toHaveBeenCalledTimes(1);

    // HERE IS THE FIX FOR TEST 1: Notice the at the end
    const params = mockSession.run.mock.calls[0][1];

    expect(params.trade_id).toBe("1000502"); 
    expect(params.trans_id).toBe("5000991"); 
    expect(params.excep_id).toBe("9000112"); 

    expect(params.booking_system).toBe("Murex");
    expect(params.step).toBe(2);
    expect(params.direction).toBe("receive");
  });

  it('should gracefully handle missing transaction and exception data (null safety)', async () => {
    const minimalPayload = {
      trade_id: 1000502,
      account: "ACC-7744-X",
      asset_type: "Equity",
      trade_status: "OPEN"
    };

    await processGraphData(mockSession, minimalPayload);

    // HERE IS THE FIX FOR TEST 2: Notice the at the end
    const params = mockSession.run.mock.calls[0][1];
    
    expect(params.trans_id).toBeNull();
    expect(params.excep_id).toBeNull();
  });

  it('should inject the correct MERGE and FOREACH blocks into the Cypher query string', async () => {
    await processGraphData(mockSession, samplePayload);
    
    // HERE IS THE FIX FOR TEST 3: Notice the at the end
    const cypherQuery = mockSession.run.mock.calls[0][0];

    expect(cypherQuery).toContain('MERGE (t:Trade {id: $trade_id})');
    expect(cypherQuery).toContain('FOREACH (_ IN CASE WHEN $booking_system IS NOT NULL');
    expect(cypherQuery).toContain('MERGE (tx:Transaction {id: $trans_id})');
    expect(cypherQuery).toContain('MERGE (e:Exception {id: $excep_id})');
    expect(cypherQuery).toContain('MERGE (tx)-[:GENERATED_EXCEPTION]->(e)');
  });

  it('should fallback to current date strings if timestamps are missing', async () => {
    const payloadWithoutDates = {
      trade_id: 99999,
      trans_id: 88888,
      excep_id: 77777
    };

    await processGraphData(mockSession, payloadWithoutDates);
    
    // HERE IS THE FIX FOR TEST 4: Notice the at the end
    const params = mockSession.run.mock.calls[0][1];

    expect(params.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(params.trans_created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(params.excep_created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });
});