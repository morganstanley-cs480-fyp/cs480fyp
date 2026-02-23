import { useEffect, useRef, useState, useCallback } from 'react';
import type { Transaction, Exception, WebSocketMessage } from '@/lib/api/types';

const GATEWAY_URL = import.meta.env.VITE_WEBSOCKET_URL|| 'ws://localhost:3002';

export function useTradeWebSocket(
  tradeId: number | null,
  initialTransactions: Transaction[] = []
) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Transaction | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [mergedTransactions, setMergedTransactions] = useState<Transaction[]>(initialTransactions);

  // Update merged transactions when initial data changes
  useEffect(() => {
    setMergedTransactions(initialTransactions);
  }, [initialTransactions]);

  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as Transaction;
      console.log('🎯 RAW WebSocket message received:', data);
      setLastUpdate(data);

      // Merge the live update with existing transactions
      setMergedTransactions(prev => {
        const existingIndex = prev.findIndex(t => t.trans_id === data.trans_id);
        
        if (existingIndex !== -1) {
          // Update existing transaction
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          console.log('🔄 Updated existing transaction:', data.trans_id);
          return updated.sort((a, b) => a.step - b.step);
        } else {
          // Add new transaction
          console.log('➕ Added new transaction:', data.trans_id);
          return [...prev, data].sort((a, b) => a.step - b.step);
        }
      });
    } catch (e) {
      console.error('Invalid JSON received:', e);
    }
  }, []);

  useEffect(() => {
    if (!tradeId) {
      console.log('❌ No tradeId provided to WebSocket');
      return;
    }

    console.log(`🔌 Connecting to WebSocket for trade: ${tradeId}`);
    console.log(`🔗 WebSocket URL: ${GATEWAY_URL}`);
    setConnectionStatus('Connecting...');
    
    ws.current = new WebSocket(GATEWAY_URL);

    ws.current.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
      console.log('✅ WebSocket connected successfully');
      
      const subscribeMessage = { 
        action: 'SUBSCRIBE', 
        trade_id: tradeId
      };
      console.log('📤 Sending subscription message:', subscribeMessage);
      ws.current?.send(JSON.stringify(subscribeMessage));
    };

    ws.current.onclose = (event) => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      console.log('❌ WebSocket disconnected:', event.code, event.reason);
    };

    ws.current.onmessage = onMessage;

    ws.current.onerror = (err) => {
      console.error('💥 WebSocket error:', err);
      setConnectionStatus('Error');
    };

    return () => {
      if (ws.current) {
        console.log('🔌 Closing WebSocket connection');
        ws.current.close();
      }
    };
  }, [tradeId, onMessage]);

  return { 
    isConnected, 
    lastUpdate, 
    connectionStatus, 
    mergedTransactions // Return the merged data
  };
}