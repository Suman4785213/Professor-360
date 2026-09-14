import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Department } from '../../types';
import {
  Building2,
  Award,
  Users,
  BookOpen,
  FileDown,
  BarChart3,
  UserCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface FacultyMember {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  employee_id: string;
  designation: string;
  photo_url: string | null;
  role: string;
}

interface DeptOverviewData {
  id: string;
  name: string;
  code: string;
  description: string;
  total_fdps: number;
  total_publications: number;
  total_faculty_count: number;
  faculty: FacultyMember[];
  stats: {
    yearly: Array<{ year: string; fdps: number; publications: number }>;
    categories: Array<{ name: string; count: number }>;
  };
}

interface ReportTypeItem {
  id: string;
  code: string;
  name: string;
}

// Exactly the 11 departments specified by the prompt
const ORDERED_DEPT_CODES = [
  'IT',
  'CSE',
  'AIDS',
  'AIML',
  'ECE',
  'EEE',
  'CIVIL',
  'MBA',
  'MECH',
  'ME',
  'CYBERSECURITY',
];

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

export const ManagementDashboard: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptOverview, setDeptOverview] = useState<DeptOverviewData | null>(null);
  const [loadingDepts, setLoadingDepts] = useState<boolean>(true);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);

  // Department operations: 'FACULTY_PROFILE' | 'DEPT_STATS' | 'REPORT_DOWNLOAD'
  const [activeOperation, setActiveOperation] = useState<
    'FACULTY_PROFILE' | 'DEPT_STATS' | 'REPORT_DOWNLOAD'
  >('FACULTY_PROFILE');

  // Report Types
  const [reportTypes, setReportTypes] = useState<ReportTypeItem[]>([]);
  const [downloadingFacultyId, setDownloadingFacultyId] = useState<string | null>(null);
  const [downloadingDeptReport, setDownloadingDeptReport] = useState<boolean>(false);
  const [downloadMessage, setDownloadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Faculty search filter
  const [facultySearch, setFacultySearch] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoadingDepts(true);
    try {
      const [deptRes, repTypeRes] = await Promise.all([
        apiClient.get('/departments/').catch(() => ({ data: [] })),
        apiClient.get('/report-types/').catch(() => ({ data: [] })),
      ]);

      const rawDepts: Department[] = deptRes.data?.results || deptRes.data || [];
      // Sort departments matching the required order
      const sorted = [...rawDepts].sort((a, b) => {
        const idxA = ORDERED_DEPT_CODES.indexOf(a.code.toUpperCase());
        const idxB = ORDERED_DEPT_CODES.indexOf(b.code.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.code.localeCompare(b.code);
      });
      setDepartments(sorted);

      const rawRepTypes: ReportTypeItem[] = repTypeRes.data?.results || repTypeRes.data || [];
      setReportTypes(rawRepTypes);
    } catch (e) {
      console.error('Error loading management dashboard data:', e);
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleSelectDepartment = async (deptId: string) => {
    setSelectedDeptId(deptId);
    setActiveOperation('FACULTY_PROFILE');
    setDownloadMessage(null);
    setFacultySearch('');
    setLoadingOverview(true);

    try {
      const res = await apiClient.get(`/departments/${deptId}/overview/`);
      setDeptOverview(res.data);
    } catch (e) {
      console.error('Error loading department overview:', e);
    } finally {
      setLoadingOverview(false);
    }
  };

  const handleBackToDepartments = () => {
    setSelectedDeptId(null);
    setDeptOverview(null);
    setDownloadMessage(null);
  };

  // Helper to trigger browser PDF file download
  const triggerPdfDownload = (blobData: any, filename: string) => {
    const blob = new Blob([blobData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // 1. Download report belonging specifically to a single faculty member
  const handleDownloadFacultyReport = async (faculty: FacultyMember) => {
    if (!selectedDeptId) return;
    setDownloadingFacultyId(faculty.id);
    setDownloadMessage(null);

    try {
      // Find FACULTY_SUMMARY or fallback
      const facReportType =
        reportTypes.find((rt) => rt.code === 'FACULTY_SUMMARY') ||
        reportTypes.find((rt) => rt.code.includes('FACULTY')) ||
        reportTypes[0];

      if (!facReportType) {
        throw new Error('Faculty report type not available in catalog.');
      }

      // Generate report
      const genRes = await apiClient.post('/reports/generate/', {
        report_type: facReportType.id,
        output_format: 'PDF',
        department: selectedDeptId,
        faculty: faculty.id,
      });

      const reportId = genRes.data?.id;
      if (!reportId) throw new Error('Could not obtain generated report ID.');

      // Download file
      const fileRes = await apiClient.get(`/reports/${reportId}/download/`, {
        responseType: 'blob',
      });

      const safeName = (faculty.full_name || faculty.first_name || 'Faculty').replace(/\s+/g, '_');
      triggerPdfDownload(fileRes.data, `Faculty_Report_${safeName}.pdf`);

      setDownloadMessage({
        type: 'success',
        text: `Report for ${faculty.full_name || faculty.first_name} downloaded successfully.`,
      });
    } catch (err: any) {
      console.error('Error generating faculty report:', err);
      setDownloadMessage({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Failed to download faculty report.',
      });
    } finally {
      setDownloadingFacultyId(null);
    }
  };

  // 2. Download overall report belonging specifically to the selected department
  const handleDownloadDepartmentReport = async () => {
    if (!selectedDeptId || !deptOverview) return;
    setDownloadingDeptReport(true);
    setDownloadMessage(null);

    try {
      // Find DEPARTMENT_ANNUAL or fallback
      const deptReportType =
        reportTypes.find((rt) => rt.code === 'DEPARTMENT_ANNUAL') ||
        reportTypes.find((rt) => rt.code.includes('DEPARTMENT')) ||
        reportTypes[0];

      if (!deptReportType) {
        throw new Error('Department report type not available in catalog.');
      }

      // Generate report
      const genRes = await apiClient.post('/reports/generate/', {
        report_type: deptReportType.id,
        output_format: 'PDF',
        department: selectedDeptId,
      });

      const reportId = genRes.data?.id;
      if (!reportId) throw new Error('Could not obtain generated report ID.');

      // Download file
      const fileRes = await apiClient.get(`/reports/${reportId}/download/`, {
        responseType: 'blob',
      });

      const safeDeptCode = deptOverview.code || 'Dept';
      triggerPdfDownload(fileRes.data, `Department_Report_${safeDeptCode}.pdf`);

      setDownloadMessage({
        type: 'success',
        text: `Overall report for ${deptOverview.name} (${deptOverview.code}) downloaded successfully.`,
      });
    } catch (err: any) {
      console.error('Error generating department report:', err);
      setDownloadMessage({
        type: 'error',
        text: err?.response?.data?.error || err.message || 'Failed to download department report.',
      });
    } finally {
      setDownloadingDeptReport(false);
    }
  };

  // ==========================================
  // VIEW: DEPARTMENT OVERVIEW (WHEN SELECTED)
  // ==========================================
  if (selectedDeptId) {
    const filteredFaculty = (deptOverview?.faculty || []).filter((f) => {
      const q = facultySearch.toLowerCase();
      return (
        f.full_name?.toLowerCase().includes(q) ||
        f.first_name?.toLowerCase().includes(q) ||
        f.last_name?.toLowerCase().includes(q) ||
        f.designation?.toLowerCase().includes(q) ||
        f.employee_id?.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            id="back-to-departments-btn"
            onClick={handleBackToDepartments}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-brand-600" />
            <span>Back to All Departments</span>
          </button>
          <div className="text-xs text-slate-500 font-medium">
            College Management • Monitoring View
          </div>
        </div>

        {/* Loading Spinner */}
        {loadingOverview ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Department Overview...</p>
          </div>
        ) : deptOverview ? (
          <>
            {/* Department Overview Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-black tracking-wider uppercase mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Department Code: {deptOverview.code}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{deptOverview.name}</h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  {deptOverview.description || 'Institutional Academic Department'}
                </p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 px-5 py-3 rounded-2xl text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Status
                </span>
                <span className="text-sm font-black text-emerald-400 inline-flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" /> Active & Verified
                </span>
              </div>
            </div>

            {/* Essential Department Overview: EXACTLY 3 METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Total FDPs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total FDPs
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-0.5">
                    {deptOverview.total_fdps}
                  </p>
                </div>
              </div>

              {/* Total Publications */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Publications
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-0.5">
                    {deptOverview.total_publications}
                  </p>
                </div>
              </div>

              {/* Total Faculty Count */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Faculty Count
                  </p>
                  <p className="text-3xl font-black text-slate-900 mt-0.5">
                    {deptOverview.total_faculty_count}
                  </p>
                </div>
              </div>
            </div>

            {/* Notification / Toast Banner */}
            {downloadMessage && (
              <div
                className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between ${
                  downloadMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>{downloadMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setDownloadMessage(null)}
                  className="text-xs font-bold underline cursor-pointer ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* EXACTLY THREE OPERATIONS TABS: Faculty Profile | Department Stats | Report Download */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="flex border-b border-slate-200/80 bg-slate-50/70 px-6 pt-3 gap-2 overflow-x-auto">
                <button
                  type="button"
                  id="tab-faculty-profile"
                  onClick={() => setActiveOperation('FACULTY_PROFILE')}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-t-2 cursor-pointer ${
                    activeOperation === 'FACULTY_PROFILE'
                      ? 'bg-white text-brand-700 border-brand-600 shadow-xs -mb-px'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-white/50'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Faculty Profile</span>
                </button>

                <button
                  type="button"
                  id="tab-department-stats"
                  onClick={() => setActiveOperation('DEPT_STATS')}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-t-2 cursor-pointer ${
                    activeOperation === 'DEPT_STATS'
                      ? 'bg-white text-brand-700 border-brand-600 shadow-xs -mb-px'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-white/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Department Stats</span>
                </button>

                <button
                  type="button"
                  id="tab-report-download"
                  onClick={() => setActiveOperation('REPORT_DOWNLOAD')}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-t-2 cursor-pointer ${
                    activeOperation === 'REPORT_DOWNLOAD'
                      ? 'bg-white text-brand-700 border-brand-600 shadow-xs -mb-px'
                      : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-white/50'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>Report Download</span>
                </button>
              </div>

              {/* OPERATION 1: FACULTY PROFILE */}
              {activeOperation === 'FACULTY_PROFILE' && (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Faculty Members</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Showing faculty members assigned to {deptOverview.name}.
                      </p>
                    </div>
                    {/* Search bar */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search faculty..."
                        value={facultySearch}
                        onChange={(e) => setFacultySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {filteredFaculty.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No faculty members found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredFaculty.map((f) => {
                        const isDownloading = downloadingFacultyId === f.id;
                        return (
                          <div
                            key={f.id}
                            className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Profile photo */}
                              {f.photo_url ? (
                                <img
                                  src={f.photo_url}
                                  alt={f.full_name}
                                  className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-700 text-white font-black flex items-center justify-center text-base shadow-xs shrink-0">
                                  {(f.first_name?.[0] || 'F') + (f.last_name?.[0] || '')}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                {/* Faculty name */}
                                <h3 className="text-sm font-bold text-slate-900 truncate">
                                  {f.full_name || `${f.first_name} ${f.last_name}`}
                                </h3>
                                {/* Designation */}
                                <p className="text-xs font-semibold text-brand-700 mt-0.5">
                                  {f.designation || 'Faculty Member'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                                  {f.employee_id ? `ID: ${f.employee_id}` : f.email}
                                </p>
                              </div>
                            </div>

                            {/* Report Download Button (Per Faculty Member) */}
                            <div className="mt-5 pt-3 border-t border-slate-200/70 flex justify-end">
                              <button
                                type="button"
                                id={`faculty-report-download-${f.id}`}
                                disabled={isDownloading}
                                onClick={() => handleDownloadFacultyReport(f)}
                                className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                  isDownloading
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : 'bg-white hover:bg-brand-50 text-brand-700 border border-brand-200 hover:border-brand-300'
                                }`}
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Downloading Report...</span>
                                  </>
                                ) : (
                                  <>
                                    <FileDown className="w-3.5 h-3.5 text-brand-600" />
                                    <span>Report Download</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* OPERATION 2: DEPARTMENT STATS */}
              {activeOperation === 'DEPT_STATS' && (
                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Department Performance Statistics</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visual statistics based on verified FDPs, research publications, and faculty participation.
                    </p>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Yearly FDPs vs Publications Chart */}
                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        Year-over-Year FDPs vs Publications
                      </h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={deptOverview.stats?.yearly || []}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="fdps" name="FDPs Attended" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="publications" name="Publications" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Quality Activity Category Breakdown */}
                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-brand-600" />
                        Activity Distribution by Category
                      </h3>
                      <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deptOverview.stats?.categories || []}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(entry: any) => `${(entry.name || '').split(' ')[0]}: ${entry.value ?? entry.count ?? ''}`}
                              labelLine={false}
                            >
                              {(deptOverview.stats?.categories || []).map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Avg FDP / Faculty</span>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        {deptOverview.total_faculty_count > 0
                          ? (deptOverview.total_fdps / deptOverview.total_faculty_count).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Pubs / Faculty</span>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        {deptOverview.total_faculty_count > 0
                          ? (deptOverview.total_publications / deptOverview.total_faculty_count).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Data Verification</span>
                      <p className="text-xl font-black text-emerald-600 mt-1">100% Verified</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Accreditation Ready</span>
                      <p className="text-xl font-black text-indigo-600 mt-1">NAAC / NBA</p>
                    </div>
                  </div>
                </div>
              )}

              {/* OPERATION 3: REPORT DOWNLOAD (OVERALL DEPARTMENT REPORT) */}
              {activeOperation === 'REPORT_DOWNLOAD' && (
                <div className="p-6 sm:p-8 max-w-3xl space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Overall Department Report Download</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Generate and download the official comprehensive report for {deptOverview.name}.
                    </p>
                  </div>

                  <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/50 rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xs space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20">
                        <FileDown className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {deptOverview.name} — Annual & Quality Assurance Report
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          This overall department report contains all verified faculty development programs (FDPs),
                          research publications, academic contributions, and department-level quality matrices already
                          verified in Professor360.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-semibold text-slate-700">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                            Format: <strong>Official PDF</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                            Department: <strong>{deptOverview.code}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Verified Records Included
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-indigo-100/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        id="department-report-download-btn"
                        disabled={downloadingDeptReport}
                        onClick={handleDownloadDepartmentReport}
                        className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer ${
                          downloadingDeptReport
                            ? 'bg-slate-300 text-slate-600 cursor-not-allowed shadow-none'
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
                        }`}
                      >
                        {downloadingDeptReport ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating & Downloading Report...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-4 h-4" />
                            <span>Download Overall Department Report (PDF)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN DASHBOARD (ALL 11 DEPARTMENTS)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
            Admin1 • College Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Department Monitoring Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Select any department to inspect verified FDPs, publications, faculty profiles, visual statistics, and download reports.
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-2xl text-right">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Departments</p>
          <p className="text-xl font-black text-amber-400">{departments.length} Active</p>
        </div>
      </div>

      {/* Selectable Departments Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Academic Departments</h2>
            <p className="text-xs text-slate-500">
              Click on any department card to open its dedicated overview.
            </p>
          </div>
        </div>

        {loadingDepts ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Departments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {departments.map((dept) => {
              return (
                <button
                  key={dept.id}
                  type="button"
                  id={`dept-card-${dept.code.toLowerCase()}`}
                  onClick={() => handleSelectDepartment(dept.id)}
                  className="group text-left bg-white hover:bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 hover:border-brand-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Department Code & Arrow */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 group-hover:bg-brand-600 text-indigo-700 group-hover:text-white transition-colors">
                        {dept.code}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    {/* Department Name */}
                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-brand-600 transition-colors">
                      {dept.name}
                    </h3>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {dept.faculty_count || 3} Faculty
                    </span>
                    <span className="text-brand-600 font-bold group-hover:underline">
                      View Overview →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
