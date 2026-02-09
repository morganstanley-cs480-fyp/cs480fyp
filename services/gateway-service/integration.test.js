// integration.test.js
import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { createClient } from 'redis';
import { start, tradeRooms, redisSub } from './main.js';

describe('Integration Test (Docker + Redis)', () => {
  let server;
  let wsClient;
  let publisherClient; // We need this to simulate the Backend Service
  const PORT = 3002;

  beforeAll(async () => {
    // 1. Start the Gateway (connects to the 'redis' container)
    server = await start();

    // 2. Setup a Publisher Client (Simulates your Data Ingestion Service)
    // In Docker, hostname is 'redis'. Localhost fallback for debugging.
    const redisHost = process.env.REDIS_HOST || 'localhost';
    publisherClient = createClient({ url: `redis://${redisHost}:6379` });
    await publisherClient.connect();
  });

  afterAll(async () => {
    // Cleanup: Close everything or Jest won't exit
    if (wsClient) wsClient.close();
    if (publisherClient) await publisherClient.disconnect();
    
    // We must close the Redis client inside the app too
    if (redisSub) await redisSub.disconnect();
    
    server.close();
  });

  test('Full Flow: Frontend Subscribes -> Backend Publishes -> Frontend Receives', (done) => {
    // Connect to the Gateway
    wsClient = new WebSocket(`ws://localhost:${PORT}`);

    wsClient.on('open', () => {
      // A. Frontend sends SUBSCRIBE
      const subMsg = JSON.stringify({ action: 'SUBSCRIBE', trade_id: 'trade_real_1' });
      wsClient.send(subMsg);

      // Give it 100ms to register in the Map
      setTimeout(async () => {
        try {
          // Verify subscription exists in memory
          expect(tradeRooms.has('trade_real_1')).toBe(true);

          // B. Backend (Publisher) sends update to Redis
          const payload = { 
            trade_id: 'trade_real_1', 
            data: { price: 105.5, volume: 1000 } 
          };
          
          // Publish to the REAL Redis container
          await publisherClient.publish('trade-updates', JSON.stringify(payload));
          
        } catch (err) {
          done(err);
        }
      }, 500);
    });

    // C. Verify Frontend receives the message
    wsClient.on('message', (msg) => {
      try {
        const received = JSON.parse(msg.toString());
        expect(received).toEqual({ price: 105.5, volume: 1000 });
        done(); // Test Passed!
      } catch (err) {
        done(err);
      }
    });
    
    wsClient.on('error', (err) => done(err));
  });
});