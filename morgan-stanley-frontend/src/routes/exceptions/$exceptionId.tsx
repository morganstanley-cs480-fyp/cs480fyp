import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Component imports
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';
import { AISuggestionsTab } from '@/components/exceptions-individual/AISuggestionsTab';
import { NewSolutionForm } from '@/components/exceptions-individual/NewSolutionForm';
import { AIGeneratorPanel } from '@/components/exceptions-individual/AIGeneratorPanel';

// Hook import
import { useExceptionResolver } from './-useExceptionResolver';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  component: ResolveExceptionPage,
});

function ResolveExceptionPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();
  
  const {
    exception,
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    aiSearching,
    aiGenerating,
    aiSuggestions,
    aiGeneratedSolution,
    newSolutionTitle,
    setNewSolutionTitle,
    newSolutionDescription,
    setNewSolutionDescription,
    copiedToClipboard,
    filteredSuggestions,
    handleAISearch,
    handleGenerateAISolution,
    handleCopyToDescription,
    handleCopyToClipboard,
    handleSuggestionClick,
  } = useExceptionResolver(exceptionId);

  const handleApplySolution = () => {
    // In real app, this would save to backend
    navigate({ to: '/exceptions' });
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  if (!exception) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-black/50">
              <AlertCircle className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">Exception not found</p>
              <Button onClick={() => navigate({ to: '/exceptions' })}>
                <ArrowLeft className="size-4 mr-2" />
                Back to Exceptions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-black">
            Resolve Exception {exception.exception_id}
          </h1>
          <p className="text-sm text-black/75 mt-1">
            Choose a solution method to resolve this exception
          </p>
        </div>
      </div>

      {/* Main Content - Flexbox Layout */}
      <div className="flex gap-6">
        {/* Left Sidebar - Exception Details */}
        <ExceptionDetailSidebar 
          exception={exception} 
          getPriorityColor={getPriorityColor} 
        />

        {/* Right Content - Resolution Method */}
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resolution Method</CardTitle>
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
                  <TabsTrigger value="existing">Select Existing Solution</TabsTrigger>
                  <TabsTrigger value="new">Create New Solution</TabsTrigger>
                </TabsList>

                {/* Select Existing Solution Tab */}
                <TabsContent value="existing" className="space-y-6 mt-6">
                  <AISuggestionsTab
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    aiSearching={aiSearching}
                    onSearch={handleAISearch}
                    aiSuggestions={aiSuggestions}
                    filteredSuggestions={filteredSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </TabsContent>

                {/* Create New Solution Tab */}
                <TabsContent value="new" className="mt-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - Form */}
                    <NewSolutionForm
                      solutionTitle={newSolutionTitle}
                      onSolutionTitleChange={setNewSolutionTitle}
                      solutionDescription={newSolutionDescription}
                      onSolutionDescriptionChange={setNewSolutionDescription}
                    />

                    {/* Right - AI Suggested Solution */}
                    <AIGeneratorPanel
                      aiGenerating={aiGenerating}
                      onGenerate={handleGenerateAISolution}
                      aiGeneratedSolution={aiGeneratedSolution}
                      onCopyToDescription={handleCopyToDescription}
                      onCopyToClipboard={handleCopyToClipboard}
                      copiedToClipboard={copiedToClipboard}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Apply Button */}
          <Button 
            className="w-full h-12 bg-slate-700 hover:bg-slate-800 text-base"
            onClick={handleApplySolution}
            disabled={
              selectedTab === 'new' && (!newSolutionTitle || !newSolutionDescription)
            }
          >
            {selectedTab === 'existing' 
              ? 'Apply Selected Solution' 
              : 'Create & Apply Solution'}
          </Button>
        </div>
      </div>
    </div>
  );
}
