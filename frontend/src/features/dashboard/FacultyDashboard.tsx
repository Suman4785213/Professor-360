import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { Activity } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { UploadCloud, Layers, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { MyWorkWidget } from '../workqueues/MyWorkWidget';

interface FacultyDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenUploadModal: () => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ setActiveTab, onOpenUploadModal }) => {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [profileCompletion, setProfileCompletion] = useState<number>(85);
  const [activeYear, setActiveYear] = useState<string>('2024-25');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyActivities();
  }, []);

  const fetchMyActivities = async () => {
    try {
      const [actRes, profRes, ayRes] = await Promise.all([
        apiClient.get('/activities/').catch(() => ({ data: [] })),
        apiClient.get('/auth/faculty/profile/').catch(() => ({ data: null })),
        apiClient.get('/academic-years/current/').catch(() => ({ data: null })),
      ]);
      setActivities(actRes.data.results || actRes.data || []);
      
      // Calculate profile completion percentage based on fields filled
      if (profRes.data) {
        const p = profRes.data;
        const fields = [p.employee_id, p.designation, p.phone, p.qualification, p.joining_date, p.bio];
        const filled = fields.filter((f) => !!f && String(f).trim().length > 0).length;
        const pct = Math.round((filled / fields.length) * 100);
        setProfileCompletion(pct);
      }
      if (ayRes.data?.name) {
        setActiveYear(ayRes.data.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const total = activities.length;
  const verified = activities.filter((a) => a.status === 'VERIFIED_EVIDENCE' || a.status === 'IQAC_VERIFIED').length;
  const pending = activities.filter((a) =>
    ['PENDING_INCHARGE', 'INCHARGE_VERIFIED', 'PENDING_HOD', 'HOD_APPROVED', 'PENDING_IQAC'].includes(a.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-brand-300 uppercase tracking-widest bg-brand-500/20 px-2.5 py-1 rounded-full border border-brand-500/30">
            Faculty Portal
          </span>
          <h2 className="text-2xl font-black mt-2">Welcome, {user?.full_name}</h2>
          <p className="text-sm text-slate-300 mt-1">
            {user?.department_name || 'Department'} • Employee ID: {user?.employee_id || 'FAC-001'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveTab('profile')}
            variant="outline"
            size="lg"
            className="border-white/30 text-white hover:bg-white/10 font-bold"
          >
            My Profile
          </Button>
          <Button
            onClick={onOpenUploadModal}
            variant="primary"
            size="lg"
            className="bg-white text-brand-900 hover:bg-brand-50 shadow-lg font-bold"
          >
            <UploadCloud className="w-5 h-5 mr-2" />
            Submit Activity
          </Button>
        </div>
      </div>

      {/* Phase 10 My Work & Operational Queue */}
      <MyWorkWidget />

      {/* KPI Cards — Section 14 requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Profile Completion</p>
            <p className="text-2xl font-black text-brand-600">{profileCompletion}%</p>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Current Academic Year</p>
            <p className="text-2xl font-black text-indigo-600">{activeYear}</p>
            <p className="text-[11px] text-slate-400">Active submission context</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Submissions</p>
            <p className="text-2xl font-black text-purple-600">{total}</p>
            <p className="text-[11px] text-slate-400">Entered once for reuse</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Verified Evidence</p>
            <p className="text-2xl font-black text-emerald-600">{verified}</p>
            <p className="text-[11px] text-slate-400">Institutional quality records</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Activity Submissions</h3>
            <p className="text-xs text-slate-500">Track verification status across In-charge, HOD, and IQAC levels</p>
          </div>
          <button
            onClick={() => setActiveTab('activities')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading submissions...</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No activities submitted yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Click below to submit your first certificate or training program</p>
            <Button onClick={onOpenUploadModal} variant="primary" size="sm">
              Submit Activity
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Organizer</th>
                  <th className="px-6 py-3.5">Academic Year</th>
                  <th className="px-6 py-3.5">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.slice(0, 5).map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{act.title}</div>
                      {act.certificate_number && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Cert: {act.certificate_number}
                        </div>
                      )}
                      {act.last_rejection_reason && (
                        <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded p-1 mt-1">
                          Correction needed: {act.last_rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {act.activity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{act.organizer || '—'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {act.academic_year_name || '2024-25'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={act.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
