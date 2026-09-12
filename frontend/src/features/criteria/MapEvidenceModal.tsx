import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Criterion, Metric, Framework } from '../../types';
import { Layers, CheckCircle2, AlertCircle, X, Shield, FileText, Loader2 } from 'lucide-react';

interface MapEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceId: string;
  evidenceTitle: string;
  evidenceCategory?: string;
  onSuccess?: () => void;
}

export const MapEvidenceModal: React.FC<MapEvidenceModalProps> = ({
  isOpen,
  onClose,
  evidenceId,
  evidenceTitle,
  evidenceCategory,
  onSuccess,
}) => {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('');
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>('');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setErrorMessage('');
      setSuccessMessage('');
      setNotes('');
      setSelectedMetricId('');
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [fwRes, critRes] = await Promise.all([
        apiClient.get('/frameworks/'),
        apiClient.get('/criteria/'),
      ]);
      const fwList: Framework[] = fwRes.data.results || fwRes.data || [];
      const critList: Criterion[] = critRes.data.results || critRes.data || [];

      setFrameworks(fwList);
      setCriteria(critList);

      if (fwList.length > 0) {
        setSelectedFrameworkId(fwList[0].id);
      }
      if (critList.length > 0) {
        setSelectedCriterionId(critList[0].id);
        fetchMetricsForCriterion(critList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load frameworks/criteria:', err);
      setErrorMessage('Failed to load accreditation frameworks. Please verify IQAC permissions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricsForCriterion = async (criterionId: string) => {
    try {
      const res = await apiClient.get(`/metrics/?criterion=${criterionId}`);
      const metricList: Metric[] = res.data.results || res.data || [];
      setMetrics(metricList);
      if (metricList.length > 0) {
        setSelectedMetricId(metricList[0].id);
      } else {
        setSelectedMetricId('');
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setMetrics([]);
    }
  };

  const handleCriterionChange = (critId: string) => {
    setSelectedCriterionId(critId);
    fetchMetricsForCriterion(critId);
  };

  const handleSaveMapping = async () => {
    if (!selectedMetricId) {
      setErrorMessage('Please select a target accreditation metric.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      await apiClient.post('/evidence-mappings/', {
        evidence: evidenceId,
        metric: selectedMetricId,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage('Evidence officially mapped to metric successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create evidence mapping:', err);
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Mapping failed. Ensure evidence is verified and not a duplicate.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedCriterionObj = criteria.find((c) => c.id === selectedCriterionId);
  const selectedMetricObj = metrics.find((m) => m.id === selectedMetricId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Map Verified Evidence to IQAC Metric</h3>
              <p className="text-xs text-slate-500 font-medium">Connect institutional record to accreditation criteria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Evidence Card */}
          <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/60 flex items-start gap-3.5">
            <FileText className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">Target Verified Evidence</span>
              <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">{evidenceTitle}</h4>
              {evidenceCategory && (
                <span className="inline-block mt-1 text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {evidenceCategory}
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <span>Loading criteria structure...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Framework Selector (if multiple) */}
              {frameworks.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Accreditation Framework
                  </label>
                  <select
                    value={selectedFrameworkId}
                    onChange={(e) => setSelectedFrameworkId(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    {frameworks.map((fw) => (
                      <option key={fw.id} value={fw.id}>
                        {fw.name} ({fw.version || fw.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Criterion Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Accreditation Criterion
                </label>
                <select
                  value={selectedCriterionId}
                  onChange={(e) => handleCriterionChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  {criteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      Criterion {c.number}: {c.title}
                    </option>
                  ))}
                </select>
                {selectedCriterionObj && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                    {selectedCriterionObj.description}
                  </p>
                )}
              </div>

              {/* Metric Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Metric
                </label>
                {metrics.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    No active metrics defined under this criterion yet.
                  </div>
                ) : (
                  <select
                    value={selectedMetricId}
                    onChange={(e) => setSelectedMetricId(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    {metrics.map((m) => (
                      <option key={m.id} value={m.id}>
                        Metric {m.number}: {m.title}
                      </option>
                    ))}
                  </select>
                )}
                {selectedMetricObj && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                    <div className="font-semibold text-slate-700">{selectedMetricObj.title}</div>
                    <div className="text-slate-500 line-clamp-2">{selectedMetricObj.description}</div>
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-medium">
                      <span>Weightage: {selectedMetricObj.weightage} marks</span>
                      <span>•</span>
                      <span>Target Evidence Benchmark: {selectedMetricObj.benchmark_count || 5}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  IQAC Mapping Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Official supporting proof for Faculty Qualification & Pedagogical Enrichment requirement."
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Official IQAC Verification:</strong> Only verified institutional evidence can be mapped.
                  This evidence record can support multiple metrics if applicable without file duplication.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveMapping}
            disabled={submitting || loading || !selectedMetricId}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mapping...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Official Mapping</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
