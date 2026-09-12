import React, { useState } from 'react';
import { Sparkles, Search, ArrowRight, Tag, Check, X, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { AISearchResponse, AISearchResultItem } from '../../types';

interface AISearchBarProps {
  onResultsFound?: (results: AISearchResultItem[], parsedFilters: any) => void;
  onClearSearch?: () => void;
  placeholder?: string;
}

const SAMPLE_PROMPTS = [
  'Show all FDP certificates in IT',
  'Find workshops attended in 2024-25',
  'Show verified certificates for Metric 2.4',
  'Publications by CSE faculty',
];

export const AISearchBar: React.FC<AISearchBarProps> = ({
  onResultsFound,
  onClearSearch,
  placeholder = 'Ask AI: e.g. "Show verified FDP certificates from 2024-25 in IT department"...',
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AISearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/ai/search/', { query: searchQuery.trim() });
      const data: AISearchResponse = res.data;
      setLastResponse(data);
      if (onResultsFound) {
        onResultsFound(data.results, data.parsed_filters);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Natural language search query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setLastResponse(null);
    setError(null);
    if (onClearSearch) {
      onClearSearch();
    }
  };

  const handleSelectSample = (sample: string) => {
    setQuery(sample);
    handleSearch(sample);
  };

  const hasActiveFilters =
    lastResponse &&
    (lastResponse.parsed_filters.category_code ||
      lastResponse.parsed_filters.department_code ||
      lastResponse.parsed_filters.academic_year_name ||
      lastResponse.parsed_filters.metric_code ||
      lastResponse.parsed_filters.keyword);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
      {/* Search Input Bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
            <Sparkles className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />

          {query && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => handleSearch()}
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all shrink-0"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </div>

      {/* Sample Query Chips */}
      {!lastResponse && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-medium text-slate-400">Try asking:</span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSample(prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Query Understanding / Parsed Filters Strip */}
      {hasActiveFilters && (
        <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              AI Detected Filters:
            </span>

            {lastResponse?.parsed_filters.category_code && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Category: {lastResponse.parsed_filters.category_code}
              </span>
            )}

            {lastResponse?.parsed_filters.department_code && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Dept: {lastResponse.parsed_filters.department_code}
              </span>
            )}

            {lastResponse?.parsed_filters.academic_year_name && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                AY: {lastResponse.parsed_filters.academic_year_name}
              </span>
            )}

            {lastResponse?.parsed_filters.metric_code && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                Metric: {lastResponse.parsed_filters.metric_code}
              </span>
            )}

            {lastResponse?.parsed_filters.keyword && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Keyword: "{lastResponse.parsed_filters.keyword}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300">
              {lastResponse?.total} verified records matched
            </span>
            <button
              onClick={handleClear}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
