import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Activity, Document, VerificationRecord } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DocumentPreviewViewer } from '../../components/ui/DocumentPreviewViewer';
import { VerificationTimeline } from '../../components/ui/VerificationTimeline';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Eye,
  ArrowLeft,
  Calendar,
  Building,
  User,
  Send,
  ShieldCheck,
  Award,
  Hash,
} from 'lucide-react';

export const SubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [verificationRecord, setVerificationRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitComment, setResubmitComment] = useState('');
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [actRes, verRes] = await Promise.all([
        apiClient.get(`/activities/${id}/`),
        apiClient.get(`/verifications/?activity=${id}`).catch(() => ({ data: { results: [] } })),
      ]);
      setActivity(actRes.data);
      const recs = verRes.data.results || verRes.data || [];
      if (recs.length > 0) setVerificationRecord(recs[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/activities/${id}/submit/`, {
        comment: resubmitComment || 'Resubmitted with updated details.',
      });
      setIsResubmitOpen(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading submission details...</div>;
  }

  if (!activity) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-bold text-slate-700">Submission not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/faculty/submissions')} className="mt-4">
          Back to Submissions
        </Button>
      </div>
    );
  }

  // Verification timeline progression logic
  const status = activity.status;
  const isSubmitted = status !== 'DRAFT';
  const isInchargePassed = [
    'INCHARGE_VERIFIED',
    'PENDING_HOD',
    'HOD_APPROVED',
    'PENDING_IQAC',
    'IQAC_VERIFIED',
    'VERIFIED_EVIDENCE',
  ].includes(status);
  const isInchargePending = status === 'PENDING_INCHARGE';
  const isInchargeRejected = status === 'RETURNED_TO_FACULTY' || status === 'REJECTED_INCHARGE';

  const isHodPassed = [
    'HOD_APPROVED',
    'PENDING_IQAC',
    'IQAC_VERIFIED',
    'VERIFIED_EVIDENCE',
  ].includes(status);
  const isHodPending = status === 'PENDING_HOD';
  const isHodRejected = status === 'RETURNED_TO_INCHARGE' || status === 'REJECTED_HOD';

  const isIqacPassed = ['IQAC_VERIFIED', 'VERIFIED_EVIDENCE'].includes(status);
  const isIqacPending = status === 'PENDING_IQAC';
  const isIqacRejected = status === 'REJECTED_IQAC';

  const isEvidenceSealed = status === 'VERIFIED_EVIDENCE';

  const primaryDoc = activity.documents?.[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/faculty/submissions')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Submissions
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900">{activity.title}</h2>
            <StatusBadge status={activity.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Category: <span className="font-semibold text-slate-700">{activity.category_name || activity.activity_type}</span> • Academic Year: <span className="font-semibold text-slate-700">{activity.academic_year_name}</span>
          </p>
        </div>

        {activity.is_editable && (
          <Button variant="primary" size="sm" onClick={() => setIsResubmitOpen(true)}>
            <Send className="w-4 h-4 mr-1.5" /> Submit for Verification
          </Button>
        )}
      </div>

      {/* Rejection / Correction Banner */}
      {(activity.last_rejection_reason || isInchargeRejected || isHodRejected || isIqacRejected) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-rose-900 text-sm">Action Required: Correction Requested</p>
            <p className="text-rose-700 mt-1 leading-relaxed">
              <span className="font-semibold">Reviewer Remarks: </span>
              "{activity.last_rejection_reason || 'Certificate date or metadata does not match activity submission details.'}"
            </p>
            {activity.last_rejected_by_role && (
              <p className="text-rose-500 text-[11px] mt-1">
                Returned by: {activity.last_rejected_by_role.replace('_', ' ')} on {activity.last_rejected_at ? new Date(activity.last_rejected_at).toLocaleString() : 'recently'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visual Verification Timeline */}
      <VerificationTimeline
        status={activity.status}
        isVerified={activity.is_verified}
        rejectionReason={activity.last_rejection_reason}
        submittedAt={activity.created_at}
        verifiedAt={verificationRecord?.iqac_verified_at || activity.updated_at}
        inchargeRemarks={verificationRecord?.incharge_comment}
        hodRemarks={verificationRecord?.hod_comment}
        iqacRemarks={verificationRecord?.iqac_comment}
      />

      {/* Main Details & Certificate Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Metadata Details */}
        <div className="lg:col-span-6 space-y-6">
          <Card title="Activity Dossier">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Activity Category</span>
                <span className="font-bold text-slate-900">{activity.category_name || activity.activity_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Organizing Body</span>
                <span className="font-semibold text-slate-800">{activity.organizer || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Location / Venue</span>
                <span className="font-semibold text-slate-800">{activity.location || activity.venue || 'Campus'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Dates & Duration</span>
                <span className="font-semibold text-slate-800">
                  {activity.start_date || 'N/A'} to {activity.end_date || 'N/A'} ({activity.duration || `${activity.duration_days || 0} days`})
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Certificate Credential ID</span>
                <span className="font-mono font-bold text-brand-700">{activity.certificate_number || 'N/A'}</span>
              </div>
              <div className="py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Description</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {activity.description || 'No description provided.'}
                </p>
              </div>
              {activity.additional_remarks && (
                <div className="py-2">
                  <span className="text-slate-500 font-medium block mb-1">Additional Remarks</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {activity.additional_remarks}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Audit Verification Log History */}
          {verificationRecord?.logs && verificationRecord.logs.length > 0 && (
            <Card title="Verification Audit Trail">
              <div className="space-y-3">
                {verificationRecord.logs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900">{log.action.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      By: <span className="font-semibold text-slate-700">{log.actor_name}</span> ({log.role.replace('_', ' ')})
                    </p>
                    {log.comment && (
                      <p className="text-slate-700 mt-1 italic bg-white p-2 rounded-lg border border-slate-200">
                        "{log.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Certificate & Document Preview */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-600" /> Supporting Certificate
          </h3>
          <DocumentPreviewViewer document={primaryDoc} />
        </div>
      </div>

      {/* Resubmit Modal */}
      {isResubmitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in-50">
            <h3 className="text-base font-bold text-slate-900 mb-1">Submit for Verification</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your submission will be routed to Department In-charge for first-level audit.
            </p>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Submission Remarks (Optional)</label>
              <textarea
                rows={3}
                placeholder="Notes or clarifications regarding your uploaded certificate..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                value={resubmitComment}
                onChange={(e) => setResubmitComment(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setIsResubmitOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleResubmit} disabled={submitting}>
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
