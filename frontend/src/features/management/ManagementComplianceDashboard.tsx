import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AQARDashboardData, DepartmentComplianceStats } from '../../types';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  FileSpreadsheet,
  Clock,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Eye,
} from 'lucide-react';

export const ManagementComplianceDashboard: React.FC = () => {
  const [data, setData] = useState<AQARDashboardData | null>(null);
  const [deptStats, setDeptStats] = useState<DepartmentComplianceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, deptRes] = await Promise.all([
        apiClient.get('/aqar/dashboard/'),
        apiClient.get('/aqar/department-contributions/'),
      ]);
      setData(dashRes.data);
      setDeptStats(deptRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading Institutional Compliance Oversight...
          </p>
        </div>
      </div>
    );
  }

  const p = data?.progress;
  const overallPct = p?.overall_completeness_percentage || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Executive Leadership Oversight
          </span>
          <span className="text-xs text-slate-400">• Read-Only Monitoring View</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          AQAR & Accreditation Readiness Dashboard
        </h1>
        <p className="text-xs text-slate-400 max-w-3xl">
          High-level institutional monitoring for college leadership. Tracks multi-criteria benchmarking,
          department contributions, and documentation progress without altering verification records.
        </p>
      </div>

      {/* Oversight KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Preparation Completeness</span>
          <div className="text-2xl font-black text-white mt-2">{overallPct}%</div>
          <p className="text-xs text-slate-400 mt-1">
            {p?.completed_metrics_count || 0} Complete • {p?.partial_metrics_count || 0} Partial • {p?.missing_metrics_count || 0} Missing
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Mapped Evidence</span>
          <div className="text-2xl font-black text-white mt-2">{p?.total_evidence_mapped || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Verified institutional proof documents.</p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Readiness Tasks Done</span>
          <div className="text-2xl font-black text-brand-400 mt-2">
            {data?.checklist_summary.completion_percentage || 0}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {data?.checklist_summary.completed_tasks || 0} of {data?.checklist_summary.total_tasks || 0} standard tasks
          </p>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Data Requests</span>
          <div className="text-2xl font-black text-amber-400 mt-2">{data?.open_data_requests_count || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Active departmental evidence requests.</p>
        </div>
      </div>

      {/* Department Contributions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Academic Department Progress Breakdown
          </h3>
        </div>
        <div className="divide-y divide-slate-800">
          {deptStats.map((dept) => (
            <div key={dept.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {dept.code}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{dept.name}</h4>
                  <p className="text-xs text-slate-400">
                    Supports {dept.metrics_supported_count} indicators ({dept.coverage_percentage}% institutional coverage)
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-black text-white">{dept.evidence_count}</span>
                <span className="text-xs text-slate-400 block">Verified Evidence Records</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Criteria Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {p?.criteria_progress.map((crit) => (
          <div key={crit.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-400">Criterion {crit.number}</span>
              <span className="text-xs font-bold text-white">{crit.progress_percentage}%</span>
            </div>
            <h4 className="text-sm font-bold text-white line-clamp-1">{crit.title}</h4>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${crit.progress_percentage}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{crit.completed} Complete • {crit.missing} Missing</span>
              <span className="font-bold text-white">{crit.evidence_count} Proofs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
