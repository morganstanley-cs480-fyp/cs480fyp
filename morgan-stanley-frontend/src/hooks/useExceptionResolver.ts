import { useState, useEffect, useCallback } from "react";
import type { Exception } from "@/lib/api/types";
import { exceptionService, type SimilarException } from "@/lib/api/exceptionService";

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  similarCases: number;
  estimatedTime: string;
  // Additional fields from API
  exception_id?: string;
  trade_id?: string;
  similarity_score?: number;
  priority?: string;
  status?: string;
  asset_type?: string;
  clearing_house?: string;
  exception_msg?: string;
  explanation?: string;
}

export function useExceptionResolver(exceptionId: string) {
  const [exception, setException] = useState<Exception | null>(null);
  const [selectedTab, setSelectedTab] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiGeneratedSolution, setAiGeneratedSolution] = useState<string>("");
  const [newSolutionTitle, setNewSolutionTitle] = useState<string>("");
  const [newSolutionDescription, setNewSolutionDescription] = useState<string>("");
  const [aiSolutionType, setAiSolutionType] = useState<string>("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedAISearch, setHasTriedAISearch] = useState(false);

  // Clear selected suggestion when switching tabs
  useEffect(() => {
    setSelectedSuggestion(null);
  }, [selectedTab]);

  // Convert API similar exceptions to AISuggestion format
  const convertSimilarExceptionsToSuggestions = (similarExceptions: SimilarException[]): AISuggestion[] => {
    return similarExceptions.map((similar) => ({
      id: similar.exception_id,
      title: `Similar Case: ${similar.exception_msg}`,
      description: similar.explanation || similar.exception_msg,
      confidence: Math.round(similar.similarity_score),
      reasoning: similar.explanation || `Similar ${similar.asset_type} trade with ${similar.clearing_house}`,
      similarCases: 1,
      estimatedTime: "5-10 minutes",
      // Include original API fields
      exception_id: similar.exception_id,
      trade_id: similar.trade_id.toString(),
      similarity_score: similar.similarity_score,
      priority: similar.priority,
      status: similar.status,
      asset_type: similar.asset_type,
      clearing_house: similar.clearing_house,
      exception_msg: similar.exception_msg,
      explanation: similar.explanation
    }));
  };

  // ✅ Remove hasTriedAISearch from dependencies and handle it inside the function
  const handleAISearch = useCallback(async (exc?: Exception, forceRetry: boolean = false) => {
    const targetException = exc || exception;
    if (!targetException) return;
    
    // ✅ Check hasTriedAISearch inside the function, not in dependencies
    if (hasTriedAISearch && !forceRetry) return;

    setAiSearching(true);
    setError(null);
    setHasTriedAISearch(true);

    try {
      console.log('🔍 Fetching similar exceptions for:', targetException.id);
      
      const response = await exceptionService.getSimilarExceptions(
        targetException.id.toString(),
        5,
        true
      );

      const suggestions = convertSimilarExceptionsToSuggestions(response.similar_exceptions);
      setAiSuggestions(suggestions);
      
      console.log('✅ Found', suggestions.length, 'similar exceptions');
    } catch (error: any) {
      console.error('❌ Failed to fetch similar exceptions:', error);
      
      let errorMessage = 'Failed to load similar exceptions. Please try again.';
      if (error?.message?.includes('validation error')) {
        errorMessage = 'API validation error. The similar exceptions service may be experiencing issues.';
      } else if (error?.message?.includes('trade_id')) {
        errorMessage = 'Data format error in similar exceptions response. Please contact support.';
      }
      
      setError(errorMessage);
      setAiSuggestions([]);
    } finally {
      setAiSearching(false);
    }
  }, [exception]); // ✅ Remove hasTriedAISearch from dependencies

  // ✅ Fix retry function to force a new search
  const retryAISearch = useCallback(() => {
    console.log('🔄 Retrying AI search...');
    setHasTriedAISearch(false);
    setError(null);
    // ✅ Pass forceRetry: true to override the hasTriedAISearch check
    handleAISearch(undefined, true);
  }, [handleAISearch]);

  useEffect(() => {
    let isActive = true;

    const loadException = async () => {
      try {
        console.log('📥 Loading exception:', exceptionId);
        
        const exc = await exceptionService.getExceptionById(Number(exceptionId));
        
        if (!isActive) return;
        
        setException(exc);
        setHasTriedAISearch(false);
        console.log('✅ Exception loaded:', exc);
        
        handleAISearch(exc);
      } catch (error) {
        if (!isActive) return;
        console.error('❌ Failed to load exception:', error);
        setException(null);
        setError('Failed to load exception details. Please try again.');
      }
    };

    loadException();

    return () => {
      isActive = false;
    };
  }, [exceptionId]); // ✅ Keep only exceptionId in dependencies

  const handleGenerateAISolution = useCallback(async () => {
    if (!exception) return;

    setAiGenerating(true);
    setError(null);

    try {
      console.log('🤖 Generating AI solution for exception:', exception.id);
      
      const response = await exceptionService.generateSolution(exception.id.toString());
      
      const formattedSolution = response.generated_solution.raw_response || 
        `${response.generated_solution.root_cause_analysis}\n\nRESOLUTION STEPS:\n${response.generated_solution.recommended_resolution_steps}\n\nRISK CONSIDERATIONS:\n${response.generated_solution.risk_considerations}`;
      
      setAiGeneratedSolution(formattedSolution);
      console.log('✅ AI solution generated');
    } catch (error) {
      console.error('❌ Failed to generate AI solution:', error);
      setError('Failed to generate AI solution. Please try again.');
      setAiGeneratedSolution('');
    } finally {
      setAiGenerating(false);
    }
  }, [exception]);

  const handleCopyToDescription = useCallback(() => {
    setNewSolutionDescription(aiGeneratedSolution);
  }, [aiGeneratedSolution]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(aiGeneratedSolution);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [aiGeneratedSolution]);

  const handleSuggestionClick = useCallback((suggestion: AISuggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  const filteredSuggestions = aiSuggestions.filter(
    (suggestion) =>
      searchQuery === "" ||
      suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suggestion.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
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
    aiSolutionType,
    setAiSolutionType,
    selectedSuggestion,
    copiedToClipboard,
    filteredSuggestions,
    error,
    handleAISearch,
    handleGenerateAISolution,
    handleCopyToDescription,
    handleCopyToClipboard,
    handleSuggestionClick,
    retryAISearch,
  };
}