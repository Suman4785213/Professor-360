import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { VerificationRecord } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { FileCheck, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface InchargeDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenReview: (record: VerificationRecord) => void;
}

export const InchargeDashboard: React.FC<InchargeDashboardProps> = ({ setActiveTab, onOpenReview }) => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [activeYear, setActiveYear] = useState<string>('2024-25');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const [verRes, facRes, ayRes] = await Promise.all([
        apiClient.get('/verifications/').catch(() => ({ data: [] })),
        apiClient.get('/auth/users/?role=FACULTY').catch(() => ({ data: [] })),
        apiClient.get('/academic-years/current/').catch(() => ({ data: null })),
      ]);
      setRecords(verRes.data.results || verRes.data || []);
      const facList = facRes.data.results || facRes.data || [];
      setFacultyCount(facList.length);
      if (ayRes.data?.name) {
        setActiveYear(ayRes.data.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pendingIncharge = records.filter((r) => r.current_status === 'PENDING_INCHARGE');
  const forwardedToHod = records.filter((r) =>
    ['INCHARGE_VERIFIED', 'PENDING_HOD', 'HOD_APPROVED', 'PENDING_IQAC', 'VERIFIED_EVIDENCE'].includes(r.current_status)
  );
  const rejectedByIncharge = records.filter((r) => r.current_status === 'REJECTED_INCHARGE');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30">
            Level 1 Verification
          </span>
          <h2 className="text-2xl font-black mt-2">Department In-charge Verification</h2>
          <p className="text-sm text-slate-300 mt-1">
            Department of {user?.department_name || 'Engineering'} • First-level certificate & activity data audit
          </p>
        </div>
        <Button
          onClick={() => setActiveTab('verification')}
          variant="primary"
          size="lg"
          className="bg-white text-blue-900 hover:bg-blue-50 shadow-lg font-bold"
        >
          <FileCheck className="w-5 h-5 mr-2" />
          Review Pending ({pendingIncharge.length})
        </Button>
      </div>

      {/* KPI Cards — Section 14 requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Department Faculty</p>
            <p className="text-2xl font-black text-slate-900">{facultyCount || 1}</p>
            <p className="text-[11px] text-slate-400">Assigned department members</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Academic Year</p>
            <p className="text-2xl font-black text-emerald-600">{activeYear}</p>
            <p className="text-[11px] text-slate-400">Current reporting cycle</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Waiting for In-charge</p>
            <p className="text-2xl font-black text-amber-600">{pendingIncharge.length}</p>
            <p className="text-[11px] text-slate-400">Awaiting document audit</p>
          </div>
        </div>
      </div>

      {/* Pending Items to Verify */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pending Verification Queue</h3>
            <p className="text-xs text-slate-500">
              Verify faculty submitted details against attached certificates before forwarding to HOD
            </p>
          </div>
          <button
            onClick={() => setActiveTab('verification')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Full Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading queue...</div>
        ) : pendingIncharge.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">All submissions up to date!</p>
            <p className="text-xs text-slate-400 mt-1">No pending faculty activities awaiting in-charge verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Faculty Member</th>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingIncharge.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.faculty_name}</div>
                      <div className="text-[11px] text-slate-500">{rec.activity_details?.department_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {rec.activity_details?.organizer || 'No organizer specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {rec.activity_details?.activity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={rec.current_status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onOpenReview(rec)}
                        className="bg-brand-600 hover:bg-brand-700 font-semibold"
                      >
                        Audit & Verify
                      </Button>
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
