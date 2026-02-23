import { transactionService } from '@/lib/api/transactionService';
import { useState, useEffect } from 'react';
import type { Transaction } from '@/lib/api/types';

export function useTransactions(tradeId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tradeId) {
      console.log('❌ No tradeId provided to useTransactions');
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔄 Fetching transactions for trade ${tradeId}...`);
        const data = await transactionService.getTransactionsByTradeId(tradeId);
        
        // Sort transactions by step to ensure consistent ordering
        const sortedTransactions = data.sort((a, b) => a.step - b.step);
        
        console.log('📊 Successfully fetched and sorted transactions:', sortedTransactions);
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