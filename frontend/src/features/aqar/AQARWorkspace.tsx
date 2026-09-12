import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  AQARDashboardData,
  AcademicYear,
  DataRequest,
  PreparationTask,
  DepartmentComplianceStats,
} from '../../types';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Award,
  Send,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  FileText,
  Clock,
  ChevronRight,
  Filter,
  CheckSquare,
} from 'lucide-react';
import { GapAnalysisModal } from '../compliance/GapAnalysisModal';
import { DataRequestModal } from '../compliance/DataRequestModal';

export const AQARWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isIQAC = ['SUPER_ADMIN', 'IQAC'].includes(user?.role || '');

  const [dashboardData, setDashboardData] = useState<AQARDashboardData | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'criteria' | 'needs_attention' | 'checklist' | 'departments' | 'requests'>('criteria');
  const [checklist, setChecklist] = useState<PreparationTask[]>([]);
  const [deptStats, setDeptStats] = useState<DepartmentComplianceStats[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [isDataRequestModalOpen, setIsDataRequestModalOpen] = useState(false);
  const [selectedMetricForRequest, setSelectedMetricForRequest] = useState<{ id: string; number: string } | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<DataRequest | null>(null);
  const [requestModalMode, setRequestModalMode] = useState<'create' | 'submit' | 'review'>('create');

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedYearId]);

  const fetchAcademicYears = async () => {
    try {
      const res = await apiClient.get('/academic-years/');
      const list = res.data.results || res.data || [];
      setAcademicYears(list);
      const active = list.find((y: AcademicYear) => y.is_active);
      if (active && !selectedYearId) {
        setSelectedYearId(active.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academic_year: selectedYearId } : {};
      const [dashRes, clRes, deptRes, reqRes] = await Promise.all([
        apiClient.get('/aqar/dashboard/', { params }),
        apiClient.get('/aqar/checklist/', { params: { ...params, workspace: 'AQAR' } }),
        apiClient.get('/aqar/department-contributions/', { params }),
        apiClient.get('/compliance/data-requests/', { params: { ...params, workspace: 'AQAR' } }),
      ]);
      setDashboardData(dashRes.data);
      setChecklist(clRes.data.results || clRes.data || []);
      setDeptStats(deptRes.data || []);
      setDataRequests(reqRes.data.results || reqRes.data || []);
    } catch (err) {
      console.error('Failed to load AQAR workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const res = await apiClient.post(`/aqar/checklist/${taskId}/toggle/`);
      setChecklist((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
      if (dashboardData) {
        loadDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDataRequest = (metricId: string, metricNumber: string) => {
    setSelectedMetricForRequest({ id: metricId, number: metricNumber });
    setRequestModalMode('create');
    setIsDataRequestModalOpen(true);
  };

  const handleReviewRequest = (req: DataRequest) => {
    setSelectedRequestForReview(req);
    setRequestModalMode('review');
    setIsDataRequestModalOpen(true);
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading AQAR Compliance Workspace...
          </p>
        </div>
      </div>
    );
  }

  const p = dashboardData?.progress;
  const overallPct = p?.overall_completeness_percentage || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest uppercase text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
              Institutional Quality Assurance
            </span>
            <span className="text-xs text-slate-400">• {dashboardData?.framework.name || 'Accreditation Framework'}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AQAR Preparation & Compliance Workspace
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Centralized institutional dashboard uniting verified faculty evidence, 7 NAAC criteria, metric benchmarks,
            gap deficiency tracking, and automated dossier exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id} className="bg-slate-900 text-white">
                  AY {y.name} {y.is_active ? '(Active Context)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsGapModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            Gap Analysis
          </button>

          {isIQAC && (
            <button
              onClick={() => handleOpenDataRequest('', 'General')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-lg shadow-brand-600/20"
            >
              <Send className="w-4 h-4" />
              New Data Request
            </button>
          )}

          <button
            onClick={() => navigate('/iqac/reports')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          >
            <FileText className="w-4 h-4 text-brand-400" />
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Preparation Completeness */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completeness</span>
            <span className="text-xs font-black text-brand-400">{overallPct}%</span>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {p?.completed_metrics_count || 0} <span className="text-xs font-semibold text-slate-400">/ {p?.total_metrics || 0} Complete</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                overallPct >= 75 ? 'bg-emerald-500' : overallPct >= 40 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-medium">
            Score: Complete (1.0), Partial (0.5), Missing (0.0)
          </span>
        </div>

        {/* Card 2: Verified Evidence Mapped */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mapped Evidence</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {p?.total_evidence_mapped || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Verified institutional documents linked to criteria.</p>
        </div>

        {/* Card 3: Metrics Needing Attention */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deficiencies</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {(p?.partial_metrics_count || 0) + (p?.missing_metrics_count || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {p?.missing_metrics_count || 0} Missing • {p?.partial_metrics_count || 0} Partial
          </p>
        </div>

        {/* Card 4: Preparation Checklist */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist</span>
            <CheckSquare className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {dashboardData?.checklist_summary.completed_tasks || 0} <span className="text-xs font-semibold text-slate-400">/ {dashboardData?.checklist_summary.total_tasks || 0} Tasks</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {dashboardData?.checklist_summary.completion_percentage || 0}% Institutional Readiness
          </p>
        </div>

        {/* Card 5: Open Data Requests */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Requests</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-2">
            {dashboardData?.open_data_requests_count || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Active requests assigned to departments.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('criteria')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'criteria'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Seven Assessment Criteria
        </button>
        <button
          onClick={() => setActiveTab('needs_attention')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'needs_attention'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-amber-400/90 hover:bg-amber-500/10'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Needs Attention ({p?.needs_attention.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'checklist'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Preparation Checklist ({checklist.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'departments'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Department Contributions
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Data Requests ({dataRequests.length})
        </button>
      </div>

      {/* Tab 1: Seven Assessment Criteria */}
      {activeTab === 'criteria' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {p?.criteria_progress.map((crit) => (
            <div
              key={crit.id}
              onClick={() => navigate(`/iqac/criteria/${crit.id}`)}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-brand-500/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-md border border-brand-500/20">
                    Criterion {crit.number}
                  </span>
                  <span className="text-xs font-bold text-white">{crit.progress_percentage}%</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                  {crit.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{crit.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
                    style={{ width: `${crit.progress_percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {crit.completed} Complete • {crit.partial} Partial • {crit.missing} Missing
                  </span>
                  <span className="font-bold text-emerald-400">{crit.evidence_count} Proofs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Needs Attention */}
      {activeTab === 'needs_attention' && (
        <div className="space-y-3">
          {p?.needs_attention.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-white">No Metrics Requiring Urgent Attention</p>
              <p className="text-xs text-slate-400 mt-1">All verified evidence benchmarks are fully satisfied.</p>
            </div>
          ) : (
            p?.needs_attention.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
                      Metric {item.number}
                    </span>
                    <span className="text-xs text-slate-400">Criterion {item.criterion_number}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        item.status === 'MISSING'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400">
                    Currently has {item.evidence_count} verified proofs (Benchmark: {item.benchmark_count}). Shortfall: {item.missing_count} proofs.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/iqac/metrics/${item.id}`)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    View Metric
                  </button>
                  {isIQAC && (
                    <button
                      onClick={() => handleOpenDataRequest(item.id, item.number)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-600/20"
                    >
                      <Send className="w-3 h-3" />
                      Request Data
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Preparation Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
          <div className="px-6 py-4 bg-slate-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Standard 10-Step Institutional Readiness Checklist</h3>
              <p className="text-xs text-slate-400">Systematic verification sequence ensuring compliance before report export.</p>
            </div>
          </div>
          {checklist.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-600 hover:border-brand-500 bg-slate-800'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <h4 className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.title}
                    </h4>
                    {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}
                    {isDone && task.completed_at && (
                      <span className="text-[10px] text-emerald-400 mt-1 block">
                        Completed on {new Date(task.completed_at).toLocaleDateString()} by {task.completed_by_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.owner_name && (
                    <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                      {task.owner_name}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      task.priority === 'HIGH' || task.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Department Contributions */}
      {activeTab === 'departments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60">
            <h3 className="text-sm font-bold text-white">Department Accreditation Contribution Leaderboard</h3>
            <p className="text-xs text-slate-400">Total verified evidence items and unique criteria indicators supported by each academic department.</p>
          </div>
          <div className="divide-y divide-slate-800">
            {deptStats.map((dept) => (
              <div key={dept.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-black text-xs">
                    {dept.code}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{dept.name}</h4>
                    <p className="text-xs text-slate-400">
                      Supports {dept.metrics_supported_count} criteria metrics ({dept.coverage_percentage}% institutional coverage)
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
      )}

      {/* Tab 5: Data Requests */}
      {activeTab === 'requests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Department Information Requests</h3>
              <p className="text-xs text-slate-400">Track and review documentation requests sent to academic departments.</p>
            </div>
            {isIQAC && (
              <button
                onClick={() => handleOpenDataRequest('', 'General')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                Issue Request
              </button>
            )}
          </div>

          {dataRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No active data requests.</p>
            </div>
          ) : (
            dataRequests.map((req) => (
              <div key={req.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
                      Metric {req.metric_number}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        req.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : req.status === 'SUBMITTED'
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-xs text-slate-500">• Due: {req.due_date || 'None'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{req.title}</h4>
                  <p className="text-xs text-slate-400">
                    Assigned: {req.assigned_to_name || req.department_name || 'Department In-charge'} • Requested by: {req.requested_by_name}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'SUBMITTED' && isIQAC && (
                    <button
                      onClick={() => handleReviewRequest(req)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                    >
                      Review & Map
                    </button>
                  )}
                  {req.status === 'OPEN' && !isIQAC && (
                    <button
                      onClick={() => {
                        setSelectedRequestForReview(req);
                        setRequestModalMode('submit');
                        setIsDataRequestModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all"
                    >
                      Submit Response
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <GapAnalysisModal
        isOpen={isGapModalOpen}
        onClose={() => setIsGapModalOpen(false)}
        academicYearId={selectedYearId}
        onOpenDataRequest={(mId, mNum) => handleOpenDataRequest(mId, mNum)}
      />

      <DataRequestModal
        isOpen={isDataRequestModalOpen}
        onClose={() => {
          setIsDataRequestModalOpen(false);
          setSelectedMetricForRequest(null);
          setSelectedRequestForReview(null);
        }}
        onSuccess={() => loadDashboardData()}
        metricId={selectedMetricForRequest?.id || ''}
        metricNumber={selectedMetricForRequest?.number || ''}
        academicYearId={selectedYearId}
        existingRequest={selectedRequestForReview}
        mode={requestModalMode}
      />
    </div>
  );
};
