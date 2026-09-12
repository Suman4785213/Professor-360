import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { VerificationRecord, Activity } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DocumentPreviewViewer } from '../../components/ui/DocumentPreviewViewer';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Calendar,
  Building,
  User,
  Award,
  Layers,
  Clock,
  Send,
  RotateCcw,
} from 'lucide-react';

interface VerificationReviewDetailProps {
  recordId?: string;
  onBack?: () => void;
  onDecisionComplete?: () => void;
}

export const VerificationReviewDetail: React.FC<VerificationReviewDetailProps> = ({
  recordId: propRecordId,
  onBack,
  onDecisionComplete,
}) => {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const recordId = propRecordId || routeId;

  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Decision states
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (recordId) {
      fetchRecordDetails();
    }
  }, [recordId]);

  const fetchRecordDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/verifications/${recordId}/`);
      setRecord(res.data);
    } catch (err: any) {
      console.error('Failed to load verification record:', err);
      setError(
        err.response?.status === 404
          ? 'Verification record not found or does not belong to your department/institution.'
          : err.response?.status === 403
          ? 'Access denied: You do not have permission to review this department record.'
          : 'Failed to load verification dossier.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      const rolePrefix =
        user?.role === 'HOD' ? '/hod' : user?.role === 'DEPARTMENT_INCHARGE' ? '/incharge' : '/iqac';
      navigate(`${rolePrefix}/verification`);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!record) return;
    setActionError(null);

    if (decision === 'REJECT' && !comment.trim()) {
      setActionError('A specific reason is strictly required when returning or rejecting a submission.');
      return;
    }

    setSubmitting(true);
    try {
      let endpoint = '';
      if (user?.role === 'DEPARTMENT_INCHARGE') {
        endpoint = `/verifications/${record.id}/incharge-verify/`;
      } else if (user?.role === 'HOD') {
        endpoint = `/verifications/${record.id}/hod-verify/`;
      } else if (user?.role === 'IQAC') {
        endpoint = `/verifications/${record.id}/iqac-verify/`;
      } else {
        throw new Error('Your user role is not authorized to execute verification decisions.');
      }

      const res = await apiClient.post(endpoint, {
        decision,
        comment: comment.trim(),
      });

      setActionSuccess(res.data.message || 'Decision recorded and audit trail sealed.');
      setComment('');

      // Refresh record
      await fetchRecordDetails();

      if (onDecisionComplete) {
        onDecisionComplete();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.message || 'Failed to submit verification decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Verification Dossier & Certificate...
        </p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Verification Record Unavailable</h3>
        <p className="text-xs text-slate-500">{error || 'Record could not be found.'}</p>
        <Button variant="outline" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Queue
        </Button>
      </div>
    );
  }

  const act = record.activity_details;
  const role = user?.role;
  const status = record.current_status;

  const canAct =
    (role === 'DEPARTMENT_INCHARGE' && status === 'PENDING_INCHARGE') ||
    (role === 'HOD' && status === 'PENDING_HOD') ||
    (role === 'IQAC' && status === 'PENDING_IQAC');

  const primaryDoc = act?.documents && act.documents.length > 0 ? act.documents[0] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={handleGoBack}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Verification Queue
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-slate-900">{act?.title}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty: <span className="font-bold text-slate-800">{act?.faculty_name}</span> ({act?.department_name}) • Academic Year: <span className="font-bold text-slate-800">{act?.academic_year_name}</span>
          </p>
        </div>

        {canAct && (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 px-3.5 py-2 rounded-2xl">
            <Clock className="w-4 h-4 text-brand-600 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-brand-900">
              Awaiting your review ({role?.replace('_', ' ')})
            </span>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main split grid: Metadata & History on left, Certificate & Decision on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 cols): Metadata Dossier & Audit Timeline */}
        <div className="lg:col-span-6 space-y-6">
          {/* Submission Dossier Card */}
          <Card title="Activity Information Dossier">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Activity Category</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {act?.category_name || act?.activity_type}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Organizing Body</span>
                <span className="font-semibold text-slate-800">{act?.organizer || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Location / Venue</span>
                <span className="font-semibold text-slate-800">{act?.location || act?.venue || 'Campus'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Dates & Duration</span>
                <span className="font-semibold text-slate-800">
                  {act?.start_date || 'N/A'} to {act?.end_date || 'N/A'} ({act?.duration || `${act?.duration_days || 0} days`})
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Mode</span>
                <span className="font-semibold text-slate-800">
                  {act?.is_online ? '🌐 Online / Virtual' : '🏛 In-Person / Physical'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Certificate Credential ID</span>
                <span className="font-mono font-bold text-brand-700">{act?.certificate_number || 'None'}</span>
              </div>
              <div className="py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Description</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {act?.description || 'No description provided.'}
                </p>
              </div>
              {act?.additional_remarks && (
                <div className="py-2">
                  <span className="text-slate-500 font-medium block mb-1">Faculty Remarks</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {act.additional_remarks}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Audit Verification Log History */}
          <Card
            title="Institutional Audit Trail"
            subtitle="Immutable step-by-step verification log"
          >
            {record.logs?.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No previous verification actions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {record.logs?.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{log.action.replace('_', ' ')}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                          {log.role.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      By: <span className="font-semibold text-slate-700">{log.actor_name}</span>
                    </p>
                    {log.comment && (
                      <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                        "{log.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (6 cols): Certificate Preview & Decision Box */}
        <div className="lg:col-span-6 space-y-6">
          {/* Certificate Preview Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600" /> Supporting Evidence Document
            </h3>
            <DocumentPreviewViewer document={primaryDoc} />
          </div>

          {/* Verification Decision Form (if user is the designated reviewer) */}
          {canAct ? (
            <Card
              title={`Verification Decision — ${role?.replace('_', ' ')}`}
              subtitle="Record your verification verdict and audit note"
            >
              <div className="space-y-4">
                {/* Decision Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Verdict</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecision('APPROVE')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        decision === 'APPROVE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {role === 'DEPARTMENT_INCHARGE'
                        ? 'Approve & Forward to HOD'
                        : role === 'HOD'
                        ? 'Approve & Forward to IQAC'
                        : 'Final Approve & Seal Evidence'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('REJECT')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        decision === 'REJECT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      {role === 'DEPARTMENT_INCHARGE'
                        ? 'Return to Faculty for Correction'
                        : role === 'HOD'
                        ? 'Return to In-charge'
                        : 'Reject / Return'}
                    </button>
                  </div>
                </div>

                {decision === 'REJECT' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Mandatory Deficiency Notice:</span> Clearly state the exact reasons or missing details so the previous stage can rectify and resubmit.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Audit Comment / Note {decision === 'REJECT' ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      decision === 'APPROVE'
                        ? 'e.g. Verified certificate credentials with organizing entity register.'
                        : 'e.g. Uploaded document is blurry / Date on certificate does not match entered dates.'
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                  />
                </div>

                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                    {actionError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleGoBack}>
                    Cancel
                  </Button>
                  <Button
                    variant={decision === 'APPROVE' ? 'success' : 'danger'}
                    size="sm"
                    isLoading={submitting}
                    onClick={handleDecisionSubmit}
                    className="font-bold"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {decision === 'APPROVE' ? 'Confirm Approval' : 'Confirm Return'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Review Status">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-slate-800">
                    Status: {status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {status === 'VERIFIED_EVIDENCE'
                    ? 'This activity has achieved final Level 3 IQAC verification and is permanently sealed as institutional evidence.'
                    : `This record is currently pending at the ${status.replace('PENDING_', '')} stage.`}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
