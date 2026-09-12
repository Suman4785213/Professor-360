import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { CriterionProgressDetail, AcademicYear } from '../../types';
import {
  Layers,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  ChevronRight,
  Award,
  Loader2,
  TrendingUp,
} from 'lucide-react';

export const CriterionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<CriterionProgressDetail | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCriterionProgress();
    }
  }, [id, selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const res = await apiClient.get('/academic-years/');
      setAcademicYears(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCriterionProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (selectedYear) {
        params.academic_year = selectedYear;
      }
      const res = await apiClient.get(`/criteria/${id}/progress/`, { params });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load criterion progress:', err);
      setError('Failed to load criterion detail.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, count: number, benchmark: number) => {
    if (count === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" />
          No Evidence
        </span>
      );
    }
    if (count < benchmark) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <TrendingUp className="w-3 h-3" />
          Partial ({count}/{benchmark})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Available ({count}/{benchmark})
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-xs font-semibold">Loading criterion metrics & quality indicators...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">{error || 'Criterion not found'}</h3>
        <button
          onClick={() => navigate('/iqac/criteria/dashboard')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
        >
          Back to Criteria Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/iqac/criteria/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Criteria Dashboard</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="">All Academic Cycles</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Criterion Header Card */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
              C{data.criterion_number}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                  Accreditation Criterion {data.criterion_number}
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{data.criterion_title}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
                <span>
                  <strong>{data.metrics_with_evidence}</strong> of {data.total_metrics} metrics with verified evidence
                </span>
                <span>•</span>
                <span>
                  <strong>{data.total_evidence_count}</strong> total mapped documents
                </span>
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 shrink-0">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Availability</span>
              <span className="text-3xl font-black text-brand-600">{data.overall_availability_percentage}%</span>
            </div>
            <div className="w-32 h-2.5 rounded-full bg-slate-100 overflow-hidden mt-2">
              <div
                className="h-full bg-brand-600 rounded-full"
                style={{ width: `${Math.min(data.overall_availability_percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            Key Quality Metrics ({data.metrics.length})
          </h2>
          <span className="text-xs text-slate-400 font-medium">Click a metric to view and manage mapped evidence</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {data.metrics.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/iqac/metrics/${m.id}`)}
              className="group p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Metric Info */}
              <div className="flex items-start gap-4 md:w-5/12">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition">
                  {m.number}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-brand-700 font-mono">Metric {m.number}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] font-semibold text-slate-500">Weightage: {m.weightage} marks</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 group-hover:text-brand-600 transition line-clamp-1">
                    {m.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{m.description}</p>
                </div>
              </div>

              {/* Requirements & Evidence Target */}
              <div className="flex-1 max-w-xs md:max-w-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Mapped Proofs vs Target Benchmark:</span>
                  <span className="font-bold text-slate-800">
                    {m.evidence_count} / {m.benchmark_count || 5}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.progress_percentage >= 100
                        ? 'bg-emerald-500'
                        : m.progress_percentage > 0
                        ? 'bg-brand-600'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.min(m.progress_percentage, 100)}%` }}
                  />
                </div>
                {m.requirements && m.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.requirements.map((r) => (
                      <span
                        key={r.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200"
                      >
                        {r.name} ({r.required_count} needed)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status & Action */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                {getStatusBadge(m.status, m.evidence_count, m.benchmark_count || 5)}
                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 flex items-center justify-center transition">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
