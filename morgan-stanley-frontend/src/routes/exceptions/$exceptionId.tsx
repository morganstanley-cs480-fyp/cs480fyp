import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
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
import { exceptionService } from '@/lib/api/exceptionService';
import { requireAuth } from '@/lib/utils';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  beforeLoad: requireAuth,
  component: ResolveExceptionPage,
});

function ResolveExceptionPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  
  const {
    exception,
    selectedTab,
    setSelectedTab,
    aiSearching,
    aiGenerating,
    aiSuggestions,
    aiGeneratedSolution,
    newSolutionTitle,
    setNewSolutionTitle,
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
  } = useExceptionResolver(exceptionId);

  const handleApplySolution = async () => {
    if (!exception) return;

    setIsApplying(true);
    setApplyError(null);

    try {
      if (selectedTab === 'existing' && selectedSuggestion) {
        // Apply existing solution - just log for now since there's no specific endpoint for this
        console.log('✅ Applied existing solution:', selectedSuggestion.title);
        console.log('Exception ID:', exception.id);
        console.log('Selected suggestion:', selectedSuggestion);
      } else if (selectedTab === 'new' && newSolutionTitle && newSolutionDescription) {
        // Create and save new solution using real API
        console.log('💾 Saving new solution to database...');
        
        const response = await exceptionService.createSolution({
          exceptionId: exception.id.toString(),
          title: newSolutionTitle,
          exception_description: newSolutionDescription,
          reference_event: '',
          solution_description: '',
          scores: Math.floor(Math.random() * 38) // Random score 0-37 as per API spec
        });

        console.log('✅ Solution saved successfully:', response);
      }
      
      // Navigate back to exceptions list
      navigate({ to: '/exceptions' });
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

  const canApplySolution = selectedTab === 'existing' 
    ? !!selectedSuggestion
    : !!(newSolutionTitle && newSolutionDescription);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate({ to: '/exceptions' })}
          className="border-black/15 text-black/75 hover:border-[#002B51] hover:text-[#002B51]"
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-black">
            View Exception {exception.id}
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
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="size-4" />
              <p className="text-sm">{error || applyError}</p>
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
            disabled={!canApplySolution || isApplying}
          >
            {isApplying ? (
              <div className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {selectedTab === 'existing' ? 'Applying Solution...' : 'Saving Solution...'}
              </div>
            ) : (
              <>
                {selectedTab === 'existing' 
                  ? 'Use Selected Solution and Resolve Exception' 
                  : 'Create Solution and Resolve Exception'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}