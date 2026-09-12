import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { MetricTraceabilityResponse } from '../../types';
import { X, ShieldCheck, FileCheck, Hash, User, Building2, Calendar, Award, Loader2, ExternalLink } from 'lucide-react';

interface SourceTraceabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metricId: string;
  academicYearId?: string;
}

export const SourceTraceabilityDrawer: React.FC<SourceTraceabilityDrawerProps> = ({
  isOpen,
  onClose,
  metricId,
  academicYearId = '',
}) => {
  const [data, setData] = useState<MetricTraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && metricId) {
      loadTraceability();
    }
  }, [isOpen, metricId, academicYearId]);

  const loadTraceability = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/compliance/traceability/', {
        params: {
          metric: metricId,
          academic_year: academicYearId || undefined,
        },
      });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Cryptographic & Procedural Lineage
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Source Traceability — Metric {data?.metric_number || ''}
              </h3>
              <p className="text-xs text-slate-400">
                {data?.metric_title || 'Authentic verified activities and cryptographic documents supporting this indicator.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500" />
                <p className="text-xs font-semibold">Tracing cryptographic evidence lineage...</p>
              </div>
            ) : !data || data.sources.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No verified evidence currently mapped to this indicator.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Authentic Lineage Records ({data.total_sources_count})</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Institutional Veracity
                  </span>
                </div>

                {data.sources.map((src, idx) => (
                  <div
                    key={src.mapping_id || idx}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase">
                            {src.activity.category || src.evidence.category}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {src.activity.start_date || 'Date logged'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{src.activity.title}</h4>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                        VERIFIED EVIDENCE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-700/60">
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                          <span className="font-semibold block">{src.faculty.name}</span>
                          <span className="text-[10px] text-slate-500">{src.faculty.employee_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                          <span className="font-semibold block">{src.faculty.department}</span>
                          <span className="text-[10px] text-slate-500">{src.activity.organizer || 'Institutional'}</span>
                        </div>
                      </div>
                    </div>

                    {src.document && (
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-medium flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-brand-400" />
                            {src.document.file_name || 'Document'}
                          </span>
                          {src.document.file_size && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(src.document.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        {src.document.file_hash && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <Hash className="w-3 h-3 text-slate-600 shrink-0" />
                            <span className="truncate">SHA-256: {src.document.file_hash}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Mapped: {new Date(src.mapped_at).toLocaleDateString()} by {src.mapped_by}</span>
                      {src.mapping_notes && <span className="italic truncate max-w-xs">{src.mapping_notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
