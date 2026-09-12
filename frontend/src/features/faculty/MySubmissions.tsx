import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Activity, ActivityStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Plus, Eye, Edit, Send, Clock, RefreshCw } from 'lucide-react';

export function getStageForStatus(status: ActivityStatus): { stage: string; responsible: string } {
  switch (status) {
    case 'DRAFT':
      return { stage: 'Faculty Draft', responsible: 'Faculty (You)' };
    case 'PENDING_INCHARGE':
      return { stage: 'Level 1 Verification', responsible: 'Dept In-charge' };
    case 'INCHARGE_VERIFIED':
    case 'PENDING_HOD':
      return { stage: 'Level 2 Approval', responsible: 'Head of Dept (HOD)' };
    case 'HOD_APPROVED':
    case 'PENDING_IQAC':
      return { stage: 'Level 3 Final Verification', responsible: 'Central IQAC' };
    case 'IQAC_VERIFIED':
    case 'VERIFIED_EVIDENCE':
      return { stage: 'Verified Evidence', responsible: 'Completed' };
    case 'RETURNED_TO_FACULTY':
    case 'REJECTED_INCHARGE':
      return { stage: 'Returned for Correction', responsible: 'Faculty (You)' };
    case 'RETURNED_TO_INCHARGE':
    case 'REJECTED_HOD':
      return { stage: 'HOD Clarification', responsible: 'Dept In-charge' };
    case 'REJECTED_IQAC':
      return { stage: 'IQAC Clarification', responsible: 'Department Reviewer' };
    default:
      return { stage: 'Processing', responsible: 'Assigned Reviewer' };
  }
}

export const MySubmissions: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
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

  const handleQuickSubmit = async (id: string) => {
    try {
      await apiClient.post(`/activities/${id}/submit/`, { comment: 'Submitted for verification.' });
      fetchSubmissions();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Activity Submissions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-level verification progression across In-charge, HOD, and Central IQAC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSubmissions}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/faculty/activities/new')}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Activity
          </Button>
        </div>
      </div>

      <Card bodyClassName="p-0">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading submissions...</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-slate-700">No submissions found</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">You haven't submitted any activities yet.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/faculty/activities/new')}>
              Create Your First Activity
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Activity Title</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Academic Year</th>
                  <th className="px-5 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5">Current Stage & Responsibility</th>
                  <th className="px-5 py-3.5">Last Updated</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((a) => {
                  const { stage, responsible } = getStageForStatus(a.status);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 max-w-xs truncate">
                        <span title={a.title}>{a.title}</span>
                        {a.organizer && (
                          <span className="block text-[11px] text-slate-400 font-normal truncate">
                            {a.organizer}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {a.category_name || a.activity_type || 'General'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {a.academic_year_name || '2024-25'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 block">{stage}</span>
                        <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {responsible}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(a.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/faculty/submissions/${a.id}`)}
                            title="View submission details & verification timeline"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          {a.is_editable && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleQuickSubmit(a.id)}
                              title="Submit for verification"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" /> Submit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
