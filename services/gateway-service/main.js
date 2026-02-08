import { WebSocketServer } from 'ws';
import { createClient } from 'redis';
import express from 'express';
import http from 'http';

const PORT = process.env.PORT || 3002;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

// Setup Redis
const redisSub = createClient({
  url: `redis://${REDIS_HOST}:6379`
});

redisSub.on('error', (err) => console.error('Redis Client Error', err));

// Setup Express & HTTP
const app = express();
app.get('/health', (req, res) => res.status(200).send('OK'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map: trade_id -> Set of Client Sockets
export const tradeRooms = new Map();

export async function start() {
  await redisSub.connect();

  // Redis Subscriber Logic
  await redisSub.subscribe('trade-updates', (message) => {
    try {
      const { trade_id, data } = JSON.parse(message);

      if (tradeRooms.has(trade_id)) {
        // console.log(`Broadcasting update to Trade ${trade_id}`);
        const clients = tradeRooms.get(trade_id);
        
        clients.forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(JSON.stringify(data)); // FIX: Send to client, not clients
          }
        });
      }
    } catch (e) {
      console.error("Bad Message Format from Redis", e);
    }
  });

  // WebSocket Connection Logic
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);

        if (parsed.action === 'SUBSCRIBE' && parsed.trade_id) {
          const { trade_id } = parsed;

          if (!tradeRooms.has(trade_id)) {
            tradeRooms.set(trade_id, new Set());
          }
          
          tradeRooms.get(trade_id).add(ws);
          ws.current_trade_id = trade_id;
          console.log(`Client joined room ${trade_id}`);
        }
      } catch (e) {
        console.error("Invalid JSON from Client", e);
      }
    });

    // Close Websocket
    ws.on('close', () => {
      if (ws.current_trade_id && tradeRooms.has(ws.current_trade_id)) {
        const room = tradeRooms.get(ws.current_trade_id);
        room.delete(ws);
        if (room.size === 0) {
          tradeRooms.delete(ws.current_trade_id);
        }
      }
    });
  });

  // 5. Keep-Alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  // Return server instance for testing
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Gateway service running on ${PORT}`);
      resolve(server);
    });
  });
}

// Only start automatically if this file is run directly (not imported by test)
if (process.argv[1] === import.meta.url) { // Node.js ES Module check
    start();
}