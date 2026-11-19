import { openPrivateFile } from '../../api/privateMedia';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  Metric,
  EvidenceMapping,
  EvidenceSuggestion,
  MetricContributions,
  AcademicYear,
  ComplianceNarrative,
  DataRequest,
  MetricTraceabilityResponse,
} from '../../types';
import {
  ArrowLeft,
  Calendar,
  Layers,
  FileText,
  Building2,
  Users,
  Sparkles,
  CheckCircle2,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Plus,
  Send,
  ScrollText,
  Clock,
  Lock,
  History,
  User,
} from 'lucide-react';
import { DataRequestModal } from '../compliance/DataRequestModal';

export const MetricDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isIQAC = ['SUPER_ADMIN', 'IQAC'].includes(user?.role || '');

  const [metric, setMetric] = useState<Metric | null>(null);
  const [mappings, setMappings] = useState<EvidenceMapping[]>([]);
  const [suggestions, setSuggestions] = useState<EvidenceSuggestion[]>([]);
  const [contributions, setContributions] = useState<MetricContributions | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [activeTab, setActiveTab] = useState<'mapped' | 'suggestions' | 'narrative' | 'traceability' | 'requests' | 'contributions'>('mapped');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Narrative state
  const [narrative, setNarrative] = useState<ComplianceNarrative | null>(null);
  const [narrativeText, setNarrativeText] = useState<string>('');
  const [narrativeSaving, setNarrativeSaving] = useState<boolean>(false);
  const [aiDraftLoading, setAiDraftLoading] = useState<boolean>(false);

  // Traceability & Requests state
  const [traceabilityData, setTraceabilityData] = useState<MetricTraceabilityResponse | null>(null);
  const [traceabilityLoading, setTraceabilityLoading] = useState<boolean>(false);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [isDataRequestModalOpen, setIsDataRequestModalOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [mappingLoading, setMappingLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (id) {
      loadMetricData();
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

  const loadMetricData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const metricRes = await apiClient.get(`/metrics/${id}/`);
      setMetric(metricRes.data);

      const params: Record<string, string> = {};
      if (selectedYear) params.academic_year = selectedYear;

      const [mapRes, suggRes, contribRes] = await Promise.all([
        apiClient.get(`/metrics/${id}/evidence/`, { params }),
        isIQAC ? apiClient.get(`/metrics/${id}/suggestions/`) : Promise.resolve({ data: [] }),
        apiClient.get(`/metrics/${id}/contributions/`),
      ]);

      setMappings(mapRes.data.results || mapRes.data || []);
      setSuggestions(suggRes.data || []);
      setContributions(contribRes.data || null);

      loadNarrative();
      if (activeTab === 'traceability') loadTraceability();
      if (activeTab === 'requests') loadDataRequests();
    } catch (err: any) {
      console.error('Failed to load metric details:', err);
      setActionMessage({ type: 'error', text: 'Failed to load metric details.' });
    } finally {
      setLoading(false);
    }
  };

  const loadNarrative = async () => {
    try {
      const res = await apiClient.get('/compliance/narratives/', { params: { metric: id } });
      const list = res.data.results || res.data || [];
      if (list.length > 0) {
        setNarrative(list[0]);
        setNarrativeText(list[0].narrative_text || '');
      } else {
        setNarrative(null);
        setNarrativeText('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNarrative = async () => {
    if (!narrativeText.trim()) return;
    setNarrativeSaving(true);
    setActionMessage(null);
    try {
      if (narrative?.id) {
        const res = await apiClient.patch(`/compliance/narratives/${narrative.id}/`, {
          narrative_text: narrativeText,
          change_reason: 'Manual narrative response update',
        });
        setNarrative(res.data);
      } else {
        const res = await apiClient.post('/compliance/narratives/', {
          metric: id,
          academic_year: selectedYear || undefined,
          narrative_text: narrativeText,
          workspace_type: 'AQAR',
        });
        setNarrative(res.data);
      }
      setActionMessage({ type: 'success', text: 'Narrative response saved successfully.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save narrative.' });
    } finally {
      setNarrativeSaving(false);
    }
  };

  const handleAiDraft = async () => {
    setAiDraftLoading(true);
    setActionMessage(null);
    try {
      const res = await apiClient.post('/compliance/narratives/ai-draft/', {
        metric_id: id,
        academic_year_id: selectedYear || undefined,
        workspace_type: 'AQAR',
      });
      setNarrativeText(res.data.narrative_text);
      setActionMessage({
        type: 'success',
        text: `AI Draft generated using ${res.data.source_evidence_count} verified sources! Review required before approval.`,
      });
      loadNarrative();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to generate AI narrative draft.' });
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleTransitionStatus = async (newStatus: string) => {
    if (!narrative?.id) return;
    setActionMessage(null);
    try {
      const res = await apiClient.post(`/compliance/narratives/${narrative.id}/transition-status/`, {
        status: newStatus,
      });
      setNarrative(res.data);
      setActionMessage({ type: 'success', text: `Narrative status transitioned to ${newStatus}.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update narrative status.' });
    }
  };

  const loadTraceability = async () => {
    setTraceabilityLoading(true);
    try {
      const res = await apiClient.get('/compliance/traceability/', {
        params: { metric: id, academic_year: selectedYear || undefined },
      });
      setTraceabilityData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTraceabilityLoading(false);
    }
  };

  const loadDataRequests = async () => {
    try {
      const res = await apiClient.get('/compliance/data-requests/', {
        params: { metric: id, academic_year: selectedYear || undefined },
      });
      setDataRequests(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickMap = async (suggestion: EvidenceSuggestion) => {
    if (!isIQAC) return;
    setMappingLoading(true);
    setActionMessage(null);
    try {
      await apiClient.post('/evidence-mappings/', {
        evidence: suggestion.id,
        metric: id,
        notes: `Mapped via Automatic Discovery (${suggestion.match_reasons.join(', ')})`,
      });
      setActionMessage({ type: 'success', text: `Evidence "${suggestion.title}" mapped successfully!` });
      loadMetricData();
    } catch (err: any) {
      console.error('Failed to map suggested evidence:', err);
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to map evidence.' });
    } finally {
      setMappingLoading(false);
    }
  };

  const handleArchiveMapping = async (mappingId: string) => {
    if (!isIQAC) return;
    const confirm = window.confirm('Are you sure you want to unmap this evidence from this metric? (Audit history will be preserved)');
    if (!confirm) return;

    setMappingLoading(true);
    try {
      await apiClient.post(`/evidence-mappings/${mappingId}/archive/`, {
        reason: 'Unmapped by IQAC user from Metric Detail View',
      });
      setActionMessage({ type: 'success', text: 'Evidence unmapped and archived successfully.' });
      loadMetricData();
    } catch (err: any) {
      console.error('Failed to archive mapping:', err);
      setActionMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to unmap evidence.' });
    } finally {
      setMappingLoading(false);
    }
  };

  const handlePreviewDocument = async (evidenceId: string) => {
    try {
      const res = await apiClient.get(`/evidence/${evidenceId}/preview/`);
      if (res.data?.url) {
        void openPrivateFile(res.data.url);
      }
    } catch (e) {
      alert('Unable to generate preview. Document might not have an attached file.');
    }
  };

  const handleDownloadDocument = async (evidenceId: string) => {
    try {
      const res = await apiClient.get(`/evidence/${evidenceId}/download/`);
      if (res.data?.download_url) {
        void openPrivateFile(res.data.download_url);
      }
    } catch (e) {
      alert('Download link currently unavailable.');
    }
  };

  // Filter mapped evidence by department and search query
  const filteredMappings = mappings.filter((m) => {
    if (departmentFilter && m.department_name !== departmentFilter && m.department_code !== departmentFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.evidence_title?.toLowerCase().includes(q);
      const matchFaculty = m.faculty_name?.toLowerCase().includes(q);
      const matchDept = m.department_name?.toLowerCase().includes(q);
      const matchCat = m.evidence_category?.toLowerCase().includes(q);
      if (!matchTitle && !matchFaculty && !matchDept && !matchCat) return false;
    }
    return true;
  });

  if (loading && !metric) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-xs font-semibold">Loading metric evidence dossier...</span>
      </div>
    );
  }

  if (!metric) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Metric Not Found</h3>
        <button
          onClick={() => navigate('/iqac/criteria/dashboard')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
        >
          Back to Criteria Dashboard
        </button>
      </div>
    );
  }

  const benchmark = metric.benchmark_count || 5;
  const currentCount = mappings.length;
  const progressPct = Math.min(Math.round((currentCount / benchmark) * 100), 100);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(metric.criterion ? `/iqac/criteria/${metric.criterion}` : '/iqac/criteria/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Criterion {metric.criterion_number || ''}</span>
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

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Header Card */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                Metric {metric.number}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600">
                Criterion {metric.criterion_number}: {metric.criterion_title}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{metric.title}</h1>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">{metric.description}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 min-w-[220px] shrink-0 text-right space-y-2">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evidence Availability</div>
              <div className="text-2xl font-black text-brand-600 mt-0.5">
                {currentCount} / {benchmark}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {progressPct}% of benchmark target met
              </div>
            </div>
            <button
              onClick={() => {
                const rolePrefix = user?.role === 'HOD' ? '/hod' : user?.role === 'DEPARTMENT_INCHARGE' ? '/incharge' : user?.role === 'FACULTY' ? '/faculty' : '/iqac';
                navigate(`${rolePrefix}/reports?criterion=${metric.criterion}&metric=${metric.id}&report_type=METRIC_EVIDENCE`);
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Evidence Report
            </button>
          </div>
        </div>

        {/* Requirements Chips */}
        {metric.requirements && metric.requirements.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Required Proofs:</span>
            {metric.requirements.map((r) => (
              <div
                key={r.id}
                className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                <span>{r.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({r.required_count} needed)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-2">
        <button
          onClick={() => setActiveTab('mapped')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'mapped'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Mapped Evidence ({mappings.length})</span>
        </button>

        {isIQAC && (
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'suggestions'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Automatic Discovery ({suggestions.length})</span>
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab('narrative');
            loadNarrative();
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'narrative'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScrollText className="w-4 h-4 text-indigo-500" />
          <span>Narrative & AI Drafter</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('traceability');
            loadTraceability();
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'traceability'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Source Traceability</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('requests');
            loadDataRequests();
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4 text-brand-500" />
          <span>Data Requests ({dataRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contributions')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'contributions'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Contributions & Departments</span>
        </button>
      </div>

      {/* TAB 1: Mapped Evidence */}
      {activeTab === 'mapped' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search mapped records by activity, faculty, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-800 outline-none w-full placeholder:text-slate-400"
              />
            </div>

            {departmentFilter && (
              <div className="flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200 text-xs font-bold text-brand-700">
                <span>Filter: {departmentFilter}</span>
                <button onClick={() => setDepartmentFilter('')} className="hover:text-brand-900 ml-1">
                  ✕
                </button>
              </div>
            )}
          </div>

          {filteredMappings.length === 0 ? (
            <div className="py-16 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Mapped Evidence Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No verified institutional evidence is officially mapped to this metric for the selected cycle.
              </p>
              {isIQAC && suggestions.length > 0 && (
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition"
                >
                  View {suggestions.length} Discovered Suggestions
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Activity / Evidence</th>
                      <th className="py-3.5 px-4">Faculty & Dept</th>
                      <th className="py-3.5 px-4">Category / Cycle</th>
                      <th className="py-3.5 px-4">Mapped By / Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{m.evidence_title}</div>
                          {m.notes && <div className="text-[11px] text-slate-400 italic line-clamp-1">{m.notes}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{m.faculty_name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{m.department_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {m.evidence_category}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{m.academic_year_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700">{m.mapped_by_name || 'IQAC User'}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.mapped_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handlePreviewDocument(m.evidence)}
                              title="Preview Document"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(m.evidence)}
                              title="Download Evidence"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {isIQAC && (
                              <button
                                onClick={() => handleArchiveMapping(m.id)}
                                title="Unmap Evidence"
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Automatic Evidence Discovery */}
      {activeTab === 'suggestions' && isIQAC && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Automatic Evidence Discovery (Section 16)</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                The IQAC engine scanned verified institutional records in your college and discovered potential matches
                based on category requirements and title keywords. Click <strong>Map to Metric</strong> to officially map them.
              </p>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="py-16 bg-white rounded-3xl border border-slate-200/80 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Unmapped Candidates</h3>
              <p className="text-xs text-slate-400">All matching verified records are already mapped to this metric.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                        {s.category}
                      </span>
                      {s.match_reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Faculty: {s.faculty_name}</span>
                      <span>•</span>
                      <span>Department: {s.department_name}</span>
                      <span>•</span>
                      <span>Cycle: {s.academic_year_name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickMap(s)}
                    disabled={mappingLoading}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Map to Metric</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Contributions */}
      {activeTab === 'contributions' && contributions && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Contribution */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                Department Contribution (Section 18)
              </h3>
              <span className="text-xs text-slate-400 font-semibold">Click to filter mapped list</span>
            </div>

            <div className="space-y-2.5">
              {contributions.department_contributions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No department contributions recorded yet.</div>
              ) : (
                contributions.department_contributions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDepartmentFilter(d.name);
                      setActiveTab('mapped');
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-brand-50 border border-slate-200/80 hover:border-brand-200 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {d.code}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{d.name}</h4>
                        <span className="text-[10px] text-slate-400">Verified Evidence Proofs</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {d.count} proofs
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Faculty Contribution */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              Faculty Contribution (Section 19)
            </h3>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {contributions.faculty_contributions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No faculty contributions recorded yet.</div>
              ) : (
                contributions.faculty_contributions.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{f.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {f.department} {f.employee_id ? `• ${f.employee_id}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {f.count} proofs
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Narrative Response & AI Drafter */}
      {activeTab === 'narrative' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-indigo-600" />
                  Qualitative Narrative Response
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official AQAR / SSR qualitative text backing Metric {metric.number}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {narrative && (
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      narrative.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : narrative.status === 'READY_FOR_REVIEW'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : narrative.status === 'LOCKED'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {narrative.status} (v{narrative.version})
                  </span>
                )}

                {isIQAC && (
                  <button
                    onClick={handleAiDraft}
                    disabled={aiDraftLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiDraftLoading ? 'Drafting...' : 'Draft from Verified Data with AI'}
                  </button>
                )}

                <button
                  onClick={handleSaveNarrative}
                  disabled={narrativeSaving || !narrativeText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm shadow-brand-600/20 disabled:opacity-50"
                >
                  {narrativeSaving ? 'Saving...' : 'Save Narrative'}
                </button>
              </div>
            </div>

            {/* AI Warning Banner */}
            {narrative?.is_ai_drafted && (
              <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">AI-Assisted Draft — Review Required</span>
                  <span>
                    This qualitative response was drafted from verified institutional activities and certificates.
                    IQAC committee review and official approval is mandatory before reporting.
                  </span>
                </div>
              </div>
            )}

            {/* Narrative Textarea */}
            <div>
              <textarea
                rows={8}
                value={narrativeText}
                onChange={(e) => setNarrativeText(e.target.value)}
                placeholder="Compose or review the qualitative institutional narrative response supporting this metric..."
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition resize-y font-normal leading-relaxed"
              />
            </div>

            {/* Status Transition Controls for IQAC */}
            {isIQAC && narrative && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">IQAC Governance Workflow:</span>
                <div className="flex items-center gap-2">
                  {narrative.status === 'DRAFT' && (
                    <button
                      onClick={() => handleTransitionStatus('READY_FOR_REVIEW')}
                      className="px-3 py-1.5 font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition"
                    >
                      Submit for Review
                    </button>
                  )}
                  {narrative.status === 'READY_FOR_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleTransitionStatus('REVISION_REQUIRED')}
                        className="px-3 py-1.5 font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition"
                      >
                        Request Revisions
                      </button>
                      <button
                        onClick={() => handleTransitionStatus('APPROVED')}
                        className="px-3.5 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
                      >
                        Approve Official Narrative
                      </button>
                    </>
                  )}
                  {narrative.status === 'APPROVED' && (
                    <button
                      onClick={() => handleTransitionStatus('LOCKED')}
                      className="flex items-center gap-1 px-3 py-1.5 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition"
                    >
                      <Lock className="w-3.5 h-3.5" /> Lock Narrative
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historical Versions */}
          {narrative?.versions && narrative.versions.length > 0 && (
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Revision Version History ({narrative.versions.length})
              </h4>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {narrative.versions.map((v) => (
                  <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Version {v.version_number}</span>
                      <span className="text-slate-400 text-[10px] ml-2">• {v.change_reason || 'Edited'}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <span>{new Date(v.created_at).toLocaleDateString()}</span> by {v.edited_by_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Source Traceability */}
      {activeTab === 'traceability' && (
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cryptographic & Procedural Lineage
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every quantitative metric figure and qualitative narrative is traceable to authentic underlying evidence.
                </p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                100% Institutional Veracity
              </span>
            </div>

            {traceabilityLoading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600" />
                <p className="text-xs">Loading evidence lineage...</p>
              </div>
            ) : !traceabilityData || traceabilityData.sources.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No verified evidence records actively mapped to this metric.
              </div>
            ) : (
              <div className="space-y-3">
                {traceabilityData.sources.map((src, idx) => (
                  <div
                    key={src.mapping_id || idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 uppercase">
                            {src.activity.category || src.evidence.category}
                          </span>
                          <span className="text-xs text-slate-400">{src.activity.start_date || 'Date logged'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{src.activity.title}</h4>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider shrink-0">
                        VERIFIED EVIDENCE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-semibold block">{src.faculty.name}</span>
                          <span className="text-[10px] text-slate-400">{src.faculty.employee_id} • {src.faculty.department}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-semibold block">{src.activity.organizer || 'Institutional Organizer'}</span>
                          <span className="text-[10px] text-slate-400">Duration: {src.activity.duration || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {src.document && (
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-800">
                          <span className="font-medium flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                            {src.document.file_name}
                          </span>
                          {src.document.file_size && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {(src.document.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        {src.document.file_hash && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            SHA-256: {src.document.file_hash}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Data Requests */}
      {activeTab === 'requests' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-brand-600" />
                Department Information Requests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official requests issued to departments to collect missing proof documentation for Metric {metric.number}.
              </p>
            </div>
            {isIQAC && (
              <button
                onClick={() => setIsDataRequestModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Issue Request
              </button>
            )}
          </div>

          {dataRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No data requests issued for this metric.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dataRequests.map((req) => (
                <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{req.title}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          req.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'SUBMITTED'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assigned: {req.assigned_to_name || req.department_name || 'Department'} • Due: {req.due_date || 'None'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Request Modal */}
      <DataRequestModal
        isOpen={isDataRequestModalOpen}
        onClose={() => setIsDataRequestModalOpen(false)}
        onSuccess={() => {
          loadDataRequests();
          loadMetricData();
        }}
        metricId={metric.id}
        metricNumber={metric.number}
        academicYearId={selectedYear}
        mode="create"
      />
    </div>
  );
};
