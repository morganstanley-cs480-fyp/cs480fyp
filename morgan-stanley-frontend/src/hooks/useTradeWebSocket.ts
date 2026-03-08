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
    console.log("🎯 RAW WebSocket message received:", data);

    // Case 1 - Transaction
    if (data.trans_id == undefined) {
      const transactionData = data as Transaction;
      setLastUpdate(transactionData);

      setMergedTransactions((prevTransactions) => {
        // ✅ Use functional update to get fresh state
        const isExistingTransaction = prevTransactions.some(t => t.id === transactionData.id);
        const existingIndex = prevTransactions.findIndex(t => t.id === transactionData.id);

        let updatedTransactions;
        if (existingIndex !== -1) {
          // Replace existing transaction completely
          updatedTransactions = [...prevTransactions];
          updatedTransactions[existingIndex] = transactionData;
          console.log("🔄 Replaced existing transaction:", transactionData.id);
        } else {
          // Add new transaction
          updatedTransactions = [...prevTransactions, transactionData];
          console.log("➕ Added new transaction:", transactionData.id);
        }

        // ✅ Show toast inside the state update to ensure it runs once
        setTimeout(() => {
          showToast(
            transactionData.id, 
            "Transaction Update", 
            isExistingTransaction ? "Updated existing transaction" : "Added new transaction"
          );
        }, 0);

        return updatedTransactions.sort((a, b) => a.step - b.step);
      });

      // If transaction is CLEARED, update related exceptions
      if (transactionData.status === 'CLEARED') {
        setMergedExceptions((prevExceptions) => 
          prevExceptions.map(exc => 
            exc.trans_id === transactionData.id 
              ? { ...exc, status: 'CLOSED' }
              : exc
          )
        );
      }

    } else {
      // Case 2 - Exception
      const exceptionData = data as Exception;
      setLastExceptionUpdate(exceptionData);

      setMergedExceptions((prevExceptions) => {
        // ✅ Use fresh state from functional update
        const isExistingException = prevExceptions.some(e => e.id === exceptionData.id);
        const existingIndex = prevExceptions.findIndex(e => e.id === exceptionData.id);

        // ✅ Validate exception against current transaction state
        setMergedTransactions((currentTransactions) => {
          const relatedTransaction = currentTransactions.find(t => t.id === exceptionData.trans_id);
          if (!relatedTransaction) {
            console.warn(`⚠️ Exception ${exceptionData.id} references non-existent transaction ${exceptionData.trans_id}`);
            console.log("📊 Available transactions:", currentTransactions.map(t => t.id));
          }
          return currentTransactions; // No change to transactions
        });

        let updatedExceptions;
        if (existingIndex !== -1) {
          // Update existing exception
          updatedExceptions = [...prevExceptions];
          updatedExceptions[existingIndex] = {
            ...updatedExceptions[existingIndex],
            ...exceptionData,
          };
          console.log("🔄 Updated existing exception:", exceptionData.id);
        } else {
          // Add new exception  
          updatedExceptions = [...prevExceptions, exceptionData];
          console.log("➕ Added new exception:", exceptionData.id);
        }

        // ✅ Show toast inside state update
        setTimeout(() => {
          showToast(
            exceptionData.id, 
            isExistingException ? "Exception Updated" : "New Exception Created", 
            `Transaction ${exceptionData.trans_id} - ${isExistingException ? "Updated exception" : "New exception"}`
          );
        }, 0);

        return updatedExceptions;
      });
    }
  } catch (e) {
    console.error("Invalid JSON received:", e);
  }
}, []); // ✅ Remove dependencies to prevent stale closures

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
