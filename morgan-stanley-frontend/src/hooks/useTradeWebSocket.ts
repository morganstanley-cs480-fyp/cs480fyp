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

        setMergedTransactions((prev) => {
          const existingIndex = prev.findIndex(
            (t) => t.id === transactionData.id,
          );

          if (existingIndex !== -1) {
            // Update existing transaction
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...transactionData,
            };
            console.log("🔄 Updated existing transaction:", transactionData.id);
            return updated.sort((a, b) => a.step - b.step);
          } else {
            // Add new transaction
            console.log("➕ Added new transaction:", transactionData.id);
            return [...prev, transactionData].sort((a, b) => a.step - b.step);
          }
        });

        // Show toast AFTER state update
        showToast(transactionData.id, "Transaction Update", 
          mergedTransactions.some(t => t.id === transactionData.id) 
            ? "Updated existing transaction" 
            : "Added new transaction"
        );
      } else {
        // Case 2 - Handle exception data
        const exceptionData = data as Exception;
        setLastExceptionUpdate(exceptionData);

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
            showToast(exceptionData.id, "Incoming exception update", `Transaction ID ${exceptionData.trans_id} - Updated existing exception`)
            return updated;
          } else {
            // Add new exception
            console.log("➕ Added new exception:", exceptionData.id);
            showToast(exceptionData.id, "Incoming exception created", `Transaction ID ${exceptionData.trans_id} - Added new exception`) 
            return [...prev, exceptionData];
          }
        });

        // Show toast AFTER state update
        showToast(exceptionData.id, "Exception Update",
          mergedExceptions.some(e => e.id === exceptionData.id)
            ? "Updated existing exception"
            : "Added new exception"
        );
      }
    } catch (e) {
      console.error("Invalid JSON received:", e);
    }
  }, []);

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

  return {
    isConnected,
    lastUpdate,
    lastExceptionUpdate,
    connectionStatus,
    mergedTransactions,
    mergedExceptions,
  };
}
