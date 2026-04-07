import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Component imports
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';
import { AISuggestionsTab } from '@/components/exceptions-individual/AISuggestionsTab';
import { NewSolutionForm } from '@/components/exceptions-individual/NewSolutionForm';
import { AIGeneratorPanel } from '@/components/exceptions-individual/AIGeneratorPanel';
import { ResolvedSolutionDetails } from '@/components/exceptions-individual/ResolvedSolutionDetails';
import { ExceptionTradeFlow } from '@/components/exceptions-individual/ExceptionTradeFlow';

// Hook and API imports
import { useExceptionResolver } from '../../hooks/useExceptionResolver';
import { exceptionService, type RetrievedSolution } from '@/lib/api/exceptionService';
import { requireAuth } from '@/lib/utils';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  beforeLoad: requireAuth,
  component: ResolveExceptionPage,
});

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Exception service error (404)');
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('Exception service error (409)') || error.message.toLowerCase().includes('already exists'))
  );
}

function normalizeToRetrievedSolution(
  solution: RetrievedSolution | {
    exception_id: number;
    title: string;
    exception_description: string;
    reference_event: string;
    solution_description: string;
    scores: number;
    id: number;
    create_time: string;
  }
): RetrievedSolution {
  return {
    exception_id: solution.exception_id,
    title: solution.title,
    exception_description: solution.exception_description,
    reference_event: solution.reference_event,
    solution_description: solution.solution_description,
    scores: solution.scores,
    id: solution.id,
    create_time: solution.create_time,
  };
}

function ResolveExceptionPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === '1';
  const returnToTradeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('returnToTrade') : null;
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [resolvedSolution, setResolvedSolution] = useState<RetrievedSolution | null>(null);
  const [loadingResolvedSolution, setLoadingResolvedSolution] = useState(false);
  const [resolvedSolutionError, setResolvedSolutionError] = useState<string | null>(null);
  const [existingPendingSolution, setExistingPendingSolution] = useState<RetrievedSolution | null>(null);
  const [loadingExistingPendingSolution, setLoadingExistingPendingSolution] = useState(false);
  const [resolutionDetails, setResolutionDetails] = useState<{
    type: 'existing' | 'new';
    action?: 'created' | 'updated';
    solutionTitle: string;
    exceptionId: number;
    solutionId?: number | string;
  } | null>(null);
  
  const {
    exception,
    selectedTab,
    setSelectedTab,
    aiSearching,
    aiGenerating,
    aiSuggestions,
    aiGeneratedSolution,
    historicalCases,
    newSolutionTitle,
    setNewSolutionTitle,
    newExceptionDescription,
    setNewExceptionDescription,
    newSolutionDescription,
    setNewSolutionDescription,
    aiSolutionType,
    setAiSolutionType,
    selectedSuggestion,
    copiedToClipboard,
    filteredSuggestions,
    error,
    handleGenerateAISolution,
    handleCopyToDescription,
    handleCopyToClipboard,
    handleSuggestionClick,
    retryAISearch, // ✅ Get retry function
    loadingSolutionId
  } = useExceptionResolver(exceptionId);

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

  useEffect(() => {
    let isActive = true;

    const loadExistingPendingSolution = async () => {
      if (!exception || exception.status !== 'PENDING') {
        setExistingPendingSolution(null);
        setNewSolutionTitle('');
        setNewExceptionDescription('');
        setNewSolutionDescription('');
        setLoadingExistingPendingSolution(false);
        return;
      }

      setLoadingExistingPendingSolution(true);

      try {
        const solution = await exceptionService.getSolution(exception.id.toString());
        if (!isActive) return;
        setExistingPendingSolution(solution);
        setNewSolutionTitle(solution.title || '');
        setNewExceptionDescription(solution.exception_description || '');
        setNewSolutionDescription(solution.solution_description || '');
      } catch (fetchError) {
        if (!isActive) return;
        setExistingPendingSolution(null);
        setNewSolutionTitle('');
        setNewExceptionDescription('');
        setNewSolutionDescription('');

        // Missing pending solution is an expected state for new exceptions.
        if (!isNotFoundError(fetchError)) {
          console.error('❌ Failed to fetch pending solution details:', fetchError);
        }
      } finally {
        if (isActive) {
          setLoadingExistingPendingSolution(false);
        }
      }
    };

    void loadExistingPendingSolution();

    return () => {
      isActive = false;
    };
  }, [
    exception,
    setNewSolutionTitle,
    setNewExceptionDescription,
    setNewSolutionDescription,
  ]);

  const handleApplySolution = async () => {
    if (!exception) return;

    if (selectedTab === 'new') {
      const missingFields: string[] = [];

      if (!newSolutionTitle.trim()) {
        missingFields.push('Solution Title');
      }
      if (!newExceptionDescription.trim()) {
        missingFields.push('Exception Description');
      }
      if (!newSolutionDescription.trim()) {
        missingFields.push('Solution Description');
      }

      if (missingFields.length > 0) {
        const reminder = `Please fill in required fields: ${missingFields.join(', ')}`;
        setApplyError(reminder);
        window.alert(reminder);
        return;
      }
    }

    setIsApplying(true);
    setApplyError(null);

    try {
      if (selectedTab === 'existing' && selectedSuggestion) {
        // Save a solution record based on the selected suggestion without changing exception status.
        console.log('✅ Saving existing solution template:', selectedSuggestion.title);
        console.log('Exception ID:', exception.id);
        console.log('Selected suggestion:', selectedSuggestion);

        const solutionPayload = {
          title: selectedSuggestion.solution_title || selectedSuggestion.title,
          exception_description: selectedSuggestion.exception_description || selectedSuggestion.description,
          reference_event: '',
          solution_description: selectedSuggestion.solution_description,
          scores: selectedSuggestion.solution_score || Math.round(selectedSuggestion.similarity_score)
        };

        const hasExistingSolution = exception.status === 'PENDING' && !!existingPendingSolution;

        const solutionResponse = hasExistingSolution
          ? await exceptionService.updateSolution(existingPendingSolution.id, solutionPayload)
          : await (async () => {
              try {
                return await exceptionService.createSolution({
                  exception_id: exception.id,
                  ...solutionPayload,
                });
              } catch (saveError) {
                // Handle race/parallel save cases where a solution was created after page load.
                if (isAlreadyExistsError(saveError)) {
                  const existing = await exceptionService.getSolution(exception.id.toString());
                  return exceptionService.updateSolution(existing.id, solutionPayload);
                }
                throw saveError;
              }
            })();

        const normalizedSolution = normalizeToRetrievedSolution(solutionResponse);
        setExistingPendingSolution(normalizedSolution);
        setNewSolutionTitle(normalizedSolution.title || '');
        setNewExceptionDescription(normalizedSolution.exception_description || '');
        setNewSolutionDescription(normalizedSolution.solution_description || '');

        console.log('✅ Solution record created:', solutionResponse);

        console.log('✅ Solution saved. Exception status unchanged.');
        
        // Show success dialog with existing solution details
        setResolutionDetails({
          type: 'existing',
          solutionTitle: selectedSuggestion.title,
          exceptionId: exception.id,
          solutionId: solutionResponse.id
        });
      } else if (selectedTab === 'new' && newSolutionTitle && newExceptionDescription && newSolutionDescription) {
        const isUpdatingPendingSolution =
          exception.status === 'PENDING' && !!existingPendingSolution;

        console.log(
          isUpdatingPendingSolution
            ? '💾 Updating existing pending solution in database...'
            : '💾 Saving new solution to database...'
        );

        const solutionPayload = {
          title: newSolutionTitle,
          exception_description: newExceptionDescription,
          reference_event: '',
          solution_description: newSolutionDescription,
          scores: existingPendingSolution?.scores ?? Math.floor(Math.random() * 28),
        };

        const solutionResponse = isUpdatingPendingSolution
          ? await exceptionService.updateSolution(existingPendingSolution.id, solutionPayload)
          : await exceptionService.createSolution({
              exception_id: exception.id,
              ...solutionPayload,
            });

        console.log('✅ Solution saved successfully:', solutionResponse);
        
        console.log('✅ Solution saved. Exception status unchanged.');
        if (isUpdatingPendingSolution) {
          setExistingPendingSolution(solutionResponse as RetrievedSolution);
        }

        const normalizedSolution = normalizeToRetrievedSolution(solutionResponse);
        setExistingPendingSolution(normalizedSolution);
        setNewSolutionTitle(normalizedSolution.title || '');
        setNewExceptionDescription(normalizedSolution.exception_description || '');
        setNewSolutionDescription(normalizedSolution.solution_description || '');
        
        // Show success dialog with new solution details
        setResolutionDetails({
          type: 'new',
          action: isUpdatingPendingSolution ? 'updated' : 'created',
          solutionTitle: newSolutionTitle,
          exceptionId: exception.id,
          solutionId: solutionResponse.id
        });
      }
      
      // Show visual confirmation dialog
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('❌ Failed to apply solution:', error);
      setApplyError('Failed to apply solution. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  const navigateToTrade = (tradeId: string) => {
    const tradePath = `/trades/${tradeId}`;

    if (typeof window !== 'undefined' && window.top && window.top !== window) {
      window.top.location.assign(tradePath);
      return;
    }

    window.location.href = tradePath;
  };

  const syncPendingSolutionView = async () => {
    if (!exception || exception.status !== 'PENDING') {
      return;
    }

    setLoadingExistingPendingSolution(true);

    try {
      const latestSolution = await exceptionService.getSolution(exception.id.toString());
      setExistingPendingSolution(latestSolution);
      setNewSolutionTitle(latestSolution.title || '');
      setNewExceptionDescription(latestSolution.exception_description || '');
      setNewSolutionDescription(latestSolution.solution_description || '');
    } catch (fetchError) {
      if (!isNotFoundError(fetchError)) {
        console.error('❌ Failed to sync pending solution view:', fetchError);
      }
      setExistingPendingSolution(null);
      setNewSolutionTitle('');
      setNewExceptionDescription('');
      setNewSolutionDescription('');
    } finally {
      setLoadingExistingPendingSolution(false);
    }
  };

  const handleSuccessDialogOpenChange = (open: boolean) => {
    setShowSuccessDialog(open);
    if (!open) {
      void syncPendingSolutionView();
    }
  };

  const handleBack = () => {
    if (returnToTradeId) {
      navigateToTrade(returnToTradeId);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate({ to: '/exceptions' });
  };

  if (error && !exception) {
    return (
      <div className={isEmbedded ? 'p-4 max-w-450 mx-auto' : 'p-6 max-w-7xl mx-auto'}>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <AlertCircle className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">Failed to load exception</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={() => navigate({ to: '/exceptions' })}>
                Back to Exceptions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exception) {
    return (
      <div className={isEmbedded ? 'p-4 max-w-450 mx-auto' : 'p-6 max-w-7xl mx-auto'}>
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

  if (exception.status === 'CLOSED') {
    return (
      <div className={isEmbedded ? 'p-4 max-w-450 mx-auto space-y-4' : 'p-6 max-w-400 mx-auto space-y-6'}>
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
            <h1 className="text-2xl font-semibold text-black">
              Exception {exception.id} Already Resolved
            </h1>
            <p className="text-sm text-black/75 mt-1">
              Showing the applied solution details for this exception
            </p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <ExceptionDetailSidebar
            exception={exception}
            getPriorityColor={getPriorityColor}
          >
            <ExceptionTradeFlow
              transactionId={exception.trans_id}
              fallbackTradeId={exception.trade_id}
              embedded
            />
          </ExceptionDetailSidebar>

          <div className="flex-1 min-w-0 space-y-6">
            {loadingResolvedSolution ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-black/50">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-lg">Loading applied solution details...</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!loadingResolvedSolution && resolvedSolutionError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="size-4" />
                    <p className="text-sm">{resolvedSolutionError}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {!loadingResolvedSolution && resolvedSolution ? (
              <ResolvedSolutionDetails solution={resolvedSolution} />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const canApplySolution = selectedTab === 'existing'
    ? !!selectedSuggestion
    : true;

  return (
    <div className={isEmbedded ? 'p-4 max-w-450 mx-auto space-y-4' : 'p-6 max-w-400 mx-auto space-y-6'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
        >
          {returnToTradeId ? 'Back to Trade' : 'Back'}
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-black">
            Resolve Exception {exception.id}
          </h1>
          <p className="text-sm text-black/75 mt-1">
            Choose a solution method to resolve this exception
          </p>
        </div>
      </div>

      {/* Error Display */}
      {(error || applyError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="size-4" />
                <p className="text-sm">{error || applyError}</p>
              </div>
              {/* ✅ Add retry button for similar exceptions errors */}
              {error && error.includes('similar exceptions') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryAISearch}
                  disabled={aiSearching}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  {aiSearching ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-3 w-3 border-b border-red-700 mr-2"></div>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Flexbox Layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Sidebar - Exception Details */}
        <ExceptionDetailSidebar 
          exception={exception} 
          getPriorityColor={getPriorityColor} 
        >
          <ExceptionTradeFlow
            transactionId={exception.trans_id}
            fallbackTradeId={exception.trade_id}
            embedded
            hideOpenTradeButton={!!returnToTradeId}
          />
        </ExceptionDetailSidebar>

        {/* Right Content - Exception Management */}
        <div className="flex-1 min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exception Management</CardTitle>
              <CardDescription>
                Choose an existing solution or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exception.status === 'PENDING' && existingPendingSolution && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2 text-blue-800">
                      <AlertCircle className="size-4 mt-0.5" />
                      <p className="text-sm">
                        A solution is already tied to this pending exception. You can edit it directly in
                        the <span className='font-bold'>Create New Solution with AI</span> form below and save your updates.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs 
                value={selectedTab} 
                onValueChange={(v) => setSelectedTab(v as 'existing' | 'new')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Select Existing RAG-Powered Solution</TabsTrigger>
                  <TabsTrigger value="new">Create New Solution with AI</TabsTrigger>
                </TabsList>

                {/* Select Existing Solution Tab */}
                <TabsContent value="existing" className="space-y-6">
                  <AISuggestionsTab
                    aiSearching={aiSearching}
                    aiSuggestions={aiSuggestions}
                    filteredSuggestions={filteredSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                    selectedSuggestion={selectedSuggestion}
                    loadingSolutionId={loadingSolutionId}
                  />
                </TabsContent>

                {/* Create New Solution Tab */}
                <TabsContent value="new">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - AI Suggested Solution */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-black/75">
                        Generate with AI Assistant
                      </h3>
                      <Card className="border-[#002B51]">
                        <CardContent className="pt-2 px-4 pb-4">
                          <AIGeneratorPanel
                            aiGenerating={aiGenerating}
                            onGenerate={handleGenerateAISolution}
                            aiGeneratedSolution={aiGeneratedSolution}
                            historicalCases={historicalCases}
                            onCopyToDescription={handleCopyToDescription}
                            onCopyToClipboard={handleCopyToClipboard}
                            copiedToClipboard={copiedToClipboard}
                            aiSolutionType={aiSolutionType}
                            onAiSolutionTypeChange={setAiSolutionType}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right - Form */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-black/75">
                        Input and Save Solution to Repository
                      </h3>
                      <Card className="border-[#002B51]">
                        <CardContent className="pt-2 px-4 pb-4">
                          <NewSolutionForm
                            solutionTitle={newSolutionTitle}
                            onSolutionTitleChange={setNewSolutionTitle}
                            exceptionDescription={newExceptionDescription}
                            onExceptionDescriptionChange={setNewExceptionDescription}
                            solutionDescription={newSolutionDescription}
                            onSolutionDescriptionChange={setNewSolutionDescription}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Apply Button */}
          <Button 
            className="w-full h-12 bg-[#002B51] hover:bg-[#003a6b] text-white text-sm font-semibold disabled:opacity-50"
            onClick={handleApplySolution}
            disabled={!canApplySolution || isApplying || loadingExistingPendingSolution}
          >
            {isApplying ? (
              <div className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {selectedTab === 'existing' ? 'Applying Solution...' : 'Saving Solution...'}
              </div>
            ) : (
              <>
                {selectedTab === 'existing' 
                  ? 'Use Selected Solution and Save Solution' 
                  : exception.status === 'PENDING' && existingPendingSolution
                    ? 'Update and Save Solution'
                    : 'Create and Save Solution'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={handleSuccessDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-green-800">
                  {resolutionDetails?.type === 'new' && resolutionDetails?.action === 'updated'
                    ? 'Solution Updated Successfully!'
                    : 'Solution Saved Successfully!'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {resolutionDetails?.type === 'existing' 
                    ? `Saved existing solution "${resolutionDetails.solutionTitle}"`
                    : resolutionDetails?.action === 'updated'
                      ? `Updated and saved solution "${resolutionDetails?.solutionTitle}"`
                      : `Created and saved new solution "${resolutionDetails?.solutionTitle}"`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Exception ID:</span>
                <span className="text-sm text-gray-900">#{resolutionDetails?.exceptionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Solution ID:</span>
                <span className="text-sm text-gray-900">#{resolutionDetails?.solutionId || 'N/A'}</span>
              </div>              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Resolution Method:</span>
                <span className="text-sm text-gray-900">
                  {resolutionDetails?.type === 'existing'
                    ? 'Saved Existing Solution'
                    : resolutionDetails?.action === 'updated'
                      ? 'Updated Existing Pending Solution'
                      : 'Saved New Solution'}
                </span>
              </div>

            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {/* <Button 
              variant="outline" 
              onClick={() => setShowSuccessDialog(false)}
              className="flex-1"
            >
              Stay Here
            </Button> */}
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                if (returnToTradeId) {
                  navigateToTrade(returnToTradeId);
                  return;
                }

                void syncPendingSolutionView();
              }}
              className="flex-1 bg-[#002B51] hover:bg-[#003a6b] text-white"
            >
              {returnToTradeId ? 'Back to Trade' : 'Back to Exception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}