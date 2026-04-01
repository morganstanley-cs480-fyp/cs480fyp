import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/lib/api/searchService';
import type { SearchRequest } from '@/lib/api/types';

export function useTradeSearch(searchParams: SearchRequest | null) {
  return useQuery({
    queryKey: ['trades', 'search', searchParams],
    queryFn: async () => {
      if (!searchParams) return null;
      
      
      const result = await searchService.searchTrades(searchParams);
      
      
      return result;
    },
    enabled: !!searchParams,
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale.
    refetchInterval: 10 * 60 * 1000, // 10 minutes - background polling less frequent
    refetchOnWindowFocus: true,
  });
}