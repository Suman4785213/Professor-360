import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  VerificationPipelineData,
  GapMatrixData,
  DataQualityReport,
  EvidenceHealthData,
  ForecastData,
  AIInsight,
  AcademicYear,
} from '../../types';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { BottleneckAlertCard } from './BottleneckAlertCard';
import { EvidenceGapMatrix } from './EvidenceGapMatrix';
import { DataQualityCard } from './DataQualityCard';
import { AIInsightsCard } from './AIInsightsCard';
import {
  Cpu,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  Database,
  Layers,
  Sparkles,
  Loader2,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const IQACIntelligenceDashboard: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<VerificationPipelineData | null>(null);
  const [gapData, setGapData] = useState<GapMatrixData | null>(null);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [evidenceHealth, setEvidenceHealth] = useState<EvidenceHealthData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingAI, setIsRefreshingAI] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadAllIntelligence();
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

  const loadAllIntelligence = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academic_year: selectedYearId } : {};
      const [pipeRes, gapRes, qualRes, healthRes, foreRes, insRes] = await Promise.all([
        apiClient.get('/analytics/verification-pipeline/', { params }),
        apiClient.get('/analytics/gap-matrix/', { params }),
        apiClient.get('/analytics/data-quality/', { params }),
        apiClient.get('/analytics/evidence-health/', { params }),
        apiClient.get('/analytics/forecast/', { params }),
        apiClient.get('/analytics/ai-insights/', { params }),
      ]);

      setPipelineData(pipeRes.data);
      setGapData(gapRes.data);
      setQualityReport(qualRes.data);
      setEvidenceHealth(healthRes.data);
      setForecast(foreRes.data);
      setInsights(insRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading IQAC intelligence', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAI = async () => {
    setIsRefreshingAI(true);
    try {
      const res = await apiClient.post('/analytics/ai-insights/refresh/', {
        academic_year: selectedYearId || undefined,
      });
      setInsights(res.data || []);
    } catch (e) {
      console.error('Error regenerating AI insights', e);
    } finally {
      setIsRefreshingAI(false);
    }
  };

  if (loading && !pipelineData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading IQAC Operations Intelligence Hub...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Cpu className="w-7 h-7 text-brand-400" />
            <span>IQAC Operations & Accreditation Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verification workflow telemetry, evidence gap matrix, repository health, and predictive forecasting
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        onSelectYear={setSelectedYearId}
        loading={loading}
        onRefresh={loadAllIntelligence}
        lastUpdated={lastUpdated}
      />

      {/* Evidence Health Badges Ribbon */}
      {evidenceHealth && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Documents</span>
            <span className="text-lg font-bold text-white">{evidenceHealth.total_documents}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Verified Evidence</span>
            <span className="text-lg font-bold text-emerald-400">{evidenceHealth.verified_documents}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Unmapped Evidence</span>
            <span className={`text-lg font-bold ${evidenceHealth.unmapped_evidence_count > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {evidenceHealth.unmapped_evidence_count}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Metadata Completeness</span>
            <span className="text-lg font-bold text-brand-400">{evidenceHealth.metadata_completeness_pct.toFixed(0)}%</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Duplicate Risk</span>
            <span className={`text-sm font-bold uppercase ${
              evidenceHealth.health_indicators.duplicate_risk === 'LOW' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {evidenceHealth.health_indicators.duplicate_risk}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Repository Health</span>
            <span className="text-sm font-bold text-brand-400 uppercase">{evidenceHealth.health_indicators.mapping_health}</span>
          </div>
        </div>
      )}

      {/* Verification Pipeline & Bottlenecks */}
      <BottleneckAlertCard pipelineData={pipelineData} loading={loading} />

      {/* Evidence Gap Matrix */}
      <EvidenceGapMatrix gapData={gapData} loading={loading} />

      {/* Data Quality Hygiene Scanner */}
      <DataQualityCard qualityReport={qualityReport} loading={loading} />

      {/* Predictive Forecasting Velocity Card */}
      {forecast && (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Evidence Acquisition Velocity & Target Forecast</h3>
                <p className="text-xs text-slate-400">Statistical linear velocity projection towards target cycle completion</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
              Confidence: {forecast.forecast_confidence}
            </span>
          </div>

          {!forecast.has_sufficient_data ? (
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
              <Info className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-white">Data Sufficiency Notice</p>
                <p className="text-slate-400 mt-0.5 leading-relaxed">{forecast.disclaimer}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Milestone Date</span>
                  <span className="text-sm font-bold text-white">{forecast.target_date}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Evidence Goal</span>
                  <span className="text-sm font-bold text-brand-400">{forecast.target_evidence} items</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Projected Total at Current Velocity</span>
                  <span className="text-sm font-bold text-emerald-400">{forecast.projected_evidence_at_target} items</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-mono italic">
                * Note: Projections are purely advisory velocity benchmarks and subject to submission pacing.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grounded AI Executive Insights with Regenerate Action */}
      <AIInsightsCard
        insights={insights}
        onRefreshInsights={handleRefreshAI}
        isRefreshing={isRefreshingAI}
        canRefresh={true}
      />
    </div>
  );
};
