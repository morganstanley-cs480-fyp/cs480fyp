import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/api/types';
import {tradeFlowService} from "@/lib/api/tradeFlowService.ts";

export function useTransactions(tradeId: number | null) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tradeId) {
            return;
        }

        const fetchTransactions = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await tradeFlowService.getTransactionsByTradeId(tradeId);

                // Sort transactions by step to ensure consistent ordering
                const sortedTransactions = data.sort((a, b) => a.step - b.step);

                setTransactions(sortedTransactions);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                console.error('💥 Failed to fetch transactions:', err);
                setError(errorMessage);
                setTransactions([]); // Reset to empty array on error
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [tradeId]);
    return { transactions, loading, error };
}