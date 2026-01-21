import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getExceptionById, type Exception } from '@/lib/mockData';

// Component imports
import { ExceptionDetailSidebar } from '@/components/exceptions-individual/ExceptionDetailSidebar';
import { AISuggestionsTab } from '@/components/exceptions-individual/AISuggestionsTab';
import { type AISuggestion } from '@/components/exceptions-individual/AISuggestionCard';
import { NewSolutionForm } from '@/components/exceptions-individual/NewSolutionForm';
import { AIGeneratorPanel } from '@/components/exceptions-individual/AIGeneratorPanel';

export const Route = createFileRoute('/exceptions/$exceptionId')({
  component: ResolveExceptionPage,
});

function ResolveExceptionPage() {
  const { exceptionId } = Route.useParams();
  const navigate = useNavigate();
  
  const [exception, setException] = useState<Exception | null>(null);
  const [selectedTab, setSelectedTab] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiGeneratedSolution, setAiGeneratedSolution] = useState<string>('');
  const [newSolutionTitle, setNewSolutionTitle] = useState<string>('');
  const [newSolutionDescription, setNewSolutionDescription] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const handleAISearch = useCallback((exc?: Exception) => {
    const targetException = exc || exception;
    if (!targetException) return;
    
    setAiSearching(true);
    
    // Simulate AI search
    setTimeout(() => {
      const suggestions: AISuggestion[] = [
        {
          id: '1',
          title: 'Update BIC from Central Registry',
          description: 'Automatically retrieve the missing BIC code from the SWIFT central registry using the counterparty legal entity identifier (LEI) and update the trade data.',
          confidence: 92,
          reasoning: 'Analysis of historical data shows that 87% of MISSING BIC exceptions are resolved by querying the SWIFT registry. The counterparty LEI is available in the trade data, enabling automated lookup.',
          similarCases: 234,
          estimatedTime: '2-5 minutes',
        },
        {
          id: '2',
          title: 'Map to Alternative Routing Code',
          description: "Use the counterparty's alternative routing identifier (ABA/CHIPS) to process the transaction while the BIC is being updated.",
          confidence: 86,
          reasoning: 'For US-based counterparties, ABA routing numbers can serve as temporary alternatives. This approach has a 78% success rate for temporary processing while BIC lookup continues.',
          similarCases: 168,
          estimatedTime: '10-15 minutes',
        },
      ];
      
      setAiSuggestions(suggestions);
      setAiSearching(false);
    }, 1500);
  }, [exception]);

  useEffect(() => {
    const exc = getExceptionById(exceptionId);
    if (exc) {
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setException(exc);
        handleAISearch(exc);
      }, 0);
    }
  }, [exceptionId, handleAISearch]);

  const handleGenerateAISolution = () => {
    if (!exception) return;
    
    setAiGenerating(true);
    
    setTimeout(() => {
      let generated = '';
      
      if (exception.msg.toUpperCase().includes('BIC')) {
        generated = `ROOT CAUSE:
No BIC - Entity label succeeded

RESOLUTION APPROACH:
1. Error Investigation:
   - Verify counterparty legal entity identifier is present
   - Identify intersection connection issues with SWIFT system

2. Solutions:
   - Manual intervention:
     * Query SWIFT registry for BIC using LEI
     * Update counterparty master data
   - Retry Logic:
     * Resend query queries(6): 30s - 60s
     * Increased timeout interval; Exponential backoff (5s, 10s, etc)

3. Manual Intervention:
   - Notify downstream systems (available...)
   - Contact counterparty for BIC verification
   - Update static data in clearing system`;
      } else if (exception.msg.toUpperCase().includes('MARGIN')) {
        generated = `ROOT CAUSE:
Insufficient margin posted

RESOLUTION APPROACH:
1. Margin Calculation Review:
   - Verify initial margin requirements
   - Check for recent market movements
   - Review collateral valuation

2. Client Notification:
   - Contact client for additional collateral
   - Provide margin call details
   - Set deadline for margin posting

3. System Updates:
   - Update margin memo after posting
   - Retry transaction submission
   - Verify margin adequacy`;
      } else {
        generated = `ROOT CAUSE:
${exception.msg}

RESOLUTION APPROACH:
1. Data Validation:
   - Review transaction details for completeness
   - Verify all required fields are populated
   - Check system connectivity status

2. Corrective Actions:
   - Update missing or incorrect data
   - Retry transaction after validation
   - Document findings in memo

3. Escalation Path:
   - If issue persists, escalate to Level 2
   - Consider manual processing as backup
   - Update resolution tracking system`;
      }
      
      setAiGeneratedSolution(generated);
      setAiGenerating(false);
    }, 2000);
  };

  const handleCopyToDescription = () => {
    setNewSolutionDescription(aiGeneratedSolution);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(aiGeneratedSolution);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const handleApplySolution = () => {
    // In real app, this would save to backend
    navigate({ to: '/exceptions' });
  };

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    setNewSolutionTitle(suggestion.title);
    setNewSolutionDescription(suggestion.description);
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" => {
    if (priority === 'HIGH') return 'destructive';
    if (priority === 'MEDIUM') return 'default';
    return 'secondary';
  };

  const filteredSuggestions = aiSuggestions.filter(suggestion =>
    searchQuery === '' ||
    suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!exception) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Resolve Exception {exception.exception_id}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
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
                    onSearch={() => handleAISearch()}
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
