import { useEffect, useRef, useState, useCallback } from "react";
import type { Transaction, Exception } from "@/lib/api/types";
import { getWebSocketUrl } from "@/lib/utils";
import { toast } from "sonner";

const GATEWAY_URL = getWebSocketUrl();

export function useTradeWebSocket(
  tradeId: number | null,
  initialTransactions: Transaction[] = [],
  initialExceptions: Exception[] = [],
) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Transaction | null>(null);
  const [lastExceptionUpdate, setLastExceptionUpdate] =
    useState<Exception | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [mergedTransactions, setMergedTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [mergedExceptions, setMergedExceptions] =
    useState<Exception[]>(initialExceptions);

  // Update merged transactions when initial data changes
  useEffect(() => {
    setMergedTransactions(initialTransactions);
  }, [initialTransactions]);

  // Update merged exceptions when initial data changes
  useEffect(() => {
    setMergedExceptions(initialExceptions);
  }, [initialExceptions]);

  const showToast = (
    id: number,
    event: string,
    message: string,
  ) => {
    toast(`${event}`, {
      description: `${message} for ID ${id}`,
    });
  };

const onMessage = useCallback((event: MessageEvent) => {
  try {
    const data = JSON.parse(event.data);
    console.log("🎯 RAW WebSocket message received (2):", data);

    // Check if the data is a transaction or exception based on properties
    // Case 1 - Transaction
    if (data.trans_id == undefined) {
      const transactionData = data as Transaction;
      setLastUpdate(transactionData);

      // ✅ Check if transaction exists BEFORE updating state
      const isExistingTransaction = mergedTransactions.some(t => t.id === transactionData.id);

      setMergedTransactions((prev) => {
        const existingIndex = prev.findIndex(
          (t) => t.id === transactionData.id,
        );

        if (existingIndex !== -1) {
          // Replace existing transaction completely
          const updated = [...prev];
          updated[existingIndex] = transactionData;
          console.log("🔄 Replaced existing transaction:", transactionData.id, "Status:", transactionData.status);
          
          // If transaction is CLEARED, hide related exceptions
          if (transactionData.status === 'CLEARED') {
            console.log("🎯 Transaction CLEARED - hiding related exceptions");
            setMergedExceptions((prevExceptions) => 
              prevExceptions.map(exc => 
                exc.trans_id === transactionData.id 
                  ? { ...exc, status: 'CLOSED' }
                  : exc
              )
            );
          }
          return updated.sort((a, b) => a.step - b.step);
        } else {
          // Add new transaction
          console.log("➕ Added new transaction:", transactionData.id);
          return [...prev, transactionData].sort((a, b) => a.step - b.step);
        }
      });

      // ✅ Show toast ONCE after state update
      showToast(
        transactionData.id, 
        "Transaction Update", 
        isExistingTransaction ? "Updated existing transaction" : "Added new transaction"
      );

    } else {
      // Case 2 - Handle exception data
      const exceptionData = data as Exception;
      setLastExceptionUpdate(exceptionData);

      // ✅ Check if exception exists BEFORE updating state
      const isExistingException = mergedExceptions.some(e => e.id === exceptionData.id);

      setMergedExceptions((prev) => {
        const existingIndex = prev.findIndex(
          (e) => e.id === exceptionData.id,
        );

        if (existingIndex !== -1) {
          // Update existing exception
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...exceptionData,
          };
          console.log("🔄 Updated existing exception:", exceptionData.id);
          return updated;
        } else {
          // Add new exception
          console.log("➕ Added new exception:", exceptionData.id);
          return [...prev, exceptionData];
        }
      });

      // ✅ Show toast ONCE after state update
      showToast(
        exceptionData.id, 
        isExistingException ? "Incoming exception update" : "Incoming exception created", 
        `Transaction ID ${exceptionData.trans_id} - ${isExistingException ? "Updated existing exception" : "Added new exception"}`
      );
    }
  } catch (e) {
    console.error("Invalid JSON received:", e);
  }
}, [mergedTransactions, mergedExceptions]); // ✅ Add dependencies

  useEffect(() => {
    if (!tradeId) {
      console.log("❌ No tradeId provided to WebSocket");
      return;
    }

    console.log(`🔌 Connecting to WebSocket for trade: ${tradeId}`);
    console.log(`🔗 WebSocket URL: ${GATEWAY_URL}`);
    setConnectionStatus("Connecting...");

    ws.current = new WebSocket(GATEWAY_URL);

    ws.current.onopen = (event) => {
      setIsConnected(true);
      setConnectionStatus("Connected");

      const socket = event.target as WebSocket;

      console.log("✅ WebSocket connected successfully", {
        time: new Date().toISOString(),
        tradeId,
        url: socket.url,
        protocol: socket.protocol,
        readyState: socket.readyState, // 1 = OPEN
      });
      const subscribeMessage = {
        action: "SUBSCRIBE",
        trade_id: tradeId,
      };
      console.log("📤 Sending subscription message:", subscribeMessage);
      ws.current?.send(JSON.stringify(subscribeMessage));
    };

    ws.current.onclose = (event) => {
      setIsConnected(false);
      setConnectionStatus("Disconnected");
      console.log("❌ WebSocket disconnected:", event.code, event.reason);
    };

    ws.current.onmessage = onMessage;

    ws.current.onerror = (err) => {
      console.error("💥 WebSocket error:", err);
      setConnectionStatus("Error");
    };

    return () => {
      if (ws.current) {
        console.log("🔌 Closing WebSocket connection");
        ws.current.close();
      }
    };
  }, [tradeId, onMessage]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      console.log("🔌 Manually closing WebSocket connection");
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
      setConnectionStatus("Disconnected");
    }
  }, []);

  const forceRefresh = useCallback(() => {
    console.log("🔄 Force refreshing WebSocket connection");
    if (ws.current) {
      ws.current.close();
    }
    // Will trigger reconnection due to tradeId effect
  }, []);

  return {
    isConnected,
    lastUpdate,
    lastExceptionUpdate,
    connectionStatus,
    mergedTransactions,
    mergedExceptions,
    disconnect,
    forceRefresh,
  };
}
