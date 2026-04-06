// The gradient search header with natural language search input

import { Search, Filter, Sparkles, Star, X as XIcon, Eraser, AlertCircle, Bot, ChevronDown } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import type { QueryHistory } from "@/lib/api/types";

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  queryId: number; // Add query_id for saving
}

export interface TypeaheadSuggestion {
  query_id: number;
  query_text: string;
  is_saved: boolean;
  query_name: string | null;
  last_use_time?: string | null;
  score: number;
  category?: string | null;
}

interface SearchHeaderProps {
  searchQuery: string;
  searching: boolean;
  chatLoading: boolean;
  chatMode?: "table" | "analysis" | "both" | null;
  chatAnswer?: string | null;
  chatEvidence?: {
    dimensions: string[];
    rows: Record<string, unknown>[];
    chart: {
      title: string;
      x_key: string;
      y_key: string;
      labels: string[];
      series: Array<{
        name: string;
        data: number[];
      }>;
      chart_type?: 'bar' | 'line' | 'pie';
    };
    metadata: {
      top_k: number;
      priority_filter: string[] | null;
      row_count: number;
    };
  } | null;
  chatThread?: Array<{ role: "user" | "assistant"; content: string }>;
  followUpPrompts?: string[];
  chatError?: string | null;
  showFilters: boolean;
  recentSearches: RecentSearch[];
  savedQueries: QueryHistory[];
  canSaveQuery: boolean;
  suggestions: TypeaheadSuggestion[];
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onAskAI: () => void;
  onToggleFilters: () => void;
  onRecentSearchClick: (query: string) => void;
  onDeleteSearch: (id: string) => void;
  onClearAllSearches: () => void;
  onSaveCurrentQuery: () => void;
  onClearSearch: () => void;
  onSuggestionClick: (query: string) => void;
  onFollowUpPromptClick: (query: string) => void;
  onDeleteSavedQuery: (queryId: number) => void;
}

