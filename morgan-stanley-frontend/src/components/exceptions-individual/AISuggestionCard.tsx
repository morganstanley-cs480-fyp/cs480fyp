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

        {/* Solution Description */}
        {suggestion.solution_description && (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
              <Clock className="size-3" />
              Proven Solution:
            </p>
            <p className="text-xs text-green-700">
              {suggestion.solution_description}
            </p>
          </div>
        )}

        {/* AI Explanation */}
        {suggestion.explanation && (
          <div className="bg-black/[0.02] border border-black/10 rounded p-3">
            <p className="text-xs font-semibold text-black/75 mb-1">
              AI Analysis:
            </p>
            <p className="text-xs text-black/75">
              {suggestion.explanation}
            </p>
          </div>
        )}

        {/* ✅ Loading state for solution details */}
        {!hasSolutionDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
            {isLoadingSolution ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-3 animate-spin text-gray-600" />
                <p className="text-xs text-gray-600">Loading solution details...</p>
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center">
                Click to load solution details...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
