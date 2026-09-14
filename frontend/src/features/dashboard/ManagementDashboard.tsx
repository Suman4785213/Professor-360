import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { billingApi } from '../../api/billing';
import { Department, TenantBillingInfo, Invoice, PaymentTransaction, Plan } from '../../types';
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
  CreditCard,
  Receipt,
  ShieldCheck,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Zap,
  Clock,
  RefreshCw,
  Info,
  ArrowUpRight,
  Check,
  X,
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

interface ManagementDashboardProps {
  initialView?: 'DEPARTMENTS' | 'PURCHASING';
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

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({
  initialView = 'DEPARTMENTS',
}) => {
  const navigate = useNavigate();

  // Primary view: 'DEPARTMENTS' (11 academic departments) vs 'PURCHASING' (purchasing details)
  const [mainView, setMainView] = useState<'DEPARTMENTS' | 'PURCHASING'>(initialView);

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptOverview, setDeptOverview] = useState<DeptOverviewData | null>(null);
  const [loadingDepts, setLoadingDepts] = useState<boolean>(true);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);

  // Department operations: 'FACULTY_PROFILE' | 'DEPT_STATS' | 'REPORT_DOWNLOAD'
  const [activeOperation, setActiveOperation] = useState<
    'FACULTY_PROFILE' | 'DEPT_STATS' | 'REPORT_DOWNLOAD'
  >('FACULTY_PROFILE');

  // Report Types & Downloads
  const [reportTypes, setReportTypes] = useState<ReportTypeItem[]>([]);
  const [downloadingFacultyId, setDownloadingFacultyId] = useState<string | null>(null);
  const [downloadingDeptReport, setDownloadingDeptReport] = useState<boolean>(false);
  const [downloadMessage, setDownloadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Faculty search filter
  const [facultySearch, setFacultySearch] = useState<string>('');

  // Purchasing Details State
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loadingPurchasing, setLoadingPurchasing] = useState<boolean>(false);
  const [purchasingError, setPurchasingError] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [selectedUpgradePlanCode, setSelectedUpgradePlanCode] = useState<string>('enterprise');
  const [upgradingLoading, setUpgradingLoading] = useState<boolean>(false);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMainView(initialView);
  }, [initialView]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (mainView === 'PURCHASING') {
      fetchPurchasingData();
    }
  }, [mainView]);

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

  const fetchPurchasingData = async () => {
    setLoadingPurchasing(true);
    setPurchasingError(null);
    try {
      const [subData, invData, payData, plansData] = await Promise.all([
        billingApi.getSubscription().catch(() => null),
        billingApi.getInvoices().catch(() => []),
        billingApi.getPayments().catch(() => []),
        billingApi.getPlans().catch(() => ({ current_plan_code: null, plans: [] })),
      ]);
      setBillingInfo(subData);
      setInvoices(invData);
      setPayments(payData);
      if (plansData?.plans) {
        setAvailablePlans(plansData.plans);
      }
    } catch (err: any) {
      console.error('Error loading purchasing data:', err);
      setPurchasingError('Failed to load institutional purchasing records.');
    } finally {
      setLoadingPurchasing(false);
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
      const facReportType =
        reportTypes.find((rt) => rt.code === 'FACULTY_SUMMARY') ||
        reportTypes.find((rt) => rt.code.includes('FACULTY')) ||
        reportTypes[0];

      if (!facReportType) {
        throw new Error('Faculty report type not available in catalog.');
      }

      const genRes = await apiClient.post('/reports/generate/', {
        report_type: facReportType.id,
        output_format: 'PDF',
        department: selectedDeptId,
        faculty: faculty.id,
      });

      const reportId = genRes.data?.id;
      if (!reportId) throw new Error('Could not obtain generated report ID.');

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
      const deptReportType =
        reportTypes.find((rt) => rt.code === 'DEPARTMENT_ANNUAL') ||
        reportTypes.find((rt) => rt.code.includes('DEPARTMENT')) ||
        reportTypes[0];

      if (!deptReportType) {
        throw new Error('Department report type not available in catalog.');
      }

      const genRes = await apiClient.post('/reports/generate/', {
        report_type: deptReportType.id,
        output_format: 'PDF',
        department: selectedDeptId,
      });

      const reportId = genRes.data?.id;
      if (!reportId) throw new Error('Could not obtain generated report ID.');

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

  // 3. Download / View official invoice receipt
  const handleDownloadInvoiceReceipt = async (inv: Invoice) => {
    setDownloadingInvoiceId(inv.id);
    try {
      const res = await apiClient.get(`/billing/invoices/${inv.id}/pdf/`);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
        printWindow.document.close();
      }
    } catch (err: any) {
      console.error('Error opening invoice receipt:', err);
      alert('Unable to load invoice receipt. Please try again.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // 4. Upgrade subscription handler
  const handleConfirmUpgrade = async (planCode: string) => {
    setUpgradingLoading(true);
    setUpgradeSuccessMsg(null);
    try {
      const res = await billingApi.changePlan({ plan_code: planCode });
      setUpgradeSuccessMsg(
        res.message || `Successfully upgraded institutional subscription to ${planCode.toUpperCase()}!`
      );
      setIsUpgradeModalOpen(false);
      await fetchPurchasingData();
    } catch (err: any) {
      console.error('Failed to change plan:', err);
      alert(err?.response?.data?.error || 'Failed to upgrade subscription plan.');
    } finally {
      setUpgradingLoading(false);
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
                                <h3 className="text-sm font-bold text-slate-900 truncate">
                                  {f.full_name || `${f.first_name} ${f.last_name}`}
                                </h3>
                                <p className="text-xs font-semibold text-brand-700 mt-0.5">
                                  {f.designation || 'Faculty Member'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                                  {f.employee_id ? `ID: ${f.employee_id}` : f.email}
                                </p>
                              </div>
                            </div>

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
  // VIEW: MAIN DASHBOARD — TOP EXECUTIVE SWITCHER
  // ==========================================
  const currentPlanCode = billingInfo?.subscription?.plan_details?.code || 'professional';

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
            Admin1 • College Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Institutional Oversight & Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            {billingInfo?.college_name || 'Demo Engineering College'} • Academic Departments & Purchasing Details
          </p>
        </div>
        <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-2xl text-right">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">License Status</p>
          <p className="text-base sm:text-lg font-black text-emerald-400 inline-flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="w-4 h-4" /> Active & Licensed
          </p>
        </div>
      </div>

      {/* Primary Section Switcher: Departments (11) vs Purchasing Details */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px">
        <button
          type="button"
          id="main-tab-departments"
          onClick={() => {
            setMainView('DEPARTMENTS');
            navigate('/management/dashboard');
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 cursor-pointer ${
            mainView === 'DEPARTMENTS'
              ? 'border-brand-600 text-brand-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Academic Departments ({departments.length})</span>
        </button>

        <button
          type="button"
          id="main-tab-purchasing"
          onClick={() => {
            setMainView('PURCHASING');
            navigate('/management/purchasing');
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 cursor-pointer ${
            mainView === 'PURCHASING'
              ? 'border-brand-600 text-brand-700 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Purchasing Details</span>
        </button>
      </div>

      {/* Upgrade Success Notification */}
      {upgradeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>{upgradeSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeSuccessMsg(null)}
            className="text-xs underline font-bold cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: ACADEMIC DEPARTMENTS (11 SELECTABLE CARDS)   */}
      {/* ======================================================== */}
      {mainView === 'DEPARTMENTS' && (
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
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 group-hover:bg-brand-600 text-indigo-700 group-hover:text-white transition-colors">
                          {dept.code}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-brand-600 transition-colors">
                        {dept.name}
                      </h3>
                    </div>

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
      )}

      {/* ======================================================== */}
      {/* SECTION 2: PURCHASING DETAILS (COLLEGE MANAGEMENT VIEW) */}
      {/* ======================================================== */}
      {mainView === 'PURCHASING' && (
        <div className="space-y-6">
          {loadingPurchasing ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
              <RefreshCw className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Loading Purchasing Details...</p>
            </div>
          ) : purchasingError ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {purchasingError}
            </div>
          ) : (
            <>
              {/* Purchasing Overview Card with UPGRADE BUTTON */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Purchased License • Active
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {billingInfo?.subscription?.plan_details?.name || 'Professional Tier'} — Annual Institutional License
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Purchased for {billingInfo?.college_name || 'Demo Engineering College'} (Code: {billingInfo?.college_code || 'DEMO-ENG'})
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-left sm:text-right bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Annual License Fee</span>
                      <span className="text-xl font-black text-slate-900">
                        ₹{billingInfo?.subscription?.plan_details?.price_yearly || '1,490.00'}
                        <span className="text-xs font-semibold text-slate-500 ml-1">/ year (+ 18% GST)</span>
                      </span>
                    </div>

                    {/* PROMINENT UPGRADE SUBSCRIPTION BUTTON */}
                    <button
                      type="button"
                      id="upgrade-subscription-btn"
                      onClick={() => {
                        setSelectedUpgradePlanCode('enterprise');
                        setIsUpgradeModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md shadow-brand-500/25 hover:shadow-lg transition-all cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Upgrade Subscription</span>
                      <ArrowUpRight className="w-4 h-4 opacity-75" />
                    </button>
                  </div>
                </div>

                {/* Key Purchasing Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      Subscription Term
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1">1 Year (Annual)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sep 14, 2026 — Sep 14, 2027
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Billing Cycle
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {billingInfo?.subscription?.billing_cycle || 'YEARLY'}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      Auto-Renewal Active
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-brand-600" />
                      Purchase Order Ref
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                      PO-2026-ENG-DEMO-01
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Approved by Management</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-brand-600" />
                      Payment Settlement
                    </span>
                    <p className="text-sm font-bold text-emerald-700 mt-1">PAID IN FULL</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bank Wire / NEFT</p>
                  </div>
                </div>
              </div>

              {/* AVAILABLE SUBSCRIPTION TIERS & UPGRADE COMPARISON */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Institutional Subscription Tiers & Upgrades</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Compare plan limits and upgrade your institutional scale at any time.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                    Current: {billingInfo?.subscription?.plan_details?.name || 'Professional Tier'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starter Plan Card */}
                  <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-500">Starter Tier</span>
                      <h4 className="text-lg font-black text-slate-900 mt-1">₹490 <span className="text-xs font-semibold text-slate-500">/ year</span></h4>
                      <p className="text-xs text-slate-600 mt-2">Essential QA workflows for single department or pilot institutions.</p>
                      
                      <ul className="mt-4 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 5 Academic Departments</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 50 Faculty Accounts</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 5.0 GB Storage</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 50 Reports / month</li>
                      </ul>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-200 text-center">
                      <span className="text-xs font-semibold text-slate-400">Basic Tier</span>
                    </div>
                  </div>

                  {/* Professional Plan Card (Current) */}
                  <div className="rounded-2xl p-5 border-2 border-brand-500 bg-brand-50/30 flex flex-col justify-between relative shadow-sm">
                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white shadow-xs">
                      Current Plan
                    </span>
                    <div>
                      <span className="text-xs font-bold uppercase text-brand-700">Professional Tier</span>
                      <h4 className="text-lg font-black text-slate-900 mt-1">₹1,490 <span className="text-xs font-semibold text-slate-500">/ year</span></h4>
                      <p className="text-xs text-slate-600 mt-2">Multi-department accreditation, automated reports & AI parsing.</p>
                      
                      <ul className="mt-4 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-600" /> 20 Academic Departments</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-600" /> 300 Faculty Accounts</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-600" /> 25.0 GB Storage</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-600" /> 150 Reports / month</li>
                        <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-600" /> 500 AI Operations / mo</li>
                      </ul>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-200 text-center">
                      <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Currently Active & Paid
                      </span>
                    </div>
                  </div>

                  {/* Enterprise Plan Card (Upgrade Option) */}
                  <div className="rounded-2xl p-5 border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/50 to-white flex flex-col justify-between relative shadow-md">
                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                      Recommended Upgrade
                    </span>
                    <div>
                      <span className="text-xs font-bold uppercase text-indigo-700">Enterprise Tier</span>
                      <h4 className="text-lg font-black text-slate-900 mt-1">₹2,990 <span className="text-xs font-semibold text-slate-500">/ year</span></h4>
                      <p className="text-xs text-slate-600 mt-2">Full-scale institutional governance, unlimited scaling & multi-campus AI.</p>
                      
                      <ul className="mt-4 space-y-2 text-xs text-slate-700">
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> 60 Academic Departments</li>
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> 2,000 Faculty Accounts</li>
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> 100.0 GB Cloud Storage</li>
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> 1,000 Reports / month</li>
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> 5,000 AI Operations / mo</li>
                        <li className="flex items-center gap-2 font-semibold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600" /> Priority 24/7 SLA Support</li>
                      </ul>
                    </div>

                    <div className="mt-5 pt-3 border-t border-indigo-100">
                      {currentPlanCode === 'enterprise' ? (
                        <div className="text-center py-2 text-xs font-bold text-emerald-700 inline-flex items-center justify-center gap-1 w-full">
                          <CheckCircle2 className="w-4 h-4" /> Active Plan
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="upgrade-to-enterprise-card-btn"
                          onClick={() => {
                            setSelectedUpgradePlanCode('enterprise');
                            setIsUpgradeModalOpen(true);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Upgrade to Enterprise Tier</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchased Quota & Capacity Allocation */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Purchased Institutional Capacity</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized resource limits and utilization included in your institutional purchase.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Academic Departments Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-brand-600" />
                        Academic Departments
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {billingInfo?.usage?.departments?.used || 11} / {billingInfo?.usage?.departments?.limit || 20}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, billingInfo?.usage?.departments?.percentage || 55)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">All 11 college departments fully licensed</p>
                  </div>

                  {/* Faculty Members Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-brand-600" />
                        Faculty Accounts
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        {billingInfo?.usage?.faculty?.used || 33} / {billingInfo?.usage?.faculty?.limit || 300}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, billingInfo?.usage?.faculty?.percentage || 11)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Active faculty licenses included</p>
                  </div>

                  {/* Secure Storage Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-brand-600" />
                        Cloud Storage
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {billingInfo?.usage?.storage?.limit_gb || 25} GB
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full w-2" />
                    </div>
                    <p className="text-[11px] text-slate-500">High-speed evidence and report storage</p>
                  </div>

                  {/* Automated Reports Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-brand-600" />
                        Monthly Reports
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {billingInfo?.usage?.reports?.limit || 150} / month
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full w-1/3" />
                    </div>
                    <p className="text-[11px] text-slate-500">PDF, Excel & Word official exports</p>
                  </div>

                  {/* AI Operations Quota */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-brand-600" />
                        AI Operations
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {billingInfo?.usage?.ai_processing?.limit || 500} / month
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full w-4" />
                    </div>
                    <p className="text-[11px] text-slate-500">Automated certificate verification & parsing</p>
                  </div>

                  {/* Active Users */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-600" />
                        Authorized Users
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {billingInfo?.usage?.users?.used || 35} / {billingInfo?.usage?.users?.limit || 150}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-slate-700 h-full rounded-full w-1/4" />
                    </div>
                    <p className="text-[11px] text-slate-500">Role-based institutional access</p>
                  </div>
                </div>
              </div>

              {/* Purchase Invoices & Receipts Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Purchase Invoices & Receipts</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Official tax invoices and purchase receipts issued for institutional subscriptions.
                    </p>
                  </div>
                </div>

                {invoices.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No purchase invoices found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Invoice #</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Subtotal</th>
                          <th className="py-3 px-4">GST (18%)</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv) => {
                          const isDownloading = downloadingInvoiceId === inv.id;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                {inv.invoice_number}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                {inv.issue_date || new Date().toISOString().slice(0, 10)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 font-medium">
                                Institutional Annual License
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                ₹{inv.amount || '1,490.00'}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                ₹{inv.tax_amount || '268.20'}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                ₹{inv.total_amount || '1,758.20'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  PAID
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  id={`download-invoice-${inv.id}`}
                                  disabled={isDownloading}
                                  onClick={() => handleDownloadInvoiceReceipt(inv)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                                >
                                  {isDownloading ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Opening...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-3 h-3 text-brand-600" />
                                      <span>Download Receipt</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Settlement History */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Transactions & Settlement</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable transaction records and bank settlement confirmations.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction Ref</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Settlement Status</th>
                        <th className="py-3 px-4">Settlement Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.length === 0 ? (
                        <tr>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            PAY-PO-2026-0914-DEMO
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            Bank Wire / Institutional NEFT
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            ₹1,758.20
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              SETTLED
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            14 Sep 2026
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {p.payment_reference || 'PAY-PO-2026-0914-DEMO'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {p.payment_method || 'Institutional Wire / NEFT'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              ₹{p.amount}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                {p.status || 'SUCCESS'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {p.created_at ? p.created_at.slice(0, 10) : '14 Sep 2026'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* UPGRADE SUBSCRIPTION MODAL                               */}
      {/* ======================================================== */}
      {isUpgradeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50"
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 tracking-wider">
                  Scale Your Institution
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Upgrade to Enterprise Tier</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unlock higher faculty limits, unlimited departments, and dedicated AI intelligence.
                </p>
              </div>
            </div>

            {/* Plan Comparison Highlights */}
            <div className="space-y-4 my-6">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 space-y-2.5">
                <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Enterprise Inclusions:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>60</strong> Academic Departments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>2,000</strong> Faculty Licenses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>100 GB</strong> Cloud Storage</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>1,000</strong> Monthly Reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>5,000</strong> AI Operations / mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Priority 24/7 Support & SLA</span>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Annual Subscription Fee:</span>
                  <span className="font-bold text-slate-800">₹2,990.00 / year</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span className="font-semibold text-slate-700">₹538.20</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-indigo-700">₹3,528.20 / year</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                disabled={upgradingLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-upgrade-btn"
                disabled={upgradingLoading}
                onClick={() => handleConfirmUpgrade(selectedUpgradePlanCode)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md cursor-pointer ${
                  upgradingLoading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-brand-500/25'
                }`}
              >
                {upgradingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Upgrade...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Confirm & Upgrade to Enterprise Tier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
