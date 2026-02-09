import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

// 1. MOCK REDIS (Before importing main code)
jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    subscribe: jest.fn((channel, callback) => {
      global.redisCallback = callback;
      return Promise.resolve();
    }),
  }))
}));

// 2. DYNAMIC IMPORTS
const { start, tradeRooms } = await import('./main.js'); // Ensure this matches your file name!
const request = (await import('supertest')).default;
const WebSocket = (await import('ws')).default;

describe('Gateway Service', () => {
  let server;
  let wsClient;
  const PORT = 3002; 

  beforeAll(async () => {
    process.env.PORT = PORT;
    // Start server and wait for it to be ready
    server = await start();
  });

  afterAll((done) => {
    // Force close server and all sockets
    if (server) {
      server.close(() => done()); 
    } else {
      done();
    }
  });

  afterEach(() => {
    if (wsClient) {
      wsClient.close();
    }
  });

  test('Health Check Endpoint (HTTP)', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
  });

  test('WebSocket Subscription', (done) => {
    wsClient = new WebSocket(`ws://127.0.0.1:${PORT}`);

    // FIX 2: Catch connection errors
    wsClient.on('error', (err) => {
      done(err); // Fail test immediately if connection breaks
    });

    wsClient.on('open', () => {
      const subscribeMsg = JSON.stringify({ action: 'SUBSCRIBE', trade_id: 'trade123' });
      wsClient.send(subscribeMsg);

      // Give server 100ms to process
      setTimeout(() => {
        try {
          expect(tradeRooms.has('trade123')).toBe(true);
          expect(tradeRooms.get('trade123').size).toBe(1);
          done(); // Pass!
        } catch (error) {
          done(error); // Fail with assertion error
        }
      }, 100);
    });
  });

  test('Broadcast Message', (done) => {
    wsClient = new WebSocket(`ws://127.0.0.1:${PORT}`);

    wsClient.on('error', (err) => done(err));

    wsClient.on('open', () => {
      // 1. Subscribe first
      const subscribeMsg = JSON.stringify({ action: 'SUBSCRIBE', trade_id: 'trade456' });
      wsClient.send(subscribeMsg);

      // 2. Wait a bit, then simulate Redis message
      setTimeout(() => {
        const testMessage = {
          trade_id: 'trade456',
          data: { price: 100, volume: 50 }
        };
        
        if (global.redisCallback) {
          global.redisCallback(JSON.stringify(testMessage));
        } else {
          done(new Error("Redis callback was never captured! Mock failed."));
        }
      }, 50);
    });

    // 3. Verify we received the message
    wsClient.on('message', (data) => {
      const message = JSON.parse(data);
      try {
        expect(message).toEqual({ price: 100, volume: 50 });
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});