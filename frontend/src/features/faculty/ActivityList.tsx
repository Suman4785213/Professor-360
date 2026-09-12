import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Activity } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Send, UploadCloud, Layers, RefreshCw } from 'lucide-react';

interface ActivityListProps {
  onOpenUploadModal: () => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ onOpenUploadModal }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/activities/');
      setActivities(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForVerification = async (id: string) => {
    setSubmittingId(id);
    setMessage(null);
    try {
      const res = await apiClient.post(`/activities/${id}/submit/`, {
        comment: 'Submitted for verification',
      });
      setMessage(res.data.message || 'Submitted successfully!');
      fetchActivities();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to submit activity.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Activities & Certificates</h2>
          <p className="text-xs text-slate-500">
            Submit, track, and manage your academic & professional development records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchActivities} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={onOpenUploadModal} variant="primary" size="sm">
            <UploadCloud className="w-4 h-4 mr-1.5" /> Submit Activity
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl text-brand-800 text-xs font-semibold flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-brand-600 hover:text-brand-800">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="p-16 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No activities submitted yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Enter your FDP, workshop, conference, or certification details once and track it through verification.
            </p>
            <Button onClick={onOpenUploadModal} variant="primary">
              Submit Activity
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Activity & Certificate</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Organizer & Dates</th>
                  <th className="px-6 py-3.5">Academic Year</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act) => {
                  const canSubmit = ['DRAFT', 'REJECTED_INCHARGE', 'REJECTED_HOD', 'REJECTED_IQAC'].includes(
                    act.status
                  );

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{act.title}</div>
                        {act.certificate_number && (
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            Cert #: {act.certificate_number}
                          </span>
                        )}
                        {act.last_rejection_reason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 mt-1.5 font-medium">
                            <span className="font-bold">Correction requested by {act.last_rejected_by_role}:</span> {act.last_rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          {act.activity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="font-medium">{act.organizer || '—'}</div>
                        <div className="text-slate-400 mt-0.5">
                          {act.start_date ? act.start_date : ''}
                          {act.duration_days ? ` (${act.duration_days} days)` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                        {act.academic_year_name || '2024-25'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={act.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canSubmit ? (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={submittingId === act.id}
                            onClick={() => handleSubmitForVerification(act.id)}
                            className="bg-brand-600 hover:bg-brand-700 text-xs font-bold shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            {act.status === 'DRAFT' ? 'Submit to In-charge' : 'Resubmit'}
                          </Button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">
                            In Review
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
