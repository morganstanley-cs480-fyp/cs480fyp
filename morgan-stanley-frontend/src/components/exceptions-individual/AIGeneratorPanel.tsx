// AI solution generator panel (right-side panel in Create New Solution)

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, Copy, Check, FileText, History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface HistoricalCase {
  exception_id: string;
  trade_id: string;
  similarity_score: number;
  exception_narrative: string;
  solution: string | null;
}

interface AIGeneratorPanelProps {
  aiGenerating: boolean;
  onGenerate: () => void;
  aiGeneratedSolution: string;
  historicalCases: HistoricalCase[];
  onCopyToDescription: () => void;
  onCopyToClipboard: () => void;
  copiedToClipboard: boolean;
  aiSolutionType: string;
  onAiSolutionTypeChange: (type: string) => void;
}

export function AIGeneratorPanel({
  aiGenerating,
  onGenerate,
  aiGeneratedSolution,
  historicalCases,
  onCopyToDescription,
  onCopyToClipboard,
  copiedToClipboard,
  // aiSolutionType,
  // onAiSolutionTypeChange,
}: AIGeneratorPanelProps) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  function renderSolutionText(text: string) {
    // Treat numbered headings (e.g. "1. ") as section boundaries
    const normalized = text.replace(/(^|\n)(\d+\.\s+)/g, '$1\n$2');
    const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

    return blocks.map((blk, i) => {
      const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);

      if (lines.every((l) => l.startsWith('- ') || l.startsWith('* '))) {
        return (
          <div key={i} className="mb-4">
            <ul className="list-disc pl-5 space-y-1 text-xs text-black/75">
              {lines.map((l, idx) => (
                <li key={idx}>{formatInline(l.replace(/^[-*]\s*/, ''))}</li>
              ))}
            </ul>
          </div>
        );
      }

      if (lines.every((l) => l.startsWith('→ ') || l.startsWith('->'))) {
        return (
          <div key={i} className="space-y-1 text-xs text-black/75 mb-4">
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#002B51]">→</span>
                <span>{formatInline(l.replace(/^→\s*|^->\s*/,'') as string)}</span>
              </div>
            ))}
          </div>
        );
      }

      if (lines.length > 1 && lines[0].includes(':')) {
        const [heading, ...rest] = lines;
        return (
          <div key={i} className="mb-4">
            <div className="text-xs font-semibold text-black">{formatInline(heading)}</div>
            <div className="text-xs whitespace-pre-wrap text-black/75">{formatInline(rest.join('\n'))}</div>
          </div>
        );
      }

      return (
        <p key={i} className="text-xs whitespace-pre-wrap mb-4 text-black/75">
          {formatInline(blk)}
        </p>
      );
    });
  }

  function formatInline(text: string) {
    const parts: Array<string | JSX.Element> = [];
    const boldRe = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = boldRe.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      parts.push(<strong key={lastIndex}>{m[1]}</strong>);
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));

    return parts.map((p, idx) => (
      typeof p === 'string' ? <span key={idx}>{p}</span> : <span key={idx}>{p}</span>
    ));
  }

  const toggleExpanded = (caseId: string) => {
    setExpandedCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-2">
      {/* <div className="flex items-center gap-4">
        <Label htmlFor="ai-solution-type" className="min-w-fit">Solution Title</Label>
        <Select 
          value={aiSolutionType} 
          onValueChange={onAiSolutionTypeChange}
        >
          <SelectTrigger id="ai-solution-type" className="flex-1">
            <SelectValue placeholder="Select solution type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RETRY MEMO">RETRY MEMO</SelectItem>
            <SelectItem value="EB MAPPING">EB MAPPING</SelectItem>
            <SelectItem value="BLACKSTONE MUSTREAD">
              BLACKSTONE MUSTREAD
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Specific Requirements (Optional)</Label>
        <Input 
          placeholder="E.g., Must include regulatory requirements or Must include cross-system retrying strategies..."
          className="mt-2"
        />
      </div> */}

      <Button
        className="w-full bg-[#002B51] hover:bg-[#001829]"
        onClick={onGenerate}
        disabled={aiGenerating}
      >
        {aiGenerating ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            Generate Solution Description
          </>
        )}
      </Button>

      {aiGeneratedSolution && (
        <div>
          <Label>AI-Generated Solution Description</Label>
          <Card className="bg-black/[0.02] border-black/10 mt-2">
            <CardContent className="p-4">
              <Tabs defaultValue="solution" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="solution" className="flex items-center gap-2">
                    <FileText className="size-4" />
                    Solution
                  </TabsTrigger>
                  <TabsTrigger value="historical" className="flex items-center gap-2">
                    <History className="size-4" />
                    Historical Cases ({historicalCases.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="solution" className="mt-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Lightbulb className="size-5 text-[#002B51] mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-black/75 bg-white border border-black/10 rounded p-3 max-h-64 overflow-y-auto">
                        {renderSolutionText(aiGeneratedSolution)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={onCopyToDescription}
                    >
                      Copy to Description
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={onCopyToClipboard}
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
                </TabsContent>
                
      <TabsContent value="historical" className="mt-4">
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {historicalCases.length > 0 ? (
            historicalCases.map((case_item) => {
              const isExpanded = expandedCases.has(case_item.exception_id);
              const shouldTruncate = case_item.exception_narrative.length > 200;
              
              return (
                <Card key={case_item.exception_id} className="border-black/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Exception {case_item.exception_id}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-green-100 text-green-800"
                        >
                          {case_item.similarity_score.toFixed(1)}% match
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-black/60">
                      Trade ID: {case_item.trade_id}
                    </p>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <CardTitle className="pb-2 text-sm"> Exception Narrative</CardTitle>

                    <div className="text-xs text-black/75">
                      {isExpanded || !shouldTruncate
                        ? renderSolutionText(case_item.exception_narrative)
                        : `${case_item.exception_narrative.slice(0, 200)}...`
                      }
                    </div>
                    {shouldTruncate && (
                      <button
                        onClick={() => toggleExpanded(case_item.exception_id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="size-3" />
                          </>
                        ) : (
                          <>
                            Show More <ChevronDown className="size-3" />
                          </>
                        )}
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-black/50">
              <History className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No historical cases available</p>
            </div>
          )}
        </div>
      </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
