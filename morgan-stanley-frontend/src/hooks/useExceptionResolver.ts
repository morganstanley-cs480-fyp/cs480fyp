import { useState, useEffect, useCallback } from "react";
import type { Exception, AISuggestion } from "@/lib/api/types";
import { exceptionService, type SimilarException } from "@/lib/api/exceptionService";
import type { HistoricalCase } from "@/components/exceptions-individual/AIGeneratorPanel";

export function useExceptionResolver(exceptionId: string) {
  const [exception, setException] = useState<Exception | null>(null);
  const [selectedTab, setSelectedTab] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiGeneratedSolution, setAiGeneratedSolution] = useState<string>("");
  const [historicalCases, setHistoricalCases] = useState<HistoricalCase[]>([]);
  const [newSolutionTitle, setNewSolutionTitle] = useState<string>("");
  const [newExceptionDescription, setNewExceptionDescription] = useState<string>("");
  const [newSolutionDescription, setNewSolutionDescription] = useState<string>("");
  const [aiSolutionType, setAiSolutionType] = useState<string>("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedAISearch, setHasTriedAISearch] = useState(false);
  const [loadingSolutionId, setLoadingSolutionId] = useState<string | null>(null);

  // Clear selected suggestion when switching tabs
  useEffect(() => {
    setSelectedSuggestion(null);
  }, [selectedTab]);

  // Convert API similar exceptions to AISuggestion format
  const convertSimilarExceptionsToSuggestions = (similarExceptions: SimilarException[]): AISuggestion[] => {
    return similarExceptions.map((similar) => ({
      title: similar.exception_msg,
      description: similar.explanation || similar.exception_msg,
      confidence: Math.round(similar.similarity_score),
      exception_id: similar.exception_id.toString(),
      trade_id: similar.trade_id.toString(),
      similarity_score: similar.similarity_score,
      priority: similar.priority,
      status: similar.status,
      asset_type: similar.asset_type,
      clearing_house: similar.clearing_house,
      explanation: similar.explanation,
      text: similar.text,
      // Solution fields will be populated when suggestion is selected
      solution_description: undefined,
      exception_description: undefined,
      solution_score: undefined
    }));
  };

  // ✅ Remove hasTriedAISearch from dependencies and handle it inside the function
  const handleAISearch = useCallback(async (exc?: Exception, forceRetry: boolean = false) => {
    const targetException = exc || exception;
    if (!targetException) return;

    // Don't run similar-exceptions search for exceptions that are already closed.
    if ((targetException as Exception).status === 'CLOSED') {
      return;
    }
    
    // ✅ Check hasTriedAISearch inside the function, not in dependencies
    if (hasTriedAISearch && !forceRetry) return;

    setAiSearching(true);
    setError(null);
    setHasTriedAISearch(true);

    try {
      const response = await exceptionService.getSimilarExceptions(
        targetException.id.toString(),
        5,
        true
      );

      const suggestions = convertSimilarExceptionsToSuggestions(response.similar_exceptions);
      setAiSuggestions(suggestions);
    } catch (error: unknown) {
      console.error('❌ Failed to fetch similar exceptions:', error);

      const errorMessageText = error instanceof Error ? error.message : '';
      let errorMessage = 'Failed to load similar exceptions. Please try again.';
      if (errorMessageText.includes('validation error')) {
        errorMessage = 'API validation error. The similar exceptions service may be experiencing issues.';
      } else if (errorMessageText.includes('trade_id')) {
        errorMessage = 'Data format error in similar exceptions response. Please contact support.';
      }

      setError(errorMessage);
      setAiSuggestions([]);
    } finally {
      setAiSearching(false);
    }
  }, [exception, hasTriedAISearch]); // ✅ Remove hasTriedAISearch from dependencies

  // ✅ Fix retry function to force a new search
  const retryAISearch = useCallback(() => {
    setHasTriedAISearch(false);
    setError(null);
    // ✅ Pass forceRetry: true to override the hasTriedAISearch check
    handleAISearch(undefined, true);
  }, [handleAISearch]);

  useEffect(() => {
    let isActive = true;

    const loadException = async () => {
      try {
        const exc = await exceptionService.getExceptionById(Number(exceptionId));
        
        if (!isActive) return;
        
        setException(exc);
        setHasTriedAISearch(false);

          // If the exception is already CLOSED, skip the similar-exceptions search.
          if (exc && exc.status === 'CLOSED') {
            // exception is closed, no AI search needed
          } else {
            handleAISearch(exc);
          }
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
    // handleAISearch intentionally omitted to avoid retriggering the full load flow on callback identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceptionId]); // ✅ Keep only exceptionId in dependencies

  const handleGenerateAISolution = useCallback(async () => {
    if (!exception) return;

    setAiGenerating(true);
    setError(null);

    try {
      
      const response = await exceptionService.generateSolution(exception.id.toString());
      
      const formattedSolution = response.generated_solution.recommended_resolution_steps || 
        `${response.generated_solution.root_cause_analysis}\n\nRESOLUTION STEPS:\n${response.generated_solution.recommended_resolution_steps}\n\nRISK CONSIDERATIONS:\n${response.generated_solution.risk_considerations}`;
      
      setAiGeneratedSolution(formattedSolution);
      
      // Extract and set historical cases
      const cases: HistoricalCase[] = response.historical_cases || [];
      setHistoricalCases(cases);
      
    } catch (error) {
      console.error('❌ Failed to generate AI solution:', error);
      setError('Failed to generate AI solution. Please try again.');
      setAiGeneratedSolution('');
      setHistoricalCases([]);
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

  const handleSuggestionClick = useCallback(async (suggestion: AISuggestion) => {
    // Set the basic suggestion first for immediate UI feedback
    setSelectedSuggestion(suggestion);
    
    // Fetch solution details if not already loaded
    if (!suggestion.solution_description || !suggestion.exception_description) {
      try {
        
        setLoadingSolutionId(suggestion.exception_id); // ✅ Set loading state
        
      
        const solutionDetails = await exceptionService.getSolution(suggestion.exception_id);
        
        // Update the suggestion with solution details
        const updatedSuggestion: AISuggestion = {
          ...suggestion,
          solution_description: solutionDetails.solution_description,
          exception_description: solutionDetails.exception_description,
          solution_score: solutionDetails.scores
        };
        
        setSelectedSuggestion(updatedSuggestion);
        
        // Also update the suggestion in the aiSuggestions array to cache the result
        setAiSuggestions(prev => 
          prev.map(s => 
            s.exception_id === suggestion.exception_id 
              ? updatedSuggestion 
              : s
          )
        );
        
      } catch (error) {
        console.error('❌ Failed to fetch solution details:', error);
        // Keep the basic suggestion even if solution fetch fails
      } finally {
      setLoadingSolutionId(null); // ✅ Clear loading state
    }
    }
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
    historicalCases,
    newSolutionTitle,
    setNewSolutionTitle,
    newExceptionDescription,
    setNewExceptionDescription,
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
    loadingSolutionId,
    handleSuggestionClick,
    retryAISearch,
  };
}