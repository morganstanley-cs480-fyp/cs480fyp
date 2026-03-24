import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';
import { ResolvedSolutionDetails } from '@/components/exceptions-individual/ResolvedSolutionDetails';
import { exceptionService, type RetrievedSolution } from '@/lib/api/exceptionService';
import type { Exception } from '@/lib/api/types';
import { requireAuth } from '@/lib/utils';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  beforeLoad: requireAuth,
  component: ExceptionDetailsPage,
});

function ExceptionDetailsPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();

  const [exception, setException] = useState<Exception | null>(null);
  const [loadingException, setLoadingException] = useState(true);
  const [exceptionError, setExceptionError] = useState<string | null>(null);

  const [resolvedSolution, setResolvedSolution] = useState<RetrievedSolution | null>(null);
  const [loadingResolvedSolution, setLoadingResolvedSolution] = useState(false);
  const [resolvedSolutionError, setResolvedSolutionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadException = async () => {
      setLoadingException(true);
      setExceptionError(null);

      try {
        const exceptionIdNumber = Number(exceptionId);
        const response = await exceptionService.getExceptionById(exceptionIdNumber);

        if (!isActive) return;
        setException(response);
      } catch (error) {
        if (!isActive) return;
        console.error('❌ Failed to load exception details:', error);
        setExceptionError('Failed to load exception details. Please try again.');
        setException(null);
      } finally {
        if (isActive) {
          setLoadingException(false);
        }
      }
    };

    loadException();

    return () => {
      isActive = false;
    };
  }, [exceptionId]);

  useEffect(() => {
    let isActive = true;

    const loadResolvedSolution = async () => {
      if (!exception || exception.status !== 'CLOSED') {
        setResolvedSolution(null);
        setResolvedSolutionError(null);
        setLoadingResolvedSolution(false);
        return;
      }

      setLoadingResolvedSolution(true);
      setResolvedSolutionError(null);

      try {
        const solution = await exceptionService.getSolution(exception.id.toString());
        if (!isActive) return;
        setResolvedSolution(solution);
      } catch (fetchError) {
        if (!isActive) return;
        setResolvedSolution(null);
        setResolvedSolutionError('This exception is closed, but its applied solution could not be loaded.');
        console.error('❌ Failed to fetch resolved solution details:', fetchError);
      } finally {
        if (isActive) {
          setLoadingResolvedSolution(false);
        }
      }
    };

    loadResolvedSolution();

    return () => {
      isActive = false;
    };
  }, [exception]);

  const getPriorityColor = (priority: string): 'default' | 'destructive' | 'secondary' => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate({ to: '/exceptions' });
  };

  if (loadingException) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-black/50">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-lg">Loading exception details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exceptionError || !exception) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <AlertCircle className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">Failed to load exception</p>
              <p className="text-sm text-gray-600 mb-4">{exceptionError}</p>
              <Button onClick={() => navigate({ to: '/exceptions' })}>
                Back to Exceptions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-400 mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-black">Exception {exception.id}</h1>
          <p className="text-sm text-black/75 mt-1">Exception details (read-only)</p>
        </div>
      </div>

      {exception.status === 'PENDING' ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-4" />
              <p className="text-sm">Exception resolution is currently disabled for users.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-6">
        <ExceptionDetailSidebar
          exception={exception}
          getPriorityColor={getPriorityColor}
        />

        <div className="flex-1 space-y-6">
          {exception.status === 'CLOSED' && loadingResolvedSolution ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-black/50">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-lg">Loading applied solution details...</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {exception.status === 'CLOSED' && !loadingResolvedSolution && resolvedSolutionError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm">{resolvedSolutionError}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {exception.status === 'CLOSED' && !loadingResolvedSolution && resolvedSolution ? (
            <ResolvedSolutionDetails solution={resolvedSolution} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
