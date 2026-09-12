import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { SSRDashboardData } from '../../types';
import {
  Award,
  ScrollText,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const SSRWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isIQAC = ['SUPER_ADMIN', 'IQAC'].includes(user?.role || '');

  const [ssrData, setSsrData] = useState<SSRDashboardData | null>(null);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSSRData();
  }, []);

  const loadSSRData = async () => {
    setLoading(true);
    try {
      const [dashRes, histRes] = await Promise.all([
        apiClient.get('/ssr/dashboard/'),
        apiClient.get('/ssr/review-history/'),
      ]);
      setSsrData(dashRes.data);
      setReviewHistory(histRes.data || []);
    } catch (err) {
      console.error('Failed to load SSR workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !ssrData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading SSR Preparation Workspace...
          </p>
        </div>
      </div>
    );
  }

  const p = ssrData?.progress;
  const nr = ssrData?.narrative_readiness;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Institutional Accreditation Cycle
            </span>
            <span className="text-xs text-slate-400">• {ssrData?.cycle}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Self Study Report (SSR) Preparation Workspace
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Structured workspace for multi-year accreditation readiness, comprehensive criteria aggregation,
            qualitative narrative reviews, and verifiable evidence dossiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/iqac/reports')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <FileText className="w-4 h-4" />
            Generate SSR Report
          </button>
        </div>
      </div>

      {/* Readiness Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Criteria Evidence Completeness */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Evidence Completeness</span>
          <div className="text-2xl font-black text-white mt-2">
            {p?.overall_completeness_percentage || 0}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {p?.completed_metrics_count || 0} / {p?.total_metrics || 0} Metrics Supported
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${p?.overall_completeness_percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Card 2: Narrative Readiness */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Narrative Approval Rate</span>
          <div className="text-2xl font-black text-indigo-400 mt-2">
            {nr?.readiness_percentage || 0}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {nr?.approved_narratives || 0} / {nr?.total_metrics || 0} Approved Responses
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${nr?.readiness_percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Card 3: Narratives in Review */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Under Review / Drafts</span>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {(nr?.under_review || 0) + (nr?.draft_narratives || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {nr?.under_review || 0} Pending IQAC Review • {nr?.draft_narratives || 0} Drafts
          </p>
        </div>

        {/* Card 4: Total Verified Evidence */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Mapped Evidence</span>
          <div className="text-2xl font-black text-white mt-2">
            {p?.total_evidence_mapped || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cryptographic proof documents across all 7 criteria pillars.
          </p>
        </div>
      </div>

      {/* Criteria Progression Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Seven Assessment Criteria Readiness Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {p?.criteria_progress.map((crit) => (
            <div
              key={crit.id}
              onClick={() => navigate(`/iqac/criteria/${crit.id}`)}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                    Criterion {crit.number}
                  </span>
                  <span className="text-xs font-bold text-white">{crit.progress_percentage}%</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {crit.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{crit.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${crit.progress_percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{crit.total_metrics} Indicators</span>
                  <span className="font-bold text-emerald-400">{crit.evidence_count} Verified Proofs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Narrative Revision History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              SSR Narrative Revision & Review Audit Log
            </h3>
            <p className="text-xs text-slate-400">Complete historical snapshot of changes to official qualitative SSR narratives.</p>
          </div>
        </div>

        {reviewHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <ScrollText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No historical revisions logged yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reviewHistory.map((h) => (
              <div key={h.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-400">Metric {h.metric_number}</span>
                    <span className="text-xs text-slate-300 font-semibold">{h.metric_title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">v{h.version_number}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Edited by {h.edited_by} • {h.change_reason || 'Status update'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-300 block">{new Date(h.created_at).toLocaleDateString()}</span>
                  <span className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
