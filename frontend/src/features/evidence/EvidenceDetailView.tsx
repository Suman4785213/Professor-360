import { openPrivateFile } from '../../api/privateMedia';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { EvidenceRecord, Document as DocumentType, DocumentCategory } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { DocumentPreviewViewer } from '../../components/ui/DocumentPreviewViewer';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Award,
  Calendar,
  Building2,
  User,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Archive,
  RotateCcw,
  Plus,
  Hash,
  AlertCircle,
  ExternalLink,
  Layers,
  MapPin,
  Tag,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { MapEvidenceModal } from '../criteria/MapEvidenceModal';
import { EvidenceMapping } from '../../types';

export const EvidenceDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active selected document for preview
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);

  // Document categories for supplementary upload
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);

  // Add Document Modal State
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Phase 5: Criteria Mapping State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [evidenceMappings, setEvidenceMappings] = useState<EvidenceMapping[]>([]);

  const canArchive = user?.role === 'IQAC' || user?.role === 'SUPER_ADMIN';
  const canAttachDocs =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'IQAC' ||
    ((user?.role === 'HOD' || user?.role === 'DEPARTMENT_INCHARGE') && user?.department === evidence?.department) ||
    (user?.role === 'FACULTY' && user?.id === evidence?.faculty);

  useEffect(() => {
    if (id) {
      fetchEvidenceDetail();
      fetchDocCategories();
      fetchEvidenceMappings();
    }
  }, [id]);

  const fetchEvidenceMappings = async () => {
    try {
      const res = await apiClient.get(`/evidence-mappings/?evidence=${id}`);
      setEvidenceMappings(res.data.results || res.data || []);
    } catch (e) {
      console.error('Failed to load evidence mappings', e);
    }
  };

  const handleUnmap = async (mappingId: string) => {
    if (!canArchive) return;
    const confirm = window.confirm('Are you sure you want to unmap this evidence from this metric?');
    if (!confirm) return;
    try {
      await apiClient.post(`/evidence-mappings/${mappingId}/archive/`, {
        reason: 'Unmapped by user in Evidence Detail View',
      });
      fetchEvidenceMappings();
    } catch (e) {
      alert('Failed to unmap evidence.');
    }
  };

  const fetchEvidenceDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/evidence/${id}/`);
      setEvidence(res.data);
      // Select primary document or first supporting doc by default
      const primary = res.data.document_details || (res.data.supporting_documents && res.data.supporting_documents[0]);
      setSelectedDoc(primary || null);
    } catch (err: any) {
      console.error('Error fetching evidence:', err);
      setError(err.response?.data?.detail || 'Failed to load evidence record dossier.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocCategories = async () => {
    try {
      const res = await apiClient.get('/document-categories/');
      setDocCategories(res.data.results || res.data || []);
    } catch (e) {
      console.error('Error fetching document categories:', e);
    }
  };

  const handleCopy = (text: string, idStr: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(idStr);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleArchive = async () => {
    if (!archiveReason.trim()) {
      alert('Please enter a rationale for archiving this institutional evidence.');
      return;
    }
    setArchiveLoading(true);
    try {
      await apiClient.post(`/evidence/${id}/archive/`, { reason: archiveReason });
      setIsArchiveModalOpen(false);
      setArchiveReason('');
      fetchEvidenceDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to archive evidence record.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('Are you sure you want to restore this evidence back to the active repository?')) return;
    try {
      await apiClient.post(`/evidence/${id}/restore/`);
      fetchEvidenceDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to restore evidence record.');
    }
  };

  const handleUploadSupplementary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadCategory) formData.append('category', uploadCategory);
    if (uploadDesc) formData.append('description', uploadDesc);

    try {
      await apiClient.post(`/evidence/${id}/add-document/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsAddDocOpen(false);
      setUploadFile(null);
      setUploadCategory('');
      setUploadDesc('');
      fetchEvidenceDetail();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload supplementary document.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Institutional Evidence Dossier...
        </p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Evidence Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">{error || 'The requested evidence dossier could not be retrieved.'}</p>
        <Button onClick={() => navigate(-1)} variant="secondary" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Repository
        </Button>
      </div>
    );
  }

  const act = evidence.activity_details;
  const docs = evidence.supporting_documents || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Repository
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 leading-tight">
              {evidence.title}
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                evidence.status === 'ARCHIVED'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {evidence.status === 'ARCHIVED' ? 'Archived Evidence' : 'Verified Evidence'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sealed Institutional Dossier • Academic Year: <span className="font-semibold text-slate-700">{evidence.academic_year_name}</span> • Department:{' '}
            <span className="font-semibold text-slate-700">{evidence.department_name} ({evidence.department_code})</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {canAttachDocs && (
            <Button onClick={() => setIsAddDocOpen(true)} variant="secondary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5 text-brand-600" /> Attach Document
            </Button>
          )}

          {canArchive && (
            <>
              {evidence.status === 'ACTIVE' ? (
                <Button onClick={() => setIsArchiveModalOpen(true)} variant="secondary" size="sm">
                  <Archive className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Archive Record
                </Button>
              ) : (
                <Button onClick={handleRestore} variant="secondary" size="sm">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Restore to Active
                </Button>
              )}
            </>
          )}

          {selectedDoc?.download_url && (
            <Button
              onClick={() => void openPrivateFile(selectedDoc.download_url)}
              variant="primary"
              size="sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
            </Button>
          )}
        </div>
      </div>

      {/* Archived Warning Banner if archived */}
      {evidence.status === 'ARCHIVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-amber-900 block">This institutional evidence record has been archived.</span>
            <p className="text-amber-800 mt-0.5">
              Reason: <span className="font-medium italic">"{evidence.archive_reason || 'No specific rationale provided.'}"</span>
            </p>
            <p className="text-amber-700 text-[11px] mt-1">
              Archived by {evidence.archived_by_name || 'IQAC Coordinator'} on{' '}
              {evidence.archived_at ? new Date(evidence.archived_at).toLocaleString() : 'N/A'}. This record is preserved in audit logs but excluded from active accreditation queries.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Info + Documents & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metadata & Audit Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-600" /> Activity Details
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Faculty</span>
                <span className="font-bold text-slate-800 block truncate">{evidence.faculty_name}</span>
                <span className="text-[11px] text-slate-500 block truncate">{evidence.faculty_designation || 'Faculty'}</span>
                <span className="text-[10px] font-mono text-brand-700 block mt-0.5">{evidence.faculty_employee_id || evidence.faculty_email}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Department</span>
                <span className="font-bold text-slate-800 block truncate">{evidence.department_name}</span>
                <span className="text-[11px] text-slate-500 block">Code: {evidence.department_code}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Year: {evidence.academic_year_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Category</span>
                <span className="font-bold text-slate-800 block">{evidence.category || 'Academic Activity'}</span>
                {act?.activity_type && (
                  <span className="text-[11px] text-brand-600 font-semibold block">{act.activity_type}</span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Duration / Mode</span>
                <span className="font-bold text-slate-800 block">{act?.duration || 'Completed'}</span>
                <span className="text-[11px] text-slate-500 block">
                  {act?.is_online ? 'Online / Virtual' : 'In-Person / Offline'}
                </span>
              </div>

              {act?.start_date && (
                <div className="col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Dates</span>
                    <span className="font-semibold text-slate-800">
                      {act.start_date} {act.end_date ? `to ${act.end_date}` : ''}
                    </span>
                  </div>
                  {act.certificate_number && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cert No.</span>
                      <span className="font-mono text-xs font-bold text-brand-700">{act.certificate_number}</span>
                    </div>
                  )}
                </div>
              )}

              {act?.organizer && (
                <div className="col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Organizer & Location</span>
                  <span className="font-semibold text-slate-800 block">{act.organizer}</span>
                  {act.location && <span className="text-[11px] text-slate-500 block">{act.location}</span>}
                </div>
              )}
            </div>

            {evidence.description && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Description / Summary</span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  {evidence.description}
                </p>
              </div>
            )}
          </div>

          {/* Phase 5: Accreditation & Criteria Mapping */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-600" /> Accreditation & Criteria Mapping
              </h3>
              {canArchive && (
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200/60"
                >
                  <Plus className="w-3.5 h-3.5" /> Map to Metric
                </button>
              )}
            </div>

            {evidenceMappings.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Not officially mapped to any criteria or metric yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {evidenceMappings.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200/70 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white font-mono font-bold text-[10px]">
                          Criterion {m.criterion_number} → Metric {m.metric_number}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{m.metric_title}</span>
                      </div>
                      {m.notes && <p className="text-[11px] text-slate-500 italic">{m.notes}</p>}
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>Mapped by: {m.mapped_by_name || 'IQAC User'}</span>
                        <span>•</span>
                        <span>{new Date(m.mapped_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {canArchive && (
                      <button
                        type="button"
                        onClick={() => handleUnmap(m.id)}
                        title="Unmap this metric"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Audit Trail */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verification Chain
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {evidence.verification_timeline && evidence.verification_timeline.length > 0 ? (
                evidence.verification_timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{item.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {item.actor_name} ({item.role})
                      </span>
                      {item.comment && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-1.5 border border-slate-100 italic">
                          "{item.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">IQAC Verified & Sealed</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Verified at: {new Date(evidence.verified_at).toLocaleString()}
                    </span>
                    <p className="text-xs text-slate-600 bg-emerald-50/50 p-2 rounded-xl mt-1.5 border border-emerald-100">
                      Approved through institutional peer-review pipeline and committed as tamper-evident institutional record.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Supporting Documents Gallery + Interactive Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Supporting Documents Gallery */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-600" /> Supporting Evidence Documents ({docs.length})
              </h3>
              {canAttachDocs && (
                <button
                  onClick={() => setIsAddDocOpen(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Attach Proof
                </button>
              )}
            </div>

            {docs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No documents currently attached to this evidence activity.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-brand-50/40 border-brand-300 ring-2 ring-brand-500/20 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              doc.is_primary ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-700'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {doc.original_filename || doc.file_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {(doc.file_size / 1024).toFixed(1)} KB • v{doc.version || 1}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border ${
                            doc.is_primary
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {doc.category_name || (doc.is_primary ? 'Certificate' : 'Supporting')}
                        </span>
                      </div>

                      {/* Hash snippet */}
                      {doc.file_hash && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-white/70 px-2 py-1 rounded-lg border border-slate-100">
                          <span className="font-mono truncate">SHA: {doc.file_hash.substring(0, 16)}...</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(doc.file_hash || '', doc.id);
                            }}
                            className="text-slate-400 hover:text-slate-700 ml-1.5 shrink-0"
                            title="Copy SHA-256 hash"
                          >
                            {copiedHash === doc.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive Document Viewer */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" /> Document Verification Viewer
              </h3>
              {selectedDoc && (
                <span className="text-xs font-semibold text-slate-600 truncate max-w-xs">
                  {selectedDoc.original_filename || selectedDoc.file_name}
                </span>
              )}
            </div>

            {selectedDoc ? (
              <div className="min-h-[500px]">
                <DocumentPreviewViewer document={selectedDoc} showMetadata={true} />
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Select a document from the gallery above to preview.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supplementary Document Upload Modal */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand-600" /> Attach Supplementary Document
              </h3>
              <button
                onClick={() => setIsAddDocOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSupplementary} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Document Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                >
                  <option value="">Select document type...</option>
                  {docCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {docCategories.length === 0 && (
                    <>
                      <option value="ATTENDANCE">Attendance Sheet</option>
                      <option value="REPORT">Activity Report</option>
                      <option value="PHOTO">Photographs</option>
                      <option value="PUBLICATION_PROOF">Publication Proof</option>
                      <option value="AWARD_PROOF">Award Proof</option>
                      <option value="SUPPORTING">Supporting Material</option>
                      <option value="OTHER">Other Evidence</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  File (PDF, PNG, JPG up to 10MB) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="e.g. Session participant attendance sheet signed by HOD..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" onClick={() => setIsAddDocOpen(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={uploadLoading}>
                  {uploadLoading ? 'Uploading...' : 'Upload & Attach'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-amber-600" /> Archive Institutional Evidence
              </h3>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Archiving removes this record from default accreditation search views while strictly maintaining its audit trail and cryptographic document hashes.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Archive Rationale / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Superseded by updated conference proceeding; archived per IQAC review meeting #14..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" onClick={() => setIsArchiveModalOpen(false)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleArchive}
                variant="danger"
                size="sm"
                disabled={archiveLoading || !archiveReason.trim()}
              >
                {archiveLoading ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map Evidence Modal */}
      {evidence && (
        <MapEvidenceModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          evidenceId={evidence.id}
          evidenceTitle={evidence.title}
          evidenceCategory={evidence.category}
          onSuccess={fetchEvidenceMappings}
        />
      )}
    </div>
  );
};
