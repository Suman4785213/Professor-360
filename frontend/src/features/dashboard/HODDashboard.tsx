import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { VerificationRecord, Department } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Users, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

interface HODDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenReview: (record: VerificationRecord) => void;
}

export const HODDashboard: React.FC<HODDashboardProps> = ({ setActiveTab, onOpenReview }) => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [activeYear, setActiveYear] = useState<string>('2024-25');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [verRes, deptRes, facRes, ayRes] = await Promise.all([
        apiClient.get('/verifications/').catch(() => ({ data: [] })),
        apiClient.get('/departments/').catch(() => ({ data: [] })),
        apiClient.get('/auth/users/?role=FACULTY').catch(() => ({ data: [] })),
        apiClient.get('/academic-years/current/').catch(() => ({ data: null })),
      ]);
      setRecords(verRes.data.results || verRes.data || []);
      const myDept = (deptRes.data.results || deptRes.data || []).find(
        (d: any) => d.id === user?.department || d.name === user?.department_name
      );
      if (myDept) setDepartment(myDept);

      const facList = facRes.data.results || facRes.data || [];
      // Tenant and department isolation are enforced by backend
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

  const pendingHod = records.filter((r) => r.current_status === 'PENDING_HOD');
  const approvedByHod = records.filter((r) =>
    ['HOD_APPROVED', 'PENDING_IQAC', 'IQAC_VERIFIED', 'VERIFIED_EVIDENCE'].includes(r.current_status)
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/30">
            Level 2 Approval
          </span>
          <h2 className="text-2xl font-black mt-2">Head of Department (HOD) Portal</h2>
          <p className="text-sm text-slate-300 mt-1">
            Department of {user?.department_name || 'Engineering'} • Review In-charge verified submissions
          </p>
        </div>
        <Button
          onClick={() => setActiveTab('verification')}
          variant="primary"
          size="lg"
          className="bg-white text-purple-950 hover:bg-purple-50 shadow-lg font-bold"
        >
          <ShieldCheck className="w-5 h-5 mr-2" />
          Pending Approvals ({pendingHod.length})
        </Button>
      </div>

      {/* KPI Cards — Section 14 requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Department Faculty</p>
            <p className="text-2xl font-black text-slate-900">{facultyCount || department?.faculty_count || 1}</p>
            <p className="text-[11px] text-slate-400">Assigned teaching faculty</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Academic Year</p>
            <p className="text-2xl font-black text-emerald-600">{activeYear}</p>
            <p className="text-[11px] text-slate-400">Current reporting cycle</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Awaiting HOD Approval</p>
            <p className="text-2xl font-black text-purple-600">{pendingHod.length}</p>
            <p className="text-[11px] text-slate-400">Passed In-charge verification</p>
          </div>
        </div>
      </div>

      {/* Pending HOD Approvals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">In-charge Verified Submissions (Awaiting HOD)</h3>
            <p className="text-xs text-slate-500">
              Only submissions that have successfully passed Department In-charge verification appear here
            </p>
          </div>
          <button
            onClick={() => setActiveTab('verification')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Review All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading submissions...</div>
        ) : pendingHod.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No submissions waiting for HOD approval</p>
            <p className="text-xs text-slate-400 mt-1">
              Any activities verified by the Department In-charge will appear here for your approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Faculty</th>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">In-charge Audit Note</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">HOD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingHod.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.faculty_name}</div>
                      <div className="text-[11px] text-slate-500">{rec.activity_details?.academic_year_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {rec.activity_details?.activity_type} • {rec.activity_details?.organizer}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 italic bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                        "{rec.incharge_comment || 'Verified by Dept In-charge.'}"
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={rec.current_status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onOpenReview(rec)}
                        className="bg-purple-700 hover:bg-purple-800 font-semibold"
                      >
                        Approve / Reject
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
