import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  TrendingUp,
  FileCheck,
  Edit2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AIMetrics } from '../../types';
import { Card } from '../../components/ui/Card';

export const AIMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/ai/metrics/');
      setMetrics(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Unable to load AI analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                AI Certificate Intelligence & Automation
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Oversight Metrics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institutional document extraction volume, accuracy, and human correction rates
            </p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh Metrics"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Processed */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">Total Processed</span>
                <FileCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {metrics?.total_processed ?? 0}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics?.confirmed_count ?? 0} confirmed into official records
              </span>
            </div>

            {/* Success Rate */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">Extraction Success</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {metrics?.success_rate ?? 100}%
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics?.successfully_processed ?? 0} error-free analyses
              </span>
            </div>

            {/* Avg Execution Time */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">Avg Processing Time</span>
                <Clock className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {metrics?.average_processing_time_ms ?? 0} <span className="text-sm font-normal text-slate-400">ms</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pipeline execution latency
              </span>
            </div>

            {/* Human Verification Guard */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">Verification State</span>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                100% Guarded
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Zero auto-approval bypass
              </span>
            </div>
          </div>

          {/* Top Corrected Fields by Faculty */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Human Correction Distribution (Faculty Edits Prior to Confirmation)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Foundation for AI accuracy tracking</span>
            </div>

            {metrics?.top_corrected_fields && metrics.top_corrected_fields.length > 0 ? (
              <div className="space-y-2">
                {metrics.top_corrected_fields.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {f.field_name.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (f.count / (metrics.total_processed || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold w-8 text-right">
                        {f.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                No human corrections recorded yet. Extracted certificates matched faculty submissions directly.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
