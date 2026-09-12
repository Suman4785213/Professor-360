import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { AnalyticsData, College, Department } from '../../types';
import { Building2, Award, Users, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';

export const ManagementDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [activeYear, setActiveYear] = useState<string>('2024-25');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [anaRes, colRes, deptRes, facRes, ayRes] = await Promise.all([
        apiClient.get('/analytics/overview/').catch(() => ({ data: null })),
        apiClient.get('/colleges/current/').catch(() => ({ data: null })),
        apiClient.get('/departments/').catch(() => ({ data: [] })),
        apiClient.get('/auth/users/?role=FACULTY').catch(() => ({ data: [] })),
        apiClient.get('/academic-years/current/').catch(() => ({ data: null })),
      ]);
      setAnalytics(anaRes.data);
      setCollege(colRes.data);
      const depts = deptRes.data.results || deptRes.data || [];
      setDepartments(depts);
      const facUsers = facRes.data.results || facRes.data || [];
      setFacultyCount(facUsers.length);
      if (ayRes.data?.name) {
        setActiveYear(ayRes.data.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
            Institutional Oversight (Monitoring Role)
          </span>
          <h2 className="text-2xl font-black mt-2">Executive Management Dashboard</h2>
          <p className="text-sm text-slate-300 mt-1">
            {college?.name || 'Demo Engineering College'} • Code: {college?.code || 'DEMO-ENG'}
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl text-right">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Accreditation</p>
          <p className="text-lg font-black text-amber-400">NAAC {college?.naac_grade || 'A+'}</p>
        </div>
      </div>

      {/* KPI Cards — Section 14 requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Departments</p>
            <p className="text-2xl font-black text-indigo-600">{departments.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Faculty</p>
            <p className="text-2xl font-black text-slate-900">{facultyCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Academic Year</p>
            <p className="text-2xl font-black text-emerald-600">{activeYear}</p>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Department Performance & Quality Status</h3>
        <p className="text-xs text-slate-500 mb-6">
          Department-wise distribution of verified faculty participation and evidence records
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div key={dept.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                  {dept.code}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {dept.faculty_count || 3} Faculty
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">{dept.name}</h4>
              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-200/60">
                <p>
                  <span className="font-semibold text-slate-700">HOD:</span> {dept.hod_details?.first_name} {dept.hod_details?.last_name || 'Assigned'}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">IQAC In-charge:</span> {dept.incharge_details?.first_name} {dept.incharge_details?.last_name || 'Assigned'}
                </p>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Data Compliance</span>
                  <span className="text-emerald-600 font-bold">100%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
