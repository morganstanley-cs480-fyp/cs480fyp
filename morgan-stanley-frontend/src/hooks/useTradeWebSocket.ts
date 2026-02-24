import { useEffect, useRef, useState, useCallback } from 'react';
import type { Transaction, Exception } from '@/lib/api/types';
import { getWebSocketUrl } from '@/lib/utils';


const GATEWAY_URL = getWebSocketUrl();

export function useTradeWebSocket(
  tradeId: number | null,
  initialTransactions: Transaction[] = [],
  initialExceptions: Exception[] = []
) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Transaction | null>(null);
  const [lastExceptionUpdate, setLastExceptionUpdate] = useState<Exception | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [mergedTransactions, setMergedTransactions] = useState<Transaction[]>(initialTransactions);
  const [mergedExceptions, setMergedExceptions] = useState<Exception[]>(initialExceptions);

  // Update merged transactions when initial data changes
  useEffect(() => {
    setMergedTransactions(initialTransactions);
  }, [initialTransactions]);

  // Update merged exceptions when initial data changes
  useEffect(() => {
    setMergedExceptions(initialExceptions);
  }, [initialExceptions]);

  const onMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('🎯 RAW WebSocket message received:', data);
      
      // Check if the data is a transaction or exception based on properties
      if (data.exception_id == undefined) {
        // Handle transaction update
        const transactionData = data as Transaction;
        setLastUpdate(transactionData);

        setMergedTransactions(prev => {
          const existingIndex = prev.findIndex(t => t.trans_id === transactionData.trans_id);
          
          if (existingIndex !== -1) {
            // Update existing transaction
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...transactionData };
            console.log('🔄 Updated existing transaction:', transactionData.trans_id);
            return updated.sort((a, b) => a.step - b.step);
          } else {
            // Add new transaction
            console.log('➕ Added new transaction:', transactionData.trans_id);
            return [...prev, transactionData].sort((a, b) => a.step - b.step);
          }
        });
      } else if (data.exception_id !== undefined) {
        // Handle exception update
        const exceptionData = data as Exception;
        setLastExceptionUpdate(exceptionData);

        setMergedExceptions(prev => {
          const existingIndex = prev.findIndex(e => e.exception_id === exceptionData.exception_id);
          
          if (existingIndex !== -1) {
            // Update existing exception
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...exceptionData };
            console.log('🔄 Updated existing exception:', exceptionData.exception_id);
            return updated;
          } else {
            // Add new exception
            console.log('➕ Added new exception:', exceptionData.exception_id);
            return [...prev, exceptionData];
          }
        });
      }
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
    lastExceptionUpdate,
    connectionStatus, 
    mergedTransactions,
    mergedExceptions
  };
}