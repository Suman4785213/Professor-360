import React, { useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Info, ArrowUpRight, Database, X } from 'lucide-react';
import { AIInsight } from '../../types';

interface AIInsightsCardProps {
  insights: AIInsight[];
  onRefreshInsights?: () => void;
  isRefreshing?: boolean;
  canRefresh?: boolean; // false for Management (monitoring-only)
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  insights,
  onRefreshInsights,
  isRefreshing,
  canRefresh = true,
}) => {
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'GROWTH':
        return { label: 'Growth Trend', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: TrendingUp };
      case 'BOTTLENECK':
        return { label: 'Bottleneck Alert', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: AlertTriangle };
      case 'GAP':
        return { label: 'Evidence Gap', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: AlertTriangle };
      case 'RISK':
        return { label: 'Preparation Risk', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle };
      case 'QUALITY':
        return { label: 'Data Quality', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CheckCircle2 };
      default:
        return { label: 'Recommendation', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Info };
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'LOW':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Grounded AI Executive Insights</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase tracking-wider">
                Phase 9 Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Grounded exclusively in verified institutional data • Advisory only
            </p>
          </div>
        </div>

        {canRefresh && onRefreshInsights && (
          <button
            onClick={onRefreshInsights}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Generating Insights...' : 'Regenerate Insights'}</span>
          </button>
        )}
      </div>

      {/* Advisory Banner */}
      <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Human Decision-Support Invariant:</span> AI insights are strictly advisory recommendations synthesized from verified database aggregates. AI never modifies accreditation or verification status.
        </div>
      </div>

      {/* Insights List */}
      {insights.length === 0 ? (
        <div className="text-center py-8 text-slate-500 space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
          <p className="text-xs">No active executive insights for the selected parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const cat = getCategoryBadge(insight.category);
            const CatIcon = cat.icon;
            const sevColor = getSeverityColor(insight.severity);

            return (
              <div
                key={insight.id}
                className="bg-slate-800/60 border border-slate-700/70 hover:border-slate-600/80 rounded-xl p-4 space-y-3 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cat.color}`}>
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${sevColor}`}>
                      {insight.severity}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-100">{insight.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{insight.narrative}</p>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {insight.time_period}
                  </span>
                  <button
                    onClick={() => setSelectedInsight(insight)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <span>View Grounded Data</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grounded Source Metrics Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-400" />
                <h4 className="text-sm font-bold text-white">Grounded Traceability Data</h4>
              </div>
              <button
                onClick={() => setSelectedInsight(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Insight Title</p>
                <p className="text-sm font-medium text-slate-100 mt-0.5">{selectedInsight.title}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Action</p>
                <p className="text-xs text-slate-200 mt-0.5 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  {selectedInsight.recommended_action || 'Maintain active review cadence and monitor weekly metrics.'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Underlying Verified Metrics (Source of Truth)</p>
                <div className="mt-1 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-brand-300 max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(selectedInsight.source_metrics, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedInsight(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
