import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { DataRequest, Department, AcademicYear } from '../../types';
import { X, Send, AlertCircle, Calendar, Building2, User, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface DataRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  metricId?: string;
  metricNumber?: string;
  academicYearId?: string;
  existingRequest?: DataRequest | null;
  mode?: 'create' | 'submit' | 'review';
}

export const DataRequestModal: React.FC<DataRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metricId = '',
  metricNumber = '',
  academicYearId = '',
  existingRequest = null,
  mode = 'create',
}) => {
  const { user } = useAuthStore();
  const isIQAC = ['SUPER_ADMIN', 'IQAC'].includes(user?.role || '');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  const [submissionNotes, setSubmissionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (existingRequest) {
        setTitle(existingRequest.title);
        setDescription(existingRequest.description);
        setDepartmentId(existingRequest.department || '');
        setAssignedToId(existingRequest.assigned_to || '');
        setDueDate(existingRequest.due_date || '');
        setPriority(existingRequest.priority);
        setSubmissionNotes(existingRequest.submission_notes || '');
      } else {
        setTitle(`Request Documentation for Metric ${metricNumber}`);
        setDescription('');
        setDepartmentId('');
        setAssignedToId('');
        setDueDate('');
        setPriority('MEDIUM');
        setSubmissionNotes('');
      }
      setError(null);
    }
  }, [isOpen, existingRequest, metricNumber]);

  const loadDependencies = async () => {
    try {
      const [deptRes, usersRes] = await Promise.all([
        apiClient.get('/departments/'),
        apiClient.get('/auth/users/?role=FACULTY'),
      ]);
      setDepartments(deptRes.data.results || deptRes.data || []);
      const uList = usersRes.data.results || usersRes.data || [];
      setFacultyUsers(
        uList.map((u: any) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          email: u.email,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the data request.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/compliance/data-requests/', {
        metric: metricId || existingRequest?.metric,
        academic_year: academicYearId || existingRequest?.academic_year,
        title,
        description,
        department: departmentId || null,
        assigned_to: assignedToId || null,
        due_date: dueDate || null,
        priority,
        workspace_type: 'AQAR',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create data request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionNotes.trim()) {
      setError('Please provide submission details or attached notes.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/compliance/data-requests/${existingRequest?.id}/submit/`, {
        notes: submissionNotes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      setError('Please provide a reason for returning the request.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/compliance/data-requests/${existingRequest?.id}/review/`, {
        decision,
        reason: rejectionReason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              {mode === 'create' && `Create Data Request — Metric ${metricNumber}`}
              {mode === 'submit' && `Submit Data Response — ${existingRequest?.title}`}
              {mode === 'review' && `Review Data Request — ${existingRequest?.title}`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'create' && 'Request missing evidence or qualitative figures directly from department faculty.'}
              {mode === 'submit' && 'Provide documentation and notes to fulfill IQAC preparation benchmarks.'}
              {mode === 'review' && 'Verify submitted departmental evidence or request further revisions.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'create' && (
            <form id="create-data-request-form" onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Request Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Request 5 FDP Certificates from CSE faculty"
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Target Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">All Departments (College-wide)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Assign to Faculty (Optional)
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Department In-charge / Open</option>
                    {facultyUsers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Accreditation Critical)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Instructions & Required Evidence
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify exact documentation required, e.g. minimum 5-day duration certificates approved by AICTE..."
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </form>
          )}

          {mode === 'submit' && (
            <form id="submit-response-form" onSubmit={handleSubmitResponse} className="space-y-4">
              <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructions</span>
                <p className="text-xs text-slate-200">{existingRequest?.description || 'No detailed instructions.'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Submission Notes / Document References <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Describe the uploaded evidence, participant details, and relevant activity links..."
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </form>
          )}

          {mode === 'review' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Submission</span>
                  <p className="text-xs text-slate-200 mt-1">{existingRequest?.submission_notes || 'No notes submitted.'}</p>
                </div>
                {existingRequest?.response_evidence_title && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attached Evidence: {existingRequest.response_evidence_title}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Remarks / Return Rationale (Required if Returning)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify deficiencies if returning, or verification remarks..."
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {mode === 'create' && (
            <button
              form="create-data-request-form"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Issuing...' : 'Issue Data Request'}
            </button>
          )}

          {mode === 'submit' && (
            <button
              form="submit-response-form"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Submitting...' : 'Submit to IQAC'}
            </button>
          )}

          {mode === 'review' && isIQAC && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleReview('REJECTED')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Return to Department
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleReview('VERIFIED')}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verify & Map Evidence
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
