import { useState, useEffect, useCallback } from "react";
import { getExceptionById, type Exception } from "@/lib/mockData";
import { type AISuggestion } from "@/components/exceptions-individual/AISuggestionCard";

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
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const handleAISearch = useCallback((exc?: Exception) => {
    const targetException = exc || exception;
    if (!targetException) return;

    setAiSearching(true);

    setTimeout(() => {
      const suggestions: AISuggestion[] = [
        {
          id: "1",
          title: "Update BIC from Central Registry",
          description:
            "Automatically retrieve the missing BIC code from the SWIFT central registry using the counterparty legal entity identifier (LEI) and update the trade data.",
          confidence: 92,
          reasoning:
            "Analysis of historical data shows that 87% of MISSING BIC exceptions are resolved by querying the SWIFT registry. The counterparty LEI is available in the trade data, enabling automated lookup.",
          similarCases: 234,
          estimatedTime: "2-5 minutes",
        },
        {
          id: "2",
          title: "Map to Alternative Routing Code",
          description:
            "Use the counterparty's alternative routing identifier (ABA/CHIPS) to process the transaction while the BIC is being updated.",
          confidence: 86,
          reasoning:
            "For US-based counterparties, ABA routing numbers can serve as temporary alternatives. This approach has a 78% success rate for temporary processing while BIC lookup continues.",
          similarCases: 168,
          estimatedTime: "10-15 minutes",
        },
      ];

      setAiSuggestions(suggestions);
      setAiSearching(false);
    }, 1500);
  }, [exception]);

  useEffect(() => {
    const exc = getExceptionById(exceptionId);
    if (exc) {
      setException(exc);
      handleAISearch(exc);
    }
  }, [exceptionId, handleAISearch]);

  const handleGenerateAISolution = useCallback(() => {
    if (!exception) return;

    setAiGenerating(true);

    setTimeout(() => {
      let generated = "";

      if (exception.msg.toUpperCase().includes("BIC")) {
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
      } else if (exception.msg.toUpperCase().includes("MARGIN")) {
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
  }, [exception]);

  const handleCopyToDescription = useCallback(() => {
    setNewSolutionDescription(aiGeneratedSolution);
  }, [aiGeneratedSolution]);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(aiGeneratedSolution);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  }, [aiGeneratedSolution]);

  const handleSuggestionClick = useCallback((suggestion: AISuggestion) => {
    setNewSolutionTitle(suggestion.title);
    setNewSolutionDescription(suggestion.description);
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
    copiedToClipboard,
    filteredSuggestions,
    handleAISearch,
    handleGenerateAISolution,
    handleCopyToDescription,
    handleCopyToClipboard,
    handleSuggestionClick,
  };
}
