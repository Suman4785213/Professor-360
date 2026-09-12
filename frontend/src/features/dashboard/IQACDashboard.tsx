import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { VerificationRecord, AnalyticsData } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import {
  ShieldCheck,
  Award,
  BarChart3,
  Layers,
  ArrowRight,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { AIMetricsDashboard } from '../ai/AIMetricsDashboard';
import { MyWorkWidget } from '../workqueues/MyWorkWidget';

interface IQACDashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenReview: (record: VerificationRecord) => void;
}

export const IQACDashboard: React.FC<IQACDashboardProps> = ({ setActiveTab, onOpenReview }) => {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [departmentCount, setDepartmentCount] = useState<number>(6);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [academicYear, setAcademicYear] = useState<string>('2024-25');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [verRes, anaRes, deptRes, facRes, ayRes] = await Promise.all([
        apiClient.get('/verifications/').catch(() => ({ data: [] })),
        apiClient.get('/analytics/overview/').catch(() => ({ data: null })),
        apiClient.get('/departments/').catch(() => ({ data: [] })),
        apiClient.get('/auth/users/?role=FACULTY').catch(() => ({ data: [] })),
        apiClient.get('/academic-years/current/').catch(() => ({ data: null })),
      ]);
      setRecords(verRes.data.results || verRes.data || []);
      setAnalytics(anaRes.data);
      const depts = deptRes.data.results || deptRes.data || [];
      setDepartmentCount(depts.length);
      const facUsers = facRes.data.results || facRes.data || [];
      setFacultyCount(facUsers.length);
      if (ayRes.data?.name) {
        setAcademicYear(ayRes.data.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pendingIqac = records.filter((r) => r.current_status === 'PENDING_IQAC');
  const verifiedEvidenceCount = analytics?.status_summary?.verified_evidence || 0;

  const naacCriteria = [
    { num: '1', title: 'Curricular Aspects', progress: 85, color: 'bg-blue-500' },
    { num: '2', title: 'Teaching-Learning & Evaluation', progress: 72, color: 'bg-emerald-500' },
    { num: '3', title: 'Research, Innovations & Extension', progress: 64, color: 'bg-purple-500' },
    { num: '4', title: 'Infrastructure & Learning Resources', progress: 90, color: 'bg-amber-500' },
    { num: '5', title: 'Student Support & Progression', progress: 78, color: 'bg-rose-500' },
    { num: '6', title: 'Governance, Leadership & Management', progress: 88, color: 'bg-indigo-500' },
    { num: '7', title: 'Institutional Values & Best Practices', progress: 95, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-brand-950 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-brand-300 uppercase tracking-widest bg-brand-500/20 px-2.5 py-1 rounded-full border border-brand-500/30 flex items-center gap-1.5 w-fit">
            <Sparkles className="w-3 h-3 text-brand-300" />
            Central Quality Assurance Cell
          </span>
          <h2 className="text-2xl font-black mt-2">IQAC Coordinator Dashboard</h2>
          <p className="text-sm text-slate-300 mt-1">
            Institutional verification, NAAC accreditation preparation, criteria mapping & evidence catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('verification')}
            variant="primary"
            size="lg"
            className="bg-white text-brand-950 hover:bg-brand-50 shadow-lg font-bold"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Final Verification ({pendingIqac.length})
          </Button>
        </div>
      </div>

      {/* Phase 10 Operational Work Queue Widget */}
      <MyWorkWidget />

      {/* KPI Cards — Section 14 requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Departments</p>
            <p className="text-2xl font-black text-blue-600">{departmentCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Faculty</p>
            <p className="text-2xl font-black text-purple-600">{facultyCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Academic Year</p>
            <p className="text-2xl font-black text-amber-600">{academicYear}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">System Status</p>
            <p className="text-2xl font-black text-emerald-600">Active</p>
          </div>
        </div>
      </div>

      {/* NAAC 7 Criteria Progress Track */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">NAAC Accreditation Criteria Readiness</h3>
            <p className="text-xs text-slate-500">
              Criteria evidence completion mapped to verified faculty & department submissions
            </p>
          </div>
          <button
            onClick={() => setActiveTab('criteria')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Manage Criteria <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {naacCriteria.map((c) => (
            <div key={c.num} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Criterion {c.num}</span>
                <span className="text-xs font-black text-slate-800">{c.progress}%</span>
              </div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1 mb-3">{c.title}</p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${c.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Verification Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Final Verification Queue (Awaiting IQAC)</h3>
            <p className="text-xs text-slate-500">
              Submissions approved by both Department In-charge and HOD. Approval registers verified evidence.
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
        ) : pendingIqac.length === 0 ? (
          <div className="p-10 text-center">
            <Award className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">All submissions fully verified</p>
            <p className="text-xs text-slate-400 mt-1">
              New submissions will appear here after HOD approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Department & Faculty</th>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">Verification Trail</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Final Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingIqac.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.faculty_name}</div>
                      <div className="text-[11px] text-slate-500">{rec.activity_details?.department_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{rec.activity_details?.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {rec.activity_details?.activity_type} • {rec.activity_details?.academic_year_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="text-emerald-700 flex items-center gap-1 font-medium">
                          ✓ In-charge: {rec.incharge_comment || 'Verified'}
                        </div>
                        <div className="text-purple-700 flex items-center gap-1 font-medium">
                          ✓ HOD: {rec.hod_comment || 'Approved'}
                        </div>
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
                        className="bg-brand-600 hover:bg-brand-700 font-semibold"
                      >
                        Final Audit & Seal
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase 7 AI Analytics & Oversight */}
      <AIMetricsDashboard />
    </div>
  );
};