export function SearchHeader({
  searchQuery,
  searching,
  chatLoading,
  chatMode,
  chatAnswer,
  chatEvidence,
  chatThread,
  followUpPrompts,
  chatError,
  recentSearches,
  savedQueries,
  canSaveQuery,
  suggestions,
  onSearchQueryChange,
  onSearch,
  onAskAI,
  onToggleFilters,
  onRecentSearchClick,
  onDeleteSearch,
  onClearAllSearches,
  onSaveCurrentQuery,
  onClearSearch,
  onSuggestionClick,
  onFollowUpPromptClick,
  onDeleteSavedQuery,
}: SearchHeaderProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [evidenceSortDirection, setEvidenceSortDirection] = useState<"desc" | "asc">("desc");
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar' | 'line' | 'pie' | null>(null);
  const [chatResultsCollapsed, setChatResultsCollapsed] = useState(false);
  const CHART_COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#002B51', '#0ea5e9', '#8b5cf6'];

  const isQueryValid = searchQuery.trim().length >= 3;

  const handleSearch = () => {
    if (!isQueryValid) {
      setValidationError("Search failed: Value error, query_text must be at least 3 characters");
      return;
    }
    setValidationError(null);
    onSearch();
  };

  const handleAskAI = () => {
    if (!isQueryValid) {
      setValidationError("Search failed: Value error, query_text must be at least 3 characters");
      return;
    }
    setValidationError(null);
    onAskAI();
  };

  const handleSearchClick = (query: string) => {
    setValidationError(null); // Clear any validation errors when clicking suggestions
    onRecentSearchClick(query);
  };

  const handleSavedQueryClick = (queryText: string) => {
    setValidationError(null); // Clear any validation errors when clicking suggestions
    onRecentSearchClick(queryText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      handleSearch(); // Use our validation wrapper
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setValidationError(null);
    }
  };

  const handleQueryChange = (query: string) => {
    onSearchQueryChange(query);
    if (validationError && query.trim().length >= 3) {
      setValidationError(null); // Clear error once user types enough characters
    }
    setShowSuggestions(true);
  };

  const handleClearSearch = () => {
    setValidationError(null);
    onClearSearch();
  };

  const chartData = chatEvidence?.chart?.labels?.map((label, index) => {
    const point: Record<string, string | number> = { label };
    chatEvidence.chart.series.forEach((s) => {
      point[s.name] = s.data[index] ?? 0;
    });
    return point;
  }) ?? [];
  const effectiveChartType: 'bar' | 'line' | 'pie' = chartTypeOverride ?? chatEvidence?.chart?.chart_type ?? 'bar';

  const evidenceRows = (() => {
    if (!chatEvidence?.rows?.length) return [];

    const rows = chatEvidence.rows.map((row) => ({
      label:
        `${String(row.dimension_1 ?? "UNKNOWN")}${row.dimension_2 ? ` · ${String(row.dimension_2)}` : ""}`,
      priority: String(row.priority ?? "N/A"),
      exception_count: Number(row.exception_count ?? 0),
      affected_trades: Number(row.affected_trades ?? 0),
    }));

    rows.sort((a, b) =>
      evidenceSortDirection === "desc"
        ? b.exception_count - a.exception_count
        : a.exception_count - b.exception_count
    );

    return rows;
  })();

  return (
    <div
      className="rounded-xl p-10 text-white relative"
      style={{ background: "linear-gradient(135deg, #002B51 0%, #003a6b 60%, #0d2d60 100%)" }}
    >
      {/* Glow — isolated in its own overflow-hidden wrapper so it doesn't clip the suggestions dropdown */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
      </div>

      {/* AI Badge */}
      <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-4">
        <Sparkles className="size-3 text-white/80" />
        <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">AI-Powered Search</span>
      </div>

      <h2 className="text-xl font-semibold text-white mb-1.5">Advanced Trade Lifecycle Search</h2>
      <p className="text-white/70 text-sm mb-7">
        Search trades using specific filters. Find trades by ID, counterparty, date range, and more.
      </p>

      {/* Search row */}
      <div className="flex gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-black/50 z-10" />
          <Input
            placeholder="Search by trade ID, counterparty, product type etc. Please enter at least 3 characters or more."
            className={`pl-10 pr-32 bg-white h-12 text-black ${
              validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            value={searchQuery}
            autoComplete="off"
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
          />
          {/* Typeahead suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && !validationError && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-black/10 bg-white shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.query_id}-${i}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-black hover:bg-black/4 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click registers
                    setShowSuggestions(false);
                    onSuggestionClick(s.query_text);
                  }}
                >
                  <Search className="size-3.5 shrink-0 text-black/30" />
                  <span className="truncate">{s.query_text}</span>
                  {s.is_saved && <Star className="size-3 shrink-0 ml-auto text-yellow-500 fill-yellow-400" />}
                </button>
              ))}
            </div>
          )}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-8 px-2 text-black/60 hover:text-black hover:bg-black/5"
              title="Clear search"
            >
              <Eraser className="size-4 mr-1" />
              Reset Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSaveCurrentQuery}
              disabled={!canSaveQuery || !isQueryValid}
              className="h-8 px-2 text-black/60 hover:text-black hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!isQueryValid ? "Query must be at least 3 characters to save" : "Save this query"}
            >
              <Star className="size-4 mr-1" />
              Save Query
            </Button>
          </div>
        </div>
        <Button
          onClick={handleSearch}
          disabled={searching || !isQueryValid}
          className={`h-12 px-7 font-semibold text-sm shadow-sm border-0 ${
            !isQueryValid 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-[#002B51] hover:bg-white/90'
          }`}
          title={!isQueryValid ? "Please enter at least 3 characters" : "Search"}
        >
          {searching ? "Searching..." : "Search"}
        </Button>
        <Button
          onClick={handleAskAI}
          disabled={chatLoading || !isQueryValid}
          className={`h-12 px-7 font-semibold text-sm shadow-sm border-0 ${
            !isQueryValid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#002B51] text-white hover:bg-[#003a6b]'
          }`}
          title={!isQueryValid ? "Please enter at least 3 characters" : "Ask AI"}
        >
          <Bot className="size-4 mr-2" />
          {chatLoading ? "Thinking..." : "Ask AI"}
        </Button>
        <Button
          onClick={onToggleFilters}
          className="bg-white/10 text-white hover:bg-white/18 border border-white/18 h-12 px-5 text-sm font-medium"
        >
          <Filter className="size-3.5 mr-2" />
          Manual Search
        </Button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-100 border border-red-300 rounded-lg">
          <AlertCircle className="size-4 text-red-600 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-800">Search Error</p>
            <p className="text-red-700">{validationError}</p>
          </div>
        </div>
      )}

      {chatError && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-white border border-[#002B51]/30 rounded-lg">
          <AlertCircle className="size-4 text-[#002B51] shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-[#002B51]">AI Chat Error</p>
            <p className="text-black">{chatError}</p>
          </div>
        </div>
      )}

      {chatAnswer && (
        <div className="mt-4 bg-white border border-black/15 rounded-lg p-4 text-black">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="size-4 text-[#002B51]" />
            <span className="text-xs uppercase tracking-wider text-black font-medium">
              AI Response {chatMode ? `(${chatMode})` : ""}
            </span>
            <button
              type="button"
              onClick={() => setChatResultsCollapsed((prev) => !prev)}
              className="ml-auto flex items-center gap-1 text-xs text-black/50 hover:text-[#002B51] transition-colors"
              title={chatResultsCollapsed ? "Expand AI response" : "Collapse AI response"}
            >
              <span>{chatResultsCollapsed ? "Show" : "Hide"}</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  chatResultsCollapsed ? "" : "rotate-180"
                }`}
              />
            </button>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${
            chatResultsCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-screen opacity-100"
          }`}>
          <div className="text-sm text-black">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              h1: ({ children }) => <h1 className="font-semibold text-base mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="font-semibold text-sm mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="font-medium text-sm mb-1">{children}</h3>,
            }}
          >
            {chatAnswer}
          </ReactMarkdown>
          </div>
          {chatMode && (chatMode === "table" || chatMode === "both") && (
            <p className="mt-2 text-xs text-black">
              Table results have been applied to the main results table below.
            </p>
          )}

          {chatThread && chatThread.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/15 space-y-2 max-h-52 overflow-y-auto pr-1">
              {chatThread.slice(-6).map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`rounded-md px-3 py-2 text-xs ${
                    msg.role === "user" ? "bg-[#002B51]/10" : "bg-black/5"
                  }`}
                >
                  <span className="uppercase tracking-wider text-[10px] text-black mr-2">
                    {msg.role}
                  </span>
                  <span className="text-black">{msg.content}</span>
                </div>
              ))}
            </div>
          )}

          {chatEvidence && chartData.length > 0 && (
            <div className="mt-4 pt-3 border-t border-black/15">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-black font-medium">
                  {chatEvidence.chart.title}
                </p>
                {effectiveChartType !== 'line' && (
                  <button
                    type="button"
                    className="text-xs text-black/50 hover:text-[#002B51] underline underline-offset-2"
                    onClick={() => setChartTypeOverride(effectiveChartType === 'pie' ? 'bar' : 'pie')}
                  >
                    {effectiveChartType === 'pie' ? 'Switch to Bar' : 'Switch to Pie'}
                  </button>
                )}
              </div>
              <ChartContainer
                className={effectiveChartType === 'pie' ? 'h-64 w-full' : 'h-52 w-full'}
                config={Object.fromEntries(
                  chatEvidence.chart.series.map((s, i) => [
                    s.name,
                    { label: s.name, color: CHART_COLORS[i % CHART_COLORS.length] },
                  ])
                )}
              >
                {effectiveChartType === 'line' ? (
                  <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      tickFormatter={(value) => String(value).slice(0, 10)}
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    {chatEvidence.chart.series.map((s, i) => (
                      <Area
                        key={s.name}
                        type="monotone"
                        dataKey={s.name}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fill={`${CHART_COLORS[i % CHART_COLORS.length]}22`}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                ) : effectiveChartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chatEvidence.chart.labels.map((label, i) => ({
                        name: label,
                        value: chatEvidence.chart.series[0]?.data[i] ?? 0,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${String(name).slice(0, 12)}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {chatEvidence.chart.labels.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                ) : (
                  <BarChart accessibilityLayer data={chartData.slice(0, 10)} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      tickFormatter={(value) => String(value).slice(0, 12)}
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    {chatEvidence.chart.series.map((s, i) => (
                      <Bar
                        key={s.name}
                        dataKey={s.name}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        radius={4}
                      />
                    ))}
                  </BarChart>
                )}
              </ChartContainer>

              {chatEvidence.rows.length > 0 && (
                <div className="mt-3 text-xs text-black">
                  Showing top {Math.min(5, chatEvidence.rows.length)} of {chatEvidence.metadata.row_count} evidence rows.
                </div>
              )}

              {evidenceRows.length > 0 && (
                <div className="mt-3 bg-white rounded-lg border border-black/15 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
                    <p className="text-xs uppercase tracking-wider text-black">Evidence Grid</p>
                    <button
                      type="button"
                      className="text-xs text-black hover:text-[#002B51] underline underline-offset-2"
                      onClick={() =>
                        setEvidenceSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
                      }
                    >
                      Sort: {evidenceSortDirection === "desc" ? "high → low" : "low → high"}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-black">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Dimension</th>
                          <th className="text-left px-3 py-2 font-medium">Priority</th>
                          <th className="text-right px-3 py-2 font-medium">Exceptions</th>
                          <th className="text-right px-3 py-2 font-medium">Trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceRows.slice(0, 10).map((row, idx) => (
                          <tr key={`${row.label}-${row.priority}-${idx}`} className="border-t border-black/10">
                            <td className="px-3 py-2 text-black truncate max-w-55">{row.label}</td>
                            <td className="px-3 py-2 text-black">{row.priority}</td>
                            <td className="px-3 py-2 text-right text-black">{row.exception_count}</td>
                            <td className="px-3 py-2 text-right text-black">{row.affected_trades}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {followUpPrompts && followUpPrompts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-black/15">
              <p className="text-xs uppercase tracking-wider text-black font-medium mb-2">
                Follow-up prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {followUpPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-[#002B51]/10 border border-black/20 text-xs text-black transition-colors"
                    onClick={() => onFollowUpPromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>{/* end collapsible wrapper */}
        </div>
      )}

      {/* Recent and Saved chips strip */}
      {(recentSearches.length > 0 || savedQueries.length > 0) && (
        <div className="flex flex-col gap-3 mt-5">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-xs uppercase tracking-wider font-medium">Recent:</span>
              {recentSearches.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1 bg-white/8 border border-white/14 rounded-full text-xs text-white hover:bg-white/14 transition-colors max-w-50"
                >
                  <button
                    onClick={() => handleSearchClick(s.query)}
                    className="truncate"
                  >
                    {s.query}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSearch(s.id);
                    }}
                    className="shrink-0 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    title="Remove"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={onClearAllSearches}
                className="ml-auto text-white/50 hover:text-white text-xs uppercase tracking-wider font-medium flex items-center gap-1 transition-colors"
                title="Clear all recent searches"
              >
                <Eraser className="size-3" />
                Clear All
              </button>
            </div>
          )}

          {/* Saved Queries */}
          {savedQueries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                <Star className="size-3 fill-white" />
                Saved:
              </span>
              {savedQueries.slice(0, 4).map((q) => (
                <div
                  key={q.query_id}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1 bg-white/8 border border-white/14 rounded-full text-xs text-white hover:bg-white/14 transition-colors max-w-50"
                >
                  <button
                    onClick={() => handleSavedQueryClick(q.query_text)}
                    className="truncate"
                    title={q.query_name || q.query_text}
                  >
                    {q.query_name || q.query_text}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedQuery(q.query_id);
                    }}
                    className="shrink-0 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    title="Remove saved query"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}