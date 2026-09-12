import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { CriteriaProgressStats, AcademicYear } from '../../types';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  Eye,
  Info,
  Loader2,
} from 'lucide-react';

export const CriteriaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<CriteriaProgressStats | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const isReadOnlyRole = ['COLLEGE_MANAGEMENT', 'HOD', 'DEPARTMENT_INCHARGE', 'FACULTY'].includes(user?.role || '');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchProgressStats();
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const res = await apiClient.get('/academic-years/');
      const years = res.data.results || res.data || [];
      setAcademicYears(years);
    } catch (e) {
      console.error('Failed to load academic years', e);
    }
  };

  const fetchProgressStats = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (selectedYear) {
        params.academic_year = selectedYear;
      }
      const res = await apiClient.get('/criteria/dashboard/', { params });
      setStats(res.data);
    } catch (err: any) {
      console.error('Failed to fetch criteria dashboard stats:', err);
      setError('Unable to load real-time criteria progress data.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, availabilityPct: number) => {
    switch (status) {
      case 'COMPLETE':
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {availabilityPct >= 100 ? 'Complete' : 'Available'}
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <TrendingUp className="w-3.5 h-3.5" />
            Partial Evidence
          </span>
        );
      case 'NO_EVIDENCE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            No Evidence
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 text-[11px] font-black uppercase tracking-wider">
              Phase 5 Accreditation Core
            </span>
            {isReadOnlyRole && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold flex items-center gap-1">
                <Eye className="w-3 h-3" /> Read-Only Monitoring View
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            IQAC Criteria & Evidence Progress Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time evidence mapping completeness across institutional accreditation criteria and quality indicators.
          </p>
        </div>

        {/* Academic Year Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="">All Academic Cycles</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current Cycle)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/iqac/criteria')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Criteria Explorer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Criteria */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Criteria</span>
            <Layers className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats?.total_criteria || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Configured quality pillars</p>
        </div>

        {/* Total Metrics */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key Metrics</span>
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats?.total_metrics || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Quality benchmark indicators</p>
        </div>

        {/* Metrics with Evidence */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Supported Metrics</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats?.metrics_with_evidence || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats && stats.total_metrics > 0
              ? `${Math.round((stats.metrics_with_evidence / stats.total_metrics) * 100)}% coverage`
              : 'Metrics with verified proof'}
          </p>
        </div>

        {/* Missing Evidence */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Metrics</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats?.metrics_without_evidence || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requiring evidence mapping</p>
        </div>

        {/* Overall Progress */}
        <div className="p-5 rounded-3xl bg-brand-600 text-white shadow-xs relative overflow-hidden col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-brand-100 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Evidence Availability</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-white/50" /> : `${stats?.overall_availability_percentage || 0}%`}
          </div>
          <p className="text-[11px] text-brand-100/80 mt-1">Total mapped records: {stats?.total_evidence_mapped || 0}</p>
        </div>
      </div>

      {/* Notice on Evidence Availability vs Accreditation Compliance */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong>Accreditation Integrity Note:</strong> The metrics above calculate{' '}
          <span className="font-semibold text-slate-700">institutional evidence availability & documentation completeness</span>{' '}
          against target benchmarks. They do not constitute official external accreditation scores or final SSR ratings.
        </p>
      </div>

      {/* Criteria Breakdown List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            Criteria Evidence Availability Breakdown
          </h2>
          <span className="text-xs text-slate-400 font-medium">Click any criterion to view metric details</span>
        </div>

        {loading ? (
          <div className="py-20 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <span>Aggregating criteria evidence progress...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {stats?.criteria?.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/iqac/criteria/${c.id}`)}
                className="group p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Criterion Info */}
                <div className="flex items-start gap-4 md:w-5/12">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200/60 font-black text-base flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition">
                    C{c.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Criterion {c.number}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">•</span>
                      <span className="text-[10px] font-semibold text-slate-500">Weightage: {c.weightage} marks</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-brand-600 transition line-clamp-1">
                      {c.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>
                        <strong className="text-slate-800">{c.metrics_with_evidence}</strong> of {c.metrics_count} metrics supported
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-800">{c.evidence_count}</strong> mapped verified proofs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Real Database Progress Bar */}
                <div className="flex-1 max-w-xs md:max-w-md space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Evidence Completeness</span>
                    <span className="text-brand-700 font-mono">{c.availability_percentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.availability_percentage >= 100
                          ? 'bg-emerald-500'
                          : c.availability_percentage >= 50
                          ? 'bg-brand-600'
                          : c.availability_percentage > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${Math.min(c.availability_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Right: Badge & Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  {getStatusBadge(c.status, c.availability_percentage)}
                  <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 flex items-center justify-center transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
