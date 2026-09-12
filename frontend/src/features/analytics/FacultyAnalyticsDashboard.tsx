import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { FacultyParticipationData, AcademicYear } from '../../types';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { KPICard } from './KPICard';
import { UserCheck, Award, FileCheck, BookOpen, Clock, Loader2, BarChart2, Shield } from 'lucide-react';

export const FacultyAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<FacultyParticipationData | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadFacultyAnalytics();
  }, [selectedYearId]);

  const loadAcademicYears = async () => {
    try {
      const res = await apiClient.get('/academic-years/');
      const years: AcademicYear[] = res.data.results || res.data || [];
      setAcademicYears(years);
      const cur = years.find((y) => y.is_current);
      if (cur) setSelectedYearId(cur.id);
    } catch (e) {
      console.error('Error loading academic years', e);
    }
  };

  const loadFacultyAnalytics = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academic_year: selectedYearId } : {};
      const res = await apiClient.get('/analytics/faculty-participation/', { params });
      setData(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading faculty analytics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading Faculty Output Analytics...
          </p>
        </div>
      </div>
    );
  }

  const { total_activities, verified_activities, pending_activities, categories_breakdown, faculty_records } =
    data || {
      total_activities: 0,
      verified_activities: 0,
      pending_activities: 0,
      categories_breakdown: {},
      faculty_records: [],
    };

  const verificationRate =
    total_activities > 0 ? (verified_activities / total_activities) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <UserCheck className="w-7 h-7 text-emerald-400" />
            <span>Faculty Output & Accreditation Contributions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal performance metrics, verified evidence records, and category breakdown
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-2.5 text-xs text-slate-300">
          <Shield className="w-4 h-4 text-brand-400" />
          <span>Role-Scoped Privacy: Only your authorized academic activities are displayed.</span>
        </div>
      </div>

      <AnalyticsFilterBar
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        onSelectYear={setSelectedYearId}
        loading={loading}
        onRefresh={loadFacultyAnalytics}
        lastUpdated={lastUpdated}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Activities Logged"
          value={total_activities}
          subtitle="Submitted academic records"
          icon={BookOpen}
          colorScheme="blue"
        />
        <KPICard
          title="Verified Evidence Items"
          value={verified_activities}
          subtitle="Sealed in institutional repository"
          icon={FileCheck}
          colorScheme="emerald"
        />
        <KPICard
          title="In Verification Pipeline"
          value={pending_activities}
          subtitle="Pending in-charge/HOD/IQAC"
          icon={Clock}
          colorScheme="amber"
        />
        <KPICard
          title="Verification Success Rate"
          value={`${verificationRate.toFixed(1)}%`}
          subtitle="Approved submission ratio"
          icon={Award}
          colorScheme="purple"
        />
      </div>

      {/* Category Breakdown & Records Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-brand-400" />
            <h3 className="text-sm font-bold text-white">Activity Category Breakdown</h3>
          </div>

          <div className="space-y-3 pt-2">
            {Object.keys(categories_breakdown).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No categorized activities recorded.</p>
            ) : (
              Object.entries(categories_breakdown).map(([cat, count]) => {
                const pct = total_activities > 0 ? (count / total_activities) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{cat}</span>
                      <span className="text-white">
                        {count} <span className="text-slate-500">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Faculty Summary / Records */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Faculty Output Summary</h3>
            </div>
            <span className="text-xs text-slate-400">{faculty_records.length} Member Profile(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="pb-3 pr-4">Faculty Member</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4 text-center">Total Activities</th>
                  <th className="pb-3 pr-4 text-center">Verified Evidence</th>
                  <th className="pb-3 text-right">Approval Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {faculty_records.map((fac) => {
                  const rate =
                    fac.activity_count > 0 ? (fac.verified_count / fac.activity_count) * 100 : 0;
                  return (
                    <tr key={fac.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-bold text-white">{fac.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {fac.employee_id} • {fac.designation}
                        </p>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-300">{fac.department}</td>
                      <td className="py-3.5 pr-4 text-center font-medium">{fac.activity_count}</td>
                      <td className="py-3.5 pr-4 text-center font-bold text-emerald-400">
                        {fac.verified_count}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-white">
                        {rate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
