import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/lib/api/searchService';
import type { SearchRequest } from '@/lib/api/types';

export function useTradeSearch(searchParams: SearchRequest | null) {
  return useQuery({
    queryKey: ['trades', 'search', searchParams],
    queryFn: async () => {
      if (!searchParams) return null;
      
      console.log('🚀 TanStack Query: Making API call', {
        time: new Date().toISOString(),
        searchParams
      });
      
      const result = await searchService.searchTrades(searchParams);
      
      console.log('✅ TanStack Query: API call completed', {
        time: new Date().toISOString(),
        resultCount: result?.results?.length
      });
      
      return result;
    },
    enabled: !!searchParams,
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale.
    refetchInterval: 10 * 60 * 1000, // 10 minutes - background polling less frequent
    refetchOnWindowFocus: true,
  });
}