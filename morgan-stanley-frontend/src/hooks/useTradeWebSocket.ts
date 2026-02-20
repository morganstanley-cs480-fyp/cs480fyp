import { useEffect, useRef, useState, useCallback } from 'react';

const GATEWAY_URL = 'ws://localhost:3002'; // Your gateway service URL

export function useTradeWebSocket(tradeId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Callback to handle incoming updates
  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      setLastUpdate(data);
    } catch (e) {
      console.error('Invalid JSON received:', e);
    }
  }, []);

  useEffect(() => {
    if (!tradeId) return;

    // Initialize WebSocket
    ws.current = new WebSocket(GATEWAY_URL);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Subscribe to trade updates
      ws.current?.send(JSON.stringify({ 
        action: 'SUBSCRIBE', 
        trade_id: tradeId 
      }));
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    ws.current.onmessage = onMessage;

    ws.current.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    // Cleanup
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [tradeId, onMessage]);

  return { isConnected, lastUpdate };
}