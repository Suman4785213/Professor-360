import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { VerificationPipelineData } from '../../types';

interface BottleneckAlertCardProps {
  pipelineData: VerificationPipelineData | null;
  loading?: boolean;
}

export const BottleneckAlertCard: React.FC<BottleneckAlertCardProps> = ({
  pipelineData,
  loading,
}) => {
  if (loading || !pipelineData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 animate-pulse h-48" />
    );
  }

  const { pipeline_stages, bottlenecks, total_pending, rejection_rate_pct, return_rate_pct } = pipelineData;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Verification Pipeline & Bottleneck Intelligence</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time stage latency, SLA tracking, and queue congestion alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400">Total Pending: </span>
            <span className="font-bold text-white">{total_pending}</span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400">Return Rate: </span>
            <span className="font-bold text-amber-400">{return_rate_pct.toFixed(1)}%</span>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400">Rejection Rate: </span>
            <span className="font-bold text-rose-400">{rejection_rate_pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {pipeline_stages.map((stage, idx) => {
          const isDelayed = stage.avg_latency_days > stage.sla_days;
          return (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border relative transition-all ${
                isDelayed
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-slate-800/60 border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{stage.name}</span>
                {isDelayed ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Delayed
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    On Target
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-white">{stage.count}</span>
                  <span className="text-xs text-slate-400 ml-1">in queue</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-200">
                    {stage.avg_latency_days.toFixed(1)}d <span className="text-slate-500">avg</span>
                  </p>
                  <p className="text-[10px] text-slate-400">SLA: {stage.sla_days}d</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Bottlenecks Warning */}
      {bottlenecks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Detected Bottlenecks & Escalations</span>
          </p>
          <div className="space-y-2">
            {bottlenecks.map((b, idx) => (
              <div
                key={idx}
                className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-200">{b.stage}: </span>
                    <span className="text-slate-300">{b.message}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-white">{b.pending_count} pending</span>
                  <span className="text-slate-400 text-[11px] block">Avg {b.avg_days} days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>All verification stages currently operating within target turnaround SLAs.</span>
        </div>
      )}
    </div>
  );
};
