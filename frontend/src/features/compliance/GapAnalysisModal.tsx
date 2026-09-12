import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { GapAnalysisItem } from '../../types';
import { X, Search, Filter, AlertTriangle, CheckCircle2, AlertCircle, Send, Loader2, ArrowRight } from 'lucide-react';

interface GapAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId?: string;
  onOpenDataRequest?: (metricId: string, metricNumber: string) => void;
}

export const GapAnalysisModal: React.FC<GapAnalysisModalProps> = ({
  isOpen,
  onClose,
  academicYearId = '',
  onOpenDataRequest,
}) => {
  const [gaps, setGaps] = useState<GapAnalysisItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PARTIAL' | 'MISSING' | 'COMPLETE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadGapAnalysis();
    }
  }, [isOpen, academicYearId]);

  const loadGapAnalysis = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/aqar/gap-analysis/', {
        params: academicYearId ? { academic_year: academicYearId } : {},
      });
      setGaps(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredGaps = gaps.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.metric_number.toLowerCase().includes(q) ||
        item.metric_title.toLowerCase().includes(q) ||
        item.criterion_title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const completeCount = gaps.filter((g) => g.status === 'COMPLETE').length;
  const partialCount = gaps.filter((g) => g.status === 'PARTIAL').length;
  const missingCount = gaps.filter((g) => g.status === 'MISSING').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Evidence Gap Analysis & Deficiency Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies benchmark shortfalls, missing document categories, and suggests target data collection requests.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar & Summary Chips */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All Metrics ({gaps.length})
              </button>
              <button
                onClick={() => setStatusFilter('MISSING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  statusFilter === 'MISSING'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'text-rose-400/80 hover:bg-rose-500/10'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Missing Evidence ({missingCount})
              </button>
              <button
                onClick={() => setStatusFilter('PARTIAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  statusFilter === 'PARTIAL'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-amber-400/80 hover:bg-amber-500/10'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial Availability ({partialCount})
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  statusFilter === 'COMPLETE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-emerald-400/80 hover:bg-emerald-500/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete ({completeCount})
              </button>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search metrics or criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Gap Items List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-500" />
              <p className="text-xs font-semibold">Analyzing accreditation evidence benchmarks...</p>
            </div>
          ) : filteredGaps.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No metrics matching current filter.</p>
            </div>
          ) : (
            filteredGaps.map((item) => {
              const isMissing = item.status === 'MISSING';
              const isPartial = item.status === 'PARTIAL';
              const isComplete = item.status === 'COMPLETE';

              return (
                <div
                  key={item.metric_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isMissing
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/50'
                      : isPartial
                      ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/50'
                      : 'bg-slate-800/40 border-slate-700/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-brand-400 px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                          Metric {item.metric_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Criterion {item.criterion_number}: {item.criterion_title}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isMissing
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isPartial
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{item.metric_title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-white">
                          {item.evidence_available_count} / {item.benchmark_count}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Verified Evidence</span>
                      </div>
                      {!isComplete && onOpenDataRequest && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenDataRequest(item.metric_id, item.metric_number);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-600/20"
                        >
                          <Send className="w-3 h-3" />
                          Request Data
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Requirements Shortfall */}
                  {item.missing_requirements.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.missing_requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-rose-400/90 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Missing: {req.name} ({req.missing_count} required)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contributing Departments & Suggested Action */}
                  <div className="mt-3 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Contributing:</span>
                      {item.contributing_departments.length > 0 ? (
                        <span className="text-slate-300 font-medium">{item.contributing_departments.join(', ')}</span>
                      ) : (
                        <span className="text-slate-500 italic">None yet</span>
                      )}
                    </div>
                    <div className="text-[11px] text-brand-300 italic flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-brand-400" />
                      <span>{item.suggested_action}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
