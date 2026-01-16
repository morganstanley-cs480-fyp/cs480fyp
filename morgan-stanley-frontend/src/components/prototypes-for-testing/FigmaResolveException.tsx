import { useState, useEffect } from 'react';
import { useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { ArrowLeft, Sparkles, Search, Clock, Users, AlertCircle, Lightbulb, Loader2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Exception {
  id: string;
  event: string;
  status: 'PENDING' | 'CLOSED';
  exceptionMsg: string;
  exceptionTime: string;
  comments: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  updateTime: string;
}

interface Solution {
  id: string;
  title: string;
  exceptionDescription: string;
  referenceEvent: string;
  solutionDescription: string;
  createTime: string;
  scores: number;
}

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  similarCases: number;
  estimatedTime: string;
}

const mockSolutions: Solution[] = [
  {
    id: '387551',
    title: 'EB MAPPING',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: 'Update entity mapping in EB system',
    createTime: '2025-02-15 09:30:22',
    scores: 23,
  },
  {
    id: '745500',
    title: 'RETRY MEMO',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: 'Retry transaction with updated memo',
    createTime: '2025-04-08 14:12:45',
    scores: 37,
  },
  {
    id: '463491',
    title: 'BLACKSTONE MUSTREAD',
    exceptionDescription: 'USER INPUT',
    referenceEvent: '',
    solutionDescription: 'Review Blackstone must-read documentation',
    createTime: '2025-06-22 11:05:18',
    scores: 15,
  },
];

export function ResolveException() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { exceptionId?: string };
  const search = useSearch({ strict: false }) as { from?: string } | undefined;
  
  const [exception, setException] = useState<Exception | null>(null);
  const [solutions] = useState<Solution[]>(mockSolutions);
  const [selectedTab, setSelectedTab] = useState<'existing' | 'new'>('existing');
  const [selectedSolution, setSelectedSolution] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiGeneratedSolution, setAiGeneratedSolution] = useState<string>('');
  const [newSolutionTitle, setNewSolutionTitle] = useState<string>('');
  const [newSolutionDescription, setNewSolutionDescription] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Load exception data (in real app, this would fetch from API)
  useEffect(() => {
    const id = params.exceptionId;
    if (id) {
      // Mock data - in real app, fetch from API
      setException({
        id: id,
        event: '69690882',
        status: 'PENDING',
        exceptionMsg: 'MISSING BIC',
        exceptionTime: '2025-08-15 10:23:45',
        comments: 'NO BIC',
        priority: 'HIGH',
        updateTime: '2025-08-16 10:45:12',
      });
      
      // Auto-trigger AI suggestions
      setTimeout(() => handleAISearch(), 500);
    }
  }, [params.exceptionId]);

  const handleAISearch = () => {
    if (!exception) return;
    
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
  };

  const handleGenerateAISolution = () => {
    if (!exception) return;
    
    setAiGenerating(true);
    
    setTimeout(() => {
      let generated = '';
      
      if (exception.exceptionMsg.includes('BIC')) {
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
      } else if (exception.exceptionMsg.includes('MARGIN')) {
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
${exception.exceptionMsg}

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
    const backRoute = search?.from === 'flow' ? '/flow' : '/exceptions';
    navigate({ to: backRoute });
  };

  if (!exception) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <AlertCircle className="size-12 mx-auto mb-3" />
              <p className="text-lg mb-2">Exception not found</p>
              <Button onClick={() => navigate({ to: '/exceptions' })}>
                Back to Exceptions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredSuggestions = aiSuggestions.filter(suggestion =>
    searchQuery === '' ||
    suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            const backRoute = search?.from === 'flow' ? '/flow' : '/exceptions';
            navigate({ to: backRoute });
          }}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Exceptions
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resolve Exception {exception.id}</h1>
          <p className="text-sm text-slate-600 mt-1">Choose a solution method to resolve this exception</p>
        </div>
      </div>

      {/* Main Content - Flexbox Layout */}
      <div className="flex gap-6">
        {/* Left Sidebar - Exception Details */}
        <div className="w-[280px] flex-shrink-0">
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Exception Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Exception ID</p>
                <p className="font-medium text-slate-900">{exception.id}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Event Reference</p>
                <p className="font-medium text-slate-900">{exception.event}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Exception Type</p>
                <p className="font-medium text-slate-900">{exception.exceptionMsg}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Priority</p>
                <Badge 
                  variant={exception.priority === 'HIGH' ? 'destructive' : 'secondary'}
                  className={exception.priority === 'HIGH' ? 'bg-red-600' : ''}
                >
                  {exception.priority}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Comments</p>
                <p className="text-sm text-slate-900">{exception.comments}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Exception Time</p>
                <p className="text-sm text-slate-900">{exception.exceptionTime}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-1">Last Update</p>
                <p className="text-sm text-slate-900">{exception.updateTime}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Resolution Method */}
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resolution Method</CardTitle>
              <CardDescription>Choose an existing solution or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'existing' | 'new')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Select Existing Solution</TabsTrigger>
                  <TabsTrigger value="new">Create New Solution</TabsTrigger>
                </TabsList>

                {/* Select Existing Solution Tab */}
                <TabsContent value="existing" className="space-y-6 mt-6">
                  {/* AI-Powered Suggestions */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-purple-600" />
                        <h3 className="font-semibold text-slate-900">AI-Powered Suggestions</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAISearch}
                        disabled={aiSearching}
                      >
                        {aiSearching ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="size-4 mr-2" />
                            Search
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        placeholder="Search solutions by title, description, solution ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {aiSuggestions.length > 0 && (
                      <div className="space-y-3">
                        {filteredSuggestions.map((suggestion) => (
                          <Card 
                            key={suggestion.id}
                            className="border-2 hover:border-purple-300 transition-colors cursor-pointer"
                            onClick={() => {
                              setNewSolutionTitle(suggestion.title);
                              setNewSolutionDescription(suggestion.description);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="size-4 text-purple-600" />
                                  <h4 className="font-medium text-slate-900">{suggestion.title}</h4>
                                </div>
                                <Badge 
                                  className={
                                    suggestion.confidence >= 90 
                                      ? 'bg-green-600 hover:bg-green-700' 
                                      : suggestion.confidence >= 80 
                                      ? 'bg-orange-500 hover:bg-orange-600' 
                                      : 'bg-slate-600 hover:bg-slate-700'
                                  }
                                >
                                  {suggestion.confidence}% Confidence
                                </Badge>
                              </div>

                              <p className="text-sm text-slate-700 mb-3">{suggestion.description}</p>

                              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
                                <p className="text-xs font-semibold text-slate-700 mb-1">AI Reasoning:</p>
                                <p className="text-xs text-slate-600">{suggestion.reasoning}</p>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Users className="size-3" />
                                  <span>Based on {suggestion.similarCases} similar cases</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  <span>Est. time: {suggestion.estimatedTime}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {aiSearching && (
                      <div className="text-center py-8">
                        <Loader2 className="size-8 mx-auto mb-3 animate-spin text-purple-600" />
                        <p className="text-sm text-slate-600">AI is analyzing the exception...</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Create New Solution Tab */}
                <TabsContent value="new" className="mt-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - Form */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="solution-title">Solution Title</Label>
                        <Select value={newSolutionTitle} onValueChange={setNewSolutionTitle}>
                          <SelectTrigger id="solution-title">
                            <SelectValue placeholder="Select solution type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RETRY MEMO">RETRY MEMO</SelectItem>
                            <SelectItem value="EB MAPPING">EB MAPPING</SelectItem>
                            <SelectItem value="BLACKSTONE MUSTREAD">BLACKSTONE MUSTREAD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="solution-description">Solution Description</Label>
                        <Textarea
                          id="solution-description"
                          placeholder="Describe the solution in detail..."
                          value={newSolutionDescription}
                          onChange={(e) => setNewSolutionDescription(e.target.value)}
                          className="h-64 font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Right - AI Suggested Solution */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-5 text-purple-600" />
                          <h3 className="font-semibold text-slate-900">AI Suggested Solution</h3>
                        </div>
                      </div>

                      <div>
                        <Label>Solution Type</Label>
                        <p className="text-sm text-slate-900 mt-1">RETRY MEMO</p>
                      </div>

                      <div>
                        <Label>Specific Requirements (Optional)</Label>
                        <Input 
                          placeholder="E.g., Must include regulatory requirements or Must include cross-system retrying strategies..."
                          className="mt-1"
                        />
                      </div>

                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={handleGenerateAISolution}
                        disabled={aiGenerating}
                      >
                        {aiGenerating ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4 mr-2" />
                            Generate AI Solution
                          </>
                        )}
                      </Button>

                      {aiGeneratedSolution && (
                        <Card className="bg-purple-50 border-purple-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-2 mb-3">
                              <Lightbulb className="size-5 text-purple-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 mb-2">
                                  AI-generated solution based on exception details and your requirements. 
                                  You can copy this to use in "Create New Solution" or reference it here.
                                </p>
                                <pre className="text-xs text-slate-700 bg-white border border-purple-200 rounded p-3 whitespace-pre-wrap font-mono">
                                  {aiGeneratedSolution}
                                </pre>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={handleCopyToDescription}
                              >
                                Copy to Description
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={handleCopyToClipboard}
                              >
                                {copiedToClipboard ? (
                                  <>
                                    <Check className="size-4 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-4 mr-2" />
                                    Copy to Clipboard
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Apply Button */}
          <Button 
            className="w-full h-12 bg-slate-700 hover:bg-slate-800 text-base"
            onClick={handleApplySolution}
            disabled={selectedTab === 'new' && (!newSolutionTitle || !newSolutionDescription)}
          >
            {selectedTab === 'existing' ? 'Apply Selected Solution' : 'Create & Apply Solution'}
          </Button>
        </div>
      </div>
    </div>
  );
}