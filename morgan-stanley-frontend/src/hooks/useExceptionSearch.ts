import { useQuery } from '@tanstack/react-query';
import { exceptionService } from '@/lib/api/exceptionService';

export function useExceptionSearch() {
  return useQuery({
    queryKey: ['exceptions', 'search'],
    queryFn: async () => {
      
      // Always get all exceptions from the single endpoint
      const allExceptions = await exceptionService.getExceptions();

      
      return {
        results: allExceptions,
        total: allExceptions.length,
        allExceptions: allExceptions // Return all for stats calculation
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
    refetchInterval: 10 * 60 * 1000, // 10 minutes - background polling
    refetchOnWindowFocus: true,
  });
}