import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  ExecutiveAnalyticsResponse,
  AcademicYearComparisonItem,
  AcademicYear,
  DepartmentBenchmarkItem,
} from '../../types';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { KPICard } from './KPICard';
import { AIInsightsCard } from './AIInsightsCard';
import {
  Users,
  Building2,
  FileCheck,
  Award,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Layers,
  ArrowUpRight,
  Eye,
  Loader2,
  Calendar,
} from 'lucide-react';

export const ExecutiveAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<ExecutiveAnalyticsResponse | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [yearComparisons, setYearComparisons] = useState<AcademicYearComparisonItem[]>([]);
  const [departmentBenchmarks, setDepartmentBenchmarks] = useState<DepartmentBenchmarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedYearId]);

  const loadAcademicYears = async () => {
    try {
      const res = await apiClient.get('/academic-years/');
      const years: AcademicYear[] = res.data.results || res.data || [];
      setAcademicYears(years);
      const cur = years.find((y) => y.is_current);
      if (cur) setSelectedYearId(cur.id);
    } catch (e) {
      console.error('Error loading academic years', e);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academic_year: selectedYearId } : {};
      const [execRes, compRes, deptRes] = await Promise.all([
        apiClient.get('/analytics/executive/', { params }),
        apiClient.get('/analytics/academic-year-comparison/'),
        apiClient.get('/analytics/department-comparison/', { params }),
      ]);

      setData(execRes.data);
      setYearComparisons(compRes.data || []);
      setDepartmentBenchmarks(deptRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading executive analytics', e);
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
            Loading Executive Intelligence Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const risk = data?.preparation_risk;
  const growth = data?.growth_trend_preview;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Governance Invariant Alert */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Executive Analytics & Institutional Intelligence
            </h1>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Monitoring Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Read-only strategic decision support layer • Verified data to actionable insights
          </p>
        </div>

        {/* Read-only Governance Pill */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-slate-200 font-semibold">Governance Invariant: </span>
            <span className="text-slate-400">Executive oversight does not alter verification status</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        onSelectYear={setSelectedYearId}
        loading={loading}
        onRefresh={loadDashboard}
        lastUpdated={lastUpdated}
      />

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Verified Institutional Evidence"
            value={kpis.verified_evidence}
            subtitle={`${kpis.pending_evidence} pending verification`}
            icon={FileCheck}
            colorScheme="emerald"
            trend={
              growth
                ? {
                    value: `${growth.growth_rate_pct > 0 ? '+' : ''}${growth.growth_rate_pct.toFixed(1)}% YoY`,
                    isPositive: growth.growth_rate_pct >= 0,
                  }
                : undefined
            }
          />
          <KPICard
            title="AQAR / SSR Preparedness"
            value={`${kpis.aqar_completeness_pct.toFixed(1)}%`}
            subtitle={`SSR Readiness: ${kpis.ssr_completeness_pct.toFixed(1)}%`}
            icon={Award}
            colorScheme="blue"
            badge="Accreditation Track"
          />
          <KPICard
            title="Data Quality & Hygiene"
            value={`${kpis.data_quality_score.toFixed(1)}%`}
            subtitle="Repository integrity score"
            icon={ShieldCheck}
            colorScheme={kpis.data_quality_score >= 90 ? 'indigo' : 'amber'}
            badge={kpis.data_quality_score >= 90 ? 'Healthy' : 'Attention'}
          />
          <KPICard
            title="Preparation Risk Rating"
            value={kpis.preparation_risk_level}
            subtitle={`${kpis.pipeline_bottleneck_count} pipeline bottlenecks`}
            icon={AlertTriangle}
            colorScheme={
              kpis.preparation_risk_level === 'LOW'
                ? 'emerald'
                : kpis.preparation_risk_level === 'MEDIUM'
                ? 'amber'
                : 'rose'
            }
            badge="Executive Risk"
          />
        </div>
      )}

      {/* Strategic Risk & Evidence Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institutional Risk Card */}
        {risk && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    risk.risk_level === 'LOW'
                      ? 'text-emerald-400'
                      : risk.risk_level === 'MEDIUM'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                />
                <h3 className="text-sm font-bold text-white">Accreditation Preparation Risk</h3>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  risk.risk_level === 'LOW'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : risk.risk_level === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {risk.risk_level} RISK
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contributing Risk Factors</p>
              {risk.factors.length === 0 ? (
                <p className="text-xs text-slate-500">No active preparation vulnerabilities identified.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-300">
                  {risk.factors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Executive Recommendation</p>
              <p className="text-xs text-slate-200 mt-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 leading-relaxed">
                {risk.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Evidence Status Breakdown */}
        {data?.evidence_distribution && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Evidence Pipeline Distribution</h3>
              </div>
              <span className="text-xs text-slate-400">Total Artifacts</span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-400">Verified & Sealed Evidence</span>
                  <span className="text-white font-bold">{data.evidence_distribution.verified}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (data.evidence_distribution.verified /
                          Math.max(
                            1,
                            data.evidence_distribution.verified +
                              data.evidence_distribution.pending +
                              data.evidence_distribution.unmapped
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-400">Pending Verification Queues</span>
                  <span className="text-white font-bold">{data.evidence_distribution.pending}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (data.evidence_distribution.pending /
                          Math.max(
                            1,
                            data.evidence_distribution.verified +
                              data.evidence_distribution.pending +
                              data.evidence_distribution.unmapped
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-400">Unmapped Evidence Records</span>
                  <span className="text-white font-bold">{data.evidence_distribution.unmapped}</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (data.evidence_distribution.unmapped /
                          Math.max(
                            1,
                            data.evidence_distribution.verified +
                              data.evidence_distribution.pending +
                              data.evidence_distribution.unmapped
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Contributing Departments */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Department Output Leaderboard</h3>
            </div>
            <span className="text-xs text-slate-400">Verified Evidence</span>
          </div>

          <div className="space-y-3">
            {departmentBenchmarks.slice(0, 4).map((dept, idx) => (
              <div
                key={dept.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-brand-400 w-4">#{idx + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{dept.name}</p>
                    <p className="text-[11px] text-slate-500">{dept.faculty_count} Faculty Members</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-white">{dept.verified_evidence}</span>
                  <span className="text-[10px] text-slate-400 block">evidence items</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Year Trend Analysis Matrix */}
      {yearComparisons.length > 0 && (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Academic Year Trend Comparison</h3>
                <p className="text-xs text-slate-400">Historical performance across accreditation cycles</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="pb-3 pr-4">Academic Year</th>
                  <th className="pb-3 pr-4 text-center">Activities Logged</th>
                  <th className="pb-3 pr-4 text-center">Verified Evidence</th>
                  <th className="pb-3 pr-4 text-center">AQAR Completeness</th>
                  <th className="pb-3 pr-4 text-center">SSR Readiness</th>
                  <th className="pb-3 text-right">YoY Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {yearComparisons.map((item) => (
                  <tr key={item.year_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4 font-bold text-white flex items-center gap-2">
                      <span>{item.year_name}</span>
                      {item.is_current && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-center font-medium">{item.activities_count}</td>
                    <td className="py-3 pr-4 text-center font-bold text-emerald-400">
                      {item.verified_evidence_count}
                    </td>
                    <td className="py-3 pr-4 text-center">{item.aqar_completeness_pct.toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-center">{item.ssr_completeness_pct.toFixed(1)}%</td>
                    <td className="py-3 text-right">
                      {item.growth_rate_pct !== null ? (
                        <span
                          className={`font-semibold ${
                            item.growth_rate_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.growth_rate_pct > 0 ? '+' : ''}
                          {item.growth_rate_pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grounded AI Insights (Monitoring Only: canRefresh=false for Management) */}
      <AIInsightsCard
        insights={data?.active_ai_insights || []}
        canRefresh={false}
      />
    </div>
  );
};
