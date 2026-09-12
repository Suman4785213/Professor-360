import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { DepartmentBenchmarkItem, FacultyParticipationData, AcademicYear } from '../../types';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { KPICard } from './KPICard';
import { Building2, Users, FileCheck, Clock, Award, Loader2, Trophy, BarChart2 } from 'lucide-react';

export const DepartmentAnalyticsDashboard: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentBenchmarkItem[]>([]);
  const [facultyData, setFacultyData] = useState<FacultyParticipationData | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadDepartmentAnalytics();
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

  const loadDepartmentAnalytics = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academic_year: selectedYearId } : {};
      const [deptRes, facRes] = await Promise.all([
        apiClient.get('/analytics/department-comparison/', { params }),
        apiClient.get('/analytics/faculty-participation/', { params }),
      ]);

      setDepartments(deptRes.data || []);
      setFacultyData(facRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading department analytics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-brand-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading Department Analytics & Benchmarks...
          </p>
        </div>
      </div>
    );
  }

  const totalVerified = departments.reduce((acc, d) => acc + d.verified_evidence, 0);
  const totalFaculty = departments.reduce((acc, d) => acc + d.faculty_count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <Building2 className="w-7 h-7 text-indigo-400" />
          <span>Department Performance & Benchmarking</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Comparative departmental metrics, faculty output ratio, and submission turnaround analysis
        </p>
      </div>

      <AnalyticsFilterBar
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        onSelectYear={setSelectedYearId}
        loading={loading}
        onRefresh={loadDepartmentAnalytics}
        lastUpdated={lastUpdated}
      />

      {/* Top High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Departments Active"
          value={departments.length}
          subtitle="Contributing departments"
          icon={Building2}
          colorScheme="indigo"
        />
        <KPICard
          title="Total Faculty Members"
          value={totalFaculty}
          subtitle="Institutional faculty body"
          icon={Users}
          colorScheme="blue"
        />
        <KPICard
          title="Total Verified Evidence"
          value={totalVerified}
          subtitle="Accreditation-grade artifacts"
          icon={FileCheck}
          colorScheme="emerald"
        />
        <KPICard
          title="Department Average Readiness"
          value={`${(
            departments.reduce((acc, d) => acc + d.aqar_readiness_pct, 0) /
            Math.max(1, departments.length)
          ).toFixed(1)}%`}
          subtitle="AQAR metric contribution"
          icon={Award}
          colorScheme="purple"
        />
      </div>

      {/* Department Comparison Table */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Department Comparative Benchmarking Matrix</h3>
          </div>
          <span className="text-xs text-slate-400">{departments.length} Departments Analyzed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4 text-center">Faculty</th>
                <th className="pb-3 pr-4 text-center">Activities Logged</th>
                <th className="pb-3 pr-4 text-center">Verified Evidence</th>
                <th className="pb-3 pr-4 text-center">Pending Queues</th>
                <th className="pb-3 pr-4 text-center">Evidence / Faculty</th>
                <th className="pb-3 pr-4 text-center">Avg Turnaround</th>
                <th className="pb-3 text-right">AQAR Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {departments.map((dept, idx) => (
                <tr key={dept.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 pr-4 font-semibold text-white flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">#{idx + 1}</span>
                    <div>
                      <span className="text-slate-100 block">{dept.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{dept.code}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-center">{dept.faculty_count}</td>
                  <td className="py-3.5 pr-4 text-center font-medium">{dept.total_activities}</td>
                  <td className="py-3.5 pr-4 text-center font-bold text-emerald-400">
                    {dept.verified_evidence}
                  </td>
                  <td className="py-3.5 pr-4 text-center">
                    {dept.pending_submissions > 0 ? (
                      <span className="font-semibold text-amber-400">{dept.pending_submissions}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-center font-bold text-brand-300">
                    {dept.evidence_per_faculty.toFixed(2)}
                  </td>
                  <td className="py-3.5 pr-4 text-center text-slate-400">
                    {dept.avg_turnaround_days.toFixed(1)} days
                  </td>
                  <td className="py-3.5 text-right font-extrabold text-white">
                    {dept.aqar_readiness_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
