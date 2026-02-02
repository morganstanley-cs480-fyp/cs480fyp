// Individual AI suggestion card belonging to AISuggestionsTab

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, Clock } from "lucide-react";

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  similarCases: number;
  estimatedTime: string;
}

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onClick: () => void;
}

export function AISuggestionCard({ suggestion, onClick }: AISuggestionCardProps) {
  return (
    <Card 
      className="border-2 hover:border-purple-300 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-600" />
            <h4 className="font-medium text-black">
              {suggestion.title}
            </h4>
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

        <p className="text-sm text-black/75 mb-3">
          {suggestion.description}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
          <p className="text-xs font-semibold text-black/75 mb-1">
            AI Reasoning:
          </p>
          <p className="text-xs text-black/75">
            {suggestion.reasoning}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-black/75">
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
  );
}
