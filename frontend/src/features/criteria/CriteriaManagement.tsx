import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Framework, Criterion, Metric } from '../../types';
import {
  Layers,
  ChevronRight,
  BarChart3,
  Award,
  Plus,
  Building2,
  FileCheck2,
  ExternalLink,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';

export const CriteriaManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isIQAC = ['SUPER_ADMIN', 'IQAC'].includes(user?.role || '');

  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddCriterionModal, setShowAddCriterionModal] = useState<boolean>(false);
  const [showAddMetricModal, setShowAddMetricModal] = useState<boolean>(false);

  // Form states
  const [critNumber, setCritNumber] = useState<string>('');
  const [critTitle, setCritTitle] = useState<string>('');
  const [critDesc, setCritDesc] = useState<string>('');
  const [critWeight, setCritWeight] = useState<number>(100);

  const [metricNumber, setMetricNumber] = useState<string>('');
  const [metricTitle, setMetricTitle] = useState<string>('');
  const [metricDesc, setMetricDesc] = useState<string>('');
  const [metricWeight, setMetricWeight] = useState<number>(20);
  const [metricBenchmark, setMetricBenchmark] = useState<number>(5);

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFrameworkId) {
      fetchCriteria(selectedFrameworkId);
    }
  }, [selectedFrameworkId]);

  const fetchFrameworks = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/frameworks/');
      const fws: Framework[] = res.data.results || res.data || [];
      setFrameworks(fws);
      if (fws.length > 0) {
        setSelectedFrameworkId(fws[0].id);
      } else {
        fetchCriteria();
      }
    } catch (e) {
      console.error('Failed to load frameworks', e);
      fetchCriteria();
    }
  };

  const fetchCriteria = async (frameworkId?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (frameworkId) params.framework_ref = frameworkId;
      const res = await apiClient.get('/criteria/', { params });
      const data: Criterion[] = res.data.results || res.data || [];
      setCriteria(data);
      if (data.length > 0) {
        // Load detailed criterion with its metrics
        loadCriterionDetails(data[0].id);
      } else {
        setSelectedCriterion(null);
      }
    } catch (e) {
      console.error('Failed to load criteria', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCriterionDetails = async (criterionId: string) => {
    try {
      const res = await apiClient.get(`/criteria/${criterionId}/`);
      setSelectedCriterion(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!critNumber || !critTitle) return;
    setSubmitting(true);
    try {
      await apiClient.post('/criteria/', {
        framework_ref: selectedFrameworkId || undefined,
        number: critNumber,
        title: critTitle,
        description: critDesc,
        weightage: critWeight,
        display_order: parseInt(critNumber) || 1,
      });
      setShowAddCriterionModal(false);
      setCritNumber('');
      setCritTitle('');
      setCritDesc('');
      fetchCriteria(selectedFrameworkId);
    } catch (err) {
      console.error('Failed to create criterion', err);
      alert('Failed to create criterion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCriterion || !metricNumber || !metricTitle) return;
    setSubmitting(true);
    try {
      await apiClient.post('/metrics/', {
        criterion: selectedCriterion.id,
        number: metricNumber,
        title: metricTitle,
        description: metricDesc,
        weightage: metricWeight,
        benchmark_count: metricBenchmark,
      });
      setShowAddMetricModal(false);
      setMetricNumber('');
      setMetricTitle('');
      setMetricDesc('');
      loadCriterionDetails(selectedCriterion.id);
    } catch (err) {
      console.error('Failed to create metric', err);
      alert('Failed to create metric.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[11px] font-black uppercase tracking-wider">
              Accreditation Architecture
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Accreditation Criteria & Metrics Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configurable hierarchy: College → Framework → Criteria → Metrics → Evidence Requirements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Framework Selector */}
          {frameworks.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
              <Layers className="w-4 h-4 text-slate-400" />
              <select
                value={selectedFrameworkId}
                onChange={(e) => setSelectedFrameworkId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {frameworks.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name} ({fw.version || fw.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => navigate('/iqac/criteria/dashboard')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5 shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Progress Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Criteria List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Criteria Pillars ({criteria.length})
            </h2>
            {isIQAC && (
              <button
                onClick={() => setShowAddCriterionModal(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criterion</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200/80">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <span>Loading criteria...</span>
            </div>
          ) : criteria.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200/80">
              No criteria defined under this framework yet.
            </div>
          ) : (
            criteria.map((c) => {
              const isSelected = selectedCriterion?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => loadCriterionDetails(c.id)}
                  className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-brand-50/70 border-brand-500/40 shadow-xs ring-2 ring-brand-500/10'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      C{c.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Criterion {c.number}
                        </span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-semibold text-slate-500">{c.weightage} marks</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition ${
                      isSelected ? 'text-brand-600 translate-x-0.5' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Right: Selected Criterion Detail & Metrics List */}
        <div className="lg:col-span-7">
          {selectedCriterion ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-6">
              {/* Criterion Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      Criterion {selectedCriterion.number}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">• Weightage: {selectedCriterion.weightage} marks</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedCriterion.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedCriterion.description}</p>
                </div>

                <button
                  onClick={() => navigate(`/iqac/criteria/${selectedCriterion.id}`)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Criterion Detail</span>
                </button>
              </div>

              {/* Metrics Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand-600" />
                    Quality Metrics ({selectedCriterion.metrics?.length || 0})
                  </h4>
                  {isIQAC && (
                    <button
                      onClick={() => setShowAddMetricModal(true)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Metric</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedCriterion.metrics && selectedCriterion.metrics.length > 0 ? (
                    selectedCriterion.metrics.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-brand-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Metric {m.number}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{m.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{m.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                            <span>Weightage: {m.weightage} marks</span>
                            <span>•</span>
                            <span>Target Benchmark: {m.benchmark_count || 5} proofs</span>
                            {m.active_mappings_count !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-brand-700 font-semibold">{m.active_mappings_count} mapped</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/iqac/metrics/${m.id}`)}
                          className="px-3 py-1.5 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-200 text-slate-700 hover:text-brand-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                        >
                          <span>View Evidence Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-slate-200/60">
                      No metrics configured under Criterion {selectedCriterion.number} yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-slate-400 text-sm">
              Select a criterion from the left to view its metrics and evidence requirements.
            </div>
          )}
        </div>
      </div>

      {/* Add Criterion Modal */}
      {showAddCriterionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Add New Accreditation Criterion</h3>
              <button onClick={() => setShowAddCriterionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCriterion} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Criterion Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8"
                    value={critNumber}
                    onChange={(e) => setCritNumber(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Weightage (Marks)</label>
                  <input
                    type="number"
                    required
                    value={critWeight}
                    onChange={(e) => setCritWeight(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innovation & Entrepreneurship"
                  value={critTitle}
                  onChange={(e) => setCritTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Focus areas, institutional scope, and quality guidelines..."
                  value={critDesc}
                  onChange={(e) => setCritDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCriterionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Criterion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Metric Modal */}
      {showAddMetricModal && selectedCriterion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Add Metric to Criterion {selectedCriterion.number}
              </h3>
              <button onClick={() => setShowAddMetricModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateMetric} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Metric Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2.5.1"
                    value={metricNumber}
                    onChange={(e) => setMetricNumber(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Weightage</label>
                  <input
                    type="number"
                    required
                    value={metricWeight}
                    onChange={(e) => setMetricWeight(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Proofs</label>
                  <input
                    type="number"
                    required
                    value={metricBenchmark}
                    onChange={(e) => setMetricBenchmark(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Number of Collaborative Research Publications"
                  value={metricTitle}
                  onChange={(e) => setMetricTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Quality indicator description, target calculation logic, and proof requirements..."
                  value={metricDesc}
                  onChange={(e) => setMetricDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMetricModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Metric</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
