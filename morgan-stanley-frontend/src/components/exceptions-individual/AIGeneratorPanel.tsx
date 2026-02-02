// AI solution generator panel (right-side panel in Create New Solution)

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Lightbulb, Copy, Check } from "lucide-react";

interface AIGeneratorPanelProps {
  aiGenerating: boolean;
  onGenerate: () => void;
  aiGeneratedSolution: string;
  onCopyToDescription: () => void;
  onCopyToClipboard: () => void;
  copiedToClipboard: boolean;
}

export function AIGeneratorPanel({
  aiGenerating,
  onGenerate,
  aiGeneratedSolution,
  onCopyToDescription,
  onCopyToClipboard,
  copiedToClipboard,
}: AIGeneratorPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-purple-600" />
          <h3 className="font-semibold text-black">
            AI Suggested Solution
          </h3>
        </div>
      </div>

      <div>
        <Label>Solution Type</Label>
        <p className="text-sm text-black mt-1">RETRY MEMO</p>
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
                <p className="text-sm font-medium text-black mb-2">
                  AI-generated solution based on exception details and your requirements. 
                  You can copy this to use in "Create New Solution" or reference it here.
                </p>
                <pre className="text-xs text-black/75 bg-white border border-purple-200 rounded p-3 whitespace-pre-wrap font-mono">
                  {aiGeneratedSolution}
                </pre>
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
      )}
    </div>
  );
}
