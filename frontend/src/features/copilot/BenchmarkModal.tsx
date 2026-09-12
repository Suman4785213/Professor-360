import React, { useState } from 'react';
import { copilotApi, BenchmarkReport } from '../../api/copilot';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runBenchmarkSuite = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await copilotApi.getBenchmarks();
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to run benchmarks. Insufficient permissions.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Copilot Evaluation & Benchmark Suite
              </h3>
              <p className="text-xs text-slate-500">
                Verifies factual grounding, zero-hallucination, and governance guardrails.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!report && !isRunning && (
            <div className="text-center py-8 px-4">
              <ShieldCheck className="w-12 h-12 text-brand-500 mx-auto mb-3 opacity-80" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Run Automated QA Benchmark
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
                Executes standard accreditation test queries spanning faculty counts, verified evidence searches, gap analyses, and adversarial prompt injections.
              </p>
              <button
                type="button"
                onClick={runBenchmarkSuite}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 rounded-xl shadow-xs transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                Start Evaluation Suite
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Running Automated Benchmark Test Cases...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Testing tenant boundaries, source attribution, and governance interceptors.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Score
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {report.accuracy_percentage}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Passed
                  </span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {report.passed_cases} / {report.total_benchmark_cases}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Hallucinations
                  </span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {report.hallucination_incidents}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Violations
                  </span>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {report.governance_violations}
                  </span>
                </div>
              </div>

              {/* Detailed Test Results */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Test Case Results
                </h5>
                <div className="space-y-1.5">
                  {report.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {r.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {r.question}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>Intent: <code className="font-mono text-brand-600">{r.actual_intent}</code></span>
                            <span>•</span>
                            <span>Sources: {r.sources_count}</span>
                            <span>•</span>
                            <span>{r.latency_ms}ms</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          r.passed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Evaluation is college-isolated
          </span>
          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                disabled={isRunning}
                onClick={runBenchmarkSuite}
                className="px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition-colors"
              >
                Re-run Suite
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-300 dark:border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
