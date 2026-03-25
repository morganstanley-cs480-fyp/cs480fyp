import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Component imports
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';
import { AISuggestionsTab } from '@/components/exceptions-individual/AISuggestionsTab';
import { NewSolutionForm } from '@/components/exceptions-individual/NewSolutionForm';
import { AIGeneratorPanel } from '@/components/exceptions-individual/AIGeneratorPanel';

// Hook and API imports
import { useExceptionResolver } from '../../hooks/useExceptionResolver';
import { requireAuth } from '@/lib/utils';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  beforeLoad: requireAuth,
  component: ViewExceptionPage,
});

function ViewExceptionPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();
  
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
    // Cleanup effect - no resolved solution loading needed
    return () => {};
  }, [exception]);


  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" => {
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

  if (error && !exception) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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

  if (exception.status === 'CLOSED') {
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
            <h1 className="text-2xl font-semibold text-black">
              Exception {exception.id} Already Resolved
            </h1>
            <p className="text-sm text-black/75 mt-1">
              This exception has been resolved and cannot be modified
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resolution Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-black/75">This exception was previously resolved. You may browse other exceptions to continue working.</p>
            <div className="mt-4">
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
      {/* Header */}
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
            View Exception {exception.id}
          </h1>
          <p className="text-sm text-black/75 mt-1">
            View exception details and generate or select solutions
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="size-4" />
                <p className="text-sm">{error}</p>
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
      <div className="flex gap-6">
        {/* Left Sidebar - Exception Details */}
        <ExceptionDetailSidebar 
          exception={exception} 
          getPriorityColor={getPriorityColor} 
        />

        {/* Right Content - Exception Management */}
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exception Management</CardTitle>
              <CardDescription>
                Choose an existing solution or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
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
        </div>
      </div>
    </div>
  );
}