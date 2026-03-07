import { useQuery } from '@tanstack/react-query';
import { exceptionService } from '@/lib/api/exceptionService';

export interface ExceptionSearchParams {
  statusFilter: 'ALL' | 'PENDING' | 'CLOSED';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export function useExceptionSearch(searchParams: ExceptionSearchParams) {
  return useQuery({
    queryKey: ['exceptions', 'search', searchParams],
    queryFn: async () => {
      console.log('🚀 TanStack Query: Loading all exceptions with filters', {
        time: new Date().toISOString(),
        searchParams
      });
      
      // Always get all exceptions from the single endpoint
      const allExceptions = await exceptionService.getExceptions();
      let filtered = [...allExceptions];

      // Apply status filter
      if (searchParams.statusFilter !== "ALL") {
        filtered = filtered.filter((exc) => exc.status === searchParams.statusFilter);
      }

      // Apply priority filter
      if (searchParams.priorityFilter !== "ALL") {
        filtered = filtered.filter((exc) => exc.priority === searchParams.priorityFilter);
      }

      console.log('✅ TanStack Query: Exceptions loaded and filtered', {
        time: new Date().toISOString(),
        totalCount: allExceptions.length,
        filteredCount: filtered.length
      });
      
      return {
        results: filtered,
        total: allExceptions.length,
        allExceptions: allExceptions // Return all for stats calculation
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
    refetchInterval: 10 * 60 * 1000, // 10 minutes - background polling
    refetchOnWindowFocus: true,
  });
}