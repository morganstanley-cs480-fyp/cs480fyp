// AI solution generator panel (right-side panel in Create New Solution)

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb, Copy, Check } from "lucide-react";

interface AIGeneratorPanelProps {
  aiGenerating: boolean;
  onGenerate: () => void;
  aiGeneratedSolution: string;
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
  onCopyToDescription,
  onCopyToClipboard,
  copiedToClipboard,
  aiSolutionType,
  onAiSolutionTypeChange,
}: AIGeneratorPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
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
      </div>

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
            Generate AI Solution
          </>
        )}
      </Button>

      {aiGeneratedSolution && (
        <div>
          <Label>AI-Generated Solution Description</Label>
          <Card className="bg-slate-50 border-slate-200 mt-2">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <Lightbulb className="size-5 text-[#002B51] mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-black/75 bg-white border border-slate-200 rounded p-3 whitespace-pre-wrap">
                    {aiGeneratedSolution}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
