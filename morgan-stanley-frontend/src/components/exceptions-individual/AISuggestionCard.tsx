// Individual AI suggestion card belonging to AISuggestionsTab
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertCircle, Activity, Loader2 } from "lucide-react";
import type { AISuggestion } from "@/lib/api/types";

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onClick: () => void;
  isSelected?: boolean;
  isLoadingSolution?: boolean;
}

export function AISuggestionCard({ suggestion, onClick, isSelected = false, isLoadingSolution = false }: AISuggestionCardProps) {
  // Priority color mapping
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Status color mapping
  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'CLOSED': return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  
  const hasSolutionDetails = suggestion.solution_description && suggestion.exception_description;

  function renderSolutionText(text: string) {
    // Treat numbered headings (e.g. "1. ") as section boundaries
    // Insert a blank line before any numbered heading, then split on blank lines
    const normalized = text.replace(/(^|\n)(\d+\.\s+)/g, '$1\n$2');
    const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

    return blocks.map((blk, i) => {
      const lines = blk.split('\n').map((l) => l.trim()).filter(Boolean);

      // Bullet list
      // Support single-asterisk list items (e.g. '* item') and hyphen lists
      if (lines.every((l) => l.startsWith('- ') || l.startsWith('* '))) {
        return (
          <div key={i} className="mb-4">
            <ul className="list-disc pl-5 space-y-1">
              {lines.map((l, idx) => (
                <li key={idx}>{formatInline(l.replace(/^[-*]\s*/, ''))}</li>
              ))}
            </ul>
          </div>
        );
      }

      // Arrow sequence (transaction steps)
      if (lines.every((l) => l.startsWith('→ ') || l.startsWith('->'))) {
        return (
          <div key={i} className="space-y-1 mb-4">
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-green-800">→</span>
                <span>{formatInline(l.replace(/^→\s*|^->\s*/,'') as string)}</span>
              </div>
            ))}
          </div>
        );
      }

      // Heading + body: if first line looks like a heading (contains ':'), bold it
      if (lines.length > 1 && lines[0].includes(':')) {
        const [heading, ...rest] = lines;
        return (
          <div key={i} className="mb-4">
            <div className="text-xs font-semibold text-green-800">{formatInline(heading)}</div>
            <div className="text-xs whitespace-pre-wrap text-green-700">{formatInline(rest.join('\n'))}</div>
          </div>
        );
      }

      // Fallback: preserve line breaks
      return (
        <p key={i} className="text-xs whitespace-pre-wrap mb-4">
          {formatInline(blk)}
        </p>
      );
    });
  }

  function formatInline(text: string) {
    // Replace **bold** with <strong>
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


  return (
    <Card 
      className={`border-2 transition-colors cursor-pointer ${
        isSelected 
          ? 'border-[#002B51] bg-[#002B51]/5' 
          : 'border-black/10 hover:border-[#002B51]/30'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base text-black mb-2">
              <span className="text-black/60"> Exception Message: </span> {suggestion.title}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                Exception #{suggestion.exception_id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Trade #{suggestion.trade_id}
              </Badge>
            </div>
          </div>
          <Badge 
            className={
              suggestion.similarity_score >= 85 
                ? 'bg-green-600 hover:bg-green-700' 
                : suggestion.similarity_score >= 80 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-black/75 hover:bg-black/85'
            }
          >
            {suggestion.similarity_score.toFixed(1)}% Match
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Trade Context */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="size-3 text-black/60" />
              <span className="text-xs font-medium text-black/60">Asset Type</span>
            </div>
            <p className="text-sm text-black pl-5">{suggestion.asset_type}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3 text-black/60" />
              <span className="text-xs font-medium text-black/60">Clearing House</span>
            </div>
            <p className="text-sm text-black pl-5">{suggestion.clearing_house}</p>
          </div>
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
            Priority: {suggestion.priority}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(suggestion.status)}`}>
            Status: {suggestion.status}
          </Badge>
        </div>


        {/* AI Explanation */}
        {suggestion.explanation && (
          <div className="bg-black/[0.02] border border-black/10 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-black/75 mb-1">
              AI Analysis:
            </p>
            <p className="text-xs text-black/75">
              {suggestion.explanation}
            </p>
          </div>
        )}

        {/* Solution Text */}
        {suggestion.text && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
              Solution Text:
            </p>

            <div className="text-xs text-green-700">
              {renderSolutionText(suggestion.text)}
            </div>
          </div>
        )}        

          {/* Solution Description */}
        {suggestion.solution_description && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
              <Clock className="size-3" />
              Solution Explanation:
            </p>
            <p className="text-xs text-green-700">
              {suggestion.solution_description}
            </p>
          </div>
        )}    

        {/* Exception Description */}
        {suggestion.exception_description && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
              <AlertCircle className="size-3" />
              Exception Details:
            </p>
            <p className="text-xs text-blue-700">
              {suggestion.exception_description}
            </p>
          </div>
        )}

    

        {/* ✅ Loading state for solution details */}
        {!hasSolutionDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
            {isLoadingSolution ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-3 animate-spin text-gray-600" />
                <p className="text-xs text-gray-600">Loading additional context...</p>
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center">
                Click to load additional context...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
