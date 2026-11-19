import { SecureLink, openPrivateFile } from '../../api/privateMedia';
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import {
  Download,
  FileCheck,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  FileText,
  Building2,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface HODReportItem {
  id: string;
  title: string;
  faculty_name?: string;
  incharge_name?: string;
  record_count: number;
  file_size: number;
  output_format: string;
  generated_at: string;
  is_merged?: boolean;
  submitted_to_hod?: boolean;
  submitted_at?: string;
  hod_downloaded?: boolean;
  hod_downloaded_at?: string;
  submitted_to_admins?: boolean;
  submitted_to_admins_at?: string;
  download_url: string;
}

interface HODDashboardProps {
  initialView?: 'downloads' | 'submission';
}

export const HODDashboard: React.FC<HODDashboardProps> = ({ initialView }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Active view: 'downloads' | 'submission'
  const currentView = useMemo(() => {
    if (initialView) return initialView;
    if (location.pathname.includes('/submission')) return 'submission';
    return 'downloads';
  }, [initialView, location.pathname]);

  // Data states
  const [downloadedReports, setDownloadedReports] = useState<HODReportItem[]>([]);
  const [availableReports, setAvailableReports] = useState<HODReportItem[]>([]);
  const [inchargeAlerts, setInchargeAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Report submission states
  const [selectedReport, setSelectedReport] = useState<HODReportItem | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [tempSelectedReport, setTempSelectedReport] = useState<HODReportItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submittingToAdmins, setSubmittingToAdmins] = useState(false);
  const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState<string | null>(null);

  // Fetch HOD data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [downloadsRes, availableRes, notifRes] = await Promise.all([
        apiClient.get('/reports/hod-downloaded-reports/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/reports/hod-reports/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/notifications/?limit=10').catch(() => ({ data: { results: [] } })),
      ]);

      const downloadsList: HODReportItem[] = downloadsRes.data?.results || downloadsRes.data || [];
      const availableList: HODReportItem[] = availableRes.data?.results || availableRes.data || [];
      setDownloadedReports(downloadsList);
      setAvailableReports(availableList);

      // Check for incharge submission notifications
      const notifs: any[] = notifRes.data?.results || notifRes.data || [];
      const alerts = notifs.filter(
        (n: any) =>
          n.category === 'REPORT' ||
          n.notification_type === 'HOD_REPORT_SUBMISSION' ||
          (n.title && n.title.toLowerCase().includes('report'))
      );
      setInchargeAlerts(alerts);
    } catch (e) {
      console.error('Error fetching HOD dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentView]);

  // Handle report download
  const handleDownloadReport = async (report: HODReportItem) => {
    try {
      await apiClient.post(`/reports/${report.id}/hod-download/`);
      // Trigger file download
      void openPrivateFile(report.download_url);
      // Update local state so it marks as downloaded
      setDownloadedReports((prev) => {
        const exists = prev.some((r) => r.id === report.id);
        if (exists) {
          return prev.map((r) =>
            r.id === report.id
              ? { ...r, hod_downloaded: true, hod_downloaded_at: new Date().toISOString() }
              : r
          );
        } else {
          return [
            { ...report, hod_downloaded: true, hod_downloaded_at: new Date().toISOString() },
            ...prev,
          ];
        }
      });
    } catch (e) {
      console.error('Download error:', e);
      void openPrivateFile(report.download_url);
    }
  };

  // Filtered downloaded reports
  const filteredDownloads = useMemo(() => {
    if (!searchQuery.trim()) return downloadedReports;
    const q = searchQuery.toLowerCase();
    return downloadedReports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.incharge_name && r.incharge_name.toLowerCase().includes(q)) ||
        (r.faculty_name && r.faculty_name.toLowerCase().includes(q))
    );
  }, [downloadedReports, searchQuery]);

  // Filtered available reports in internal selector modal
  const filteredAvailableReports = useMemo(() => {
    if (!modalSearchQuery.trim()) return availableReports;
    const q = modalSearchQuery.toLowerCase();
    return availableReports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.incharge_name && r.incharge_name.toLowerCase().includes(q)) ||
        (r.faculty_name && r.faculty_name.toLowerCase().includes(q))
    );
  }, [availableReports, modalSearchQuery]);

  // Submit to admins
  const handleConfirmSubmitToAdmins = async () => {
    if (!selectedReport) return;
    setSubmittingToAdmins(true);
    try {
      const res = await apiClient.post(`/reports/${selectedReport.id}/submit-to-admins/`);
      setIsConfirmModalOpen(false);
      setSubmissionSuccessMessage(
        res.data?.message ||
          `Report '${selectedReport.title}' has been submitted to Management (Admin2) and IQAC (Admin3) successfully.`
      );
      // Update reports
      setDownloadedReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? { ...r, submitted_to_admins: true, submitted_to_admins_at: new Date().toISOString() }
            : r
        )
      );
      setAvailableReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? { ...r, submitted_to_admins: true, submitted_to_admins_at: new Date().toISOString() }
            : r
        )
      );
      setSelectedReport((prev) =>
        prev ? { ...prev, submitted_to_admins: true, submitted_to_admins_at: new Date().toISOString() } : null
      );
    } catch (e: any) {
      console.error('Submit to admins failed:', e);
      alert(e.response?.data?.error || 'Failed to submit report to admins.');
    } finally {
      setSubmittingToAdmins(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Notification Alert for reports received from In-charge */}
      {inchargeAlerts.length > 0 && inchargeAlerts[0] && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-50">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-200 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-400/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
                  Notification from In-charge
                </span>
                <span className="text-xs text-purple-300">
                  {new Date(inchargeAlerts[0].created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                {inchargeAlerts[0].title}
              </h4>
              <p className="text-xs text-purple-200/90 mt-0.5 max-w-2xl line-clamp-2">
                {inchargeAlerts[0].body}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {inchargeAlerts[0].related_id && (
              <button
                type="button"
                onClick={async () => {
                  const reportId = inchargeAlerts[0].related_id;
                  try {
                    await apiClient.post(`/reports/${reportId}/hod-download/`);
                  } catch (err) {}
                  void openPrivateFile(`/api/v1/reports/${reportId}/download/`);
                  fetchData();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-950 font-black text-xs hover:bg-purple-50 shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-purple-800" />
                <span>Download Report</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW: DOWNLOADED REPORTS                                               */}
      {/* ========================================================================= */}
      {currentView === 'downloads' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  HOD Portal • {user?.department_name || 'Engineering'}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {user?.college_name || 'Demo Engineering College'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                Downloaded Reports
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Review and download all consolidated report files received from the Department In-charge or generated within the department for future reference.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/hod/submission')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-purple-950 hover:bg-purple-50 shadow-lg font-bold text-xs transition cursor-pointer"
              >
                <Send className="w-4 h-4 text-purple-700" />
                <span>Go to Report Submission</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Available Reports</p>
                <p className="text-2xl font-black text-slate-900">{downloadedReports.length}</p>
                <p className="text-[11px] text-slate-400">Department received files</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Downloaded in Profile</p>
                <p className="text-2xl font-black text-slate-900">
                  {downloadedReports.filter((r) => r.hod_downloaded).length}
                </p>
                <p className="text-[11px] text-slate-400">Maintained for reference</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Submitted to Admins</p>
                <p className="text-2xl font-black text-slate-900">
                  {downloadedReports.filter((r) => r.submitted_to_admins).length}
                </p>
                <p className="text-[11px] text-slate-400">Management & IQAC access</p>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header & Search */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Department Reports Repository
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All reports received/sent through the application for {user?.department_name || 'your department'}.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                />
              </div>
            </div>

            {/* Table or Empty State */}
            {loading ? (
              <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                Loading reports...
              </div>
            ) : filteredDownloads.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 border border-purple-100">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-base font-bold text-slate-800">No reports found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No reports matched your search keyword.'
                    : 'No reports have been submitted by the Department In-charge yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Report Details</th>
                      <th className="px-6 py-4">Source / Department</th>
                      <th className="px-6 py-4">Records & Size</th>
                      <th className="px-6 py-4">Date Received</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDownloads.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">
                                {report.title}
                              </p>
                              <span className="inline-block text-[10px] font-semibold text-purple-700 uppercase bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 mt-0.5">
                                {report.output_format || 'PDF'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-slate-800">
                            {report.incharge_name || 'Department In-charge'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {user?.department_name || 'Engineering'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <span className="font-bold text-slate-800">{report.record_count}</span>{' '}
                          activities • {(report.file_size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(report.generated_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          {report.submitted_to_admins ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <ShieldCheck className="w-3 h-3 text-indigo-600" />
                              Submitted to Admins
                            </span>
                          ) : report.hod_downloaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Downloaded in Profile
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Received from In-charge
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <SecureLink
                              href={report.download_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                              title="View in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View</span>
                            </SecureLink>
                            <button
                              type="button"
                              onClick={() => handleDownloadReport(report)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                              title="Download report to device"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW: REPORT SUBMISSION                                                */}
      {/* ========================================================================= */}
      {currentView === 'submission' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  Workflow Phase 2 • Submission
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {user?.department_name || 'Engineering'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                Report Submission to Admins
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Select an internal department report and submit it directly to the <strong>Management profile (Admin2)</strong> and <strong>IQAC profile (Admin3)</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/hod/downloads')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-purple-300" />
                <span>View Downloaded Reports</span>
              </button>
            </div>
          </div>

          {/* Success Message Banner */}
          {submissionSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start justify-between gap-4 animate-in fade-in-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Submission Successful!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {submissionSuccessMessage}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-2 font-medium">
                    The same submitted report is now available to both <strong>Management (Admin2)</strong> and <strong>IQAC (Admin3)</strong> profiles.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Submission Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                1. Select Report for Submission
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the required report from the application's internal repository.
              </p>
            </div>

            {/* Select File Component */}
            {!selectedReport ? (
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 rounded-3xl p-8 sm:p-12 text-center transition-all">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 border border-purple-200 shadow-xs">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  No Report Selected
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click the <strong>Select File</strong> button below to browse and select from the available department reports in the internal repository.
                </p>

                <div className="mt-6">
                  <button
                    type="button"
                    id="hod-select-file-btn"
                    onClick={() => {
                      setTempSelectedReport(null);
                      setIsSelectModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 transition cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Select File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-purple-50/80 via-white to-slate-50 rounded-3xl border border-purple-200 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-purple-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20 shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Selected for Submission
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-1">
                        {selectedReport.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Department of {user?.department_name || 'Engineering'} • Source: {selectedReport.incharge_name || 'Department In-charge'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTempSelectedReport(selectedReport);
                      setIsSelectModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 transition cursor-pointer shrink-0"
                  >
                    Change Selected File
                  </button>
                </div>

                {/* Selected File Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Output Format</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedReport.output_format || 'PDF'}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Faculty Records</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedReport.record_count} Entries</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">File Size</span>
                    <span className="font-extrabold text-slate-800 text-sm">{(selectedReport.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-purple-100/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Generated At</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {new Date(selectedReport.generated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Submit to Admins Section */}
                <div className="pt-4 border-t border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Ready to Submit to Admins
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitting will send this report simultaneously to <strong>Management profile (Admin2)</strong> and <strong>IQAC profile (Admin3)</strong>.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="hod-submit-to-admins-btn"
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit to Admins</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: INTERNAL APPLICATION REPORTS SELECTOR                           */}
      {/* ========================================================================= */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Internal Reports Repository
                  </span>
                  <span className="text-xs text-slate-400">
                    {availableReports.length} Reports Available
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Select Report to Submit
                </h3>
                <p className="text-xs text-slate-500">
                  Choose the report file available in your department profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search internal reports by title or in-charge..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
                />
              </div>
            </div>

            {/* List of reports */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {filteredAvailableReports.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No department reports found in repository.
                </div>
              ) : (
                filteredAvailableReports.map((report) => {
                  const isSelected = tempSelectedReport?.id === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => setTempSelectedReport(report)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {report.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{report.record_count} entries</span>
                            <span>•</span>
                            <span>{(report.file_size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>
                              {new Date(report.generated_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {report.submitted_to_admins && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                Previously Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {tempSelectedReport ? (
                  <span>Selected: <strong>{tempSelectedReport.title}</strong></span>
                ) : (
                  <span>No report selected</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSelectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-file-selection"
                  disabled={!tempSelectedReport}
                  onClick={() => {
                    setSelectedReport(tempSelectedReport);
                    setIsSelectModalOpen(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Selection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: CONFIRMATION POPUP FOR SUBMIT TO ADMINS                        */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0 border border-indigo-100">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Confirm Submission to Admins
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please verify before submitting this report to college leadership.
                </p>
              </div>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-700">Selected Report:</p>
                <p className="text-sm font-black text-slate-900">{selectedReport.title}</p>
                <p className="text-[11px] text-slate-500">
                  {selectedReport.record_count} entries • {(selectedReport.file_size / 1024).toFixed(1)} KB • {selectedReport.output_format || 'PDF'}
                </p>
              </div>

              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 text-indigo-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  Dual Recipients Confirmation:
                </p>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  The exact same submitted report will be immediately dispatched and made available to both:
                </p>
                <ul className="list-disc pl-5 text-[11px] space-y-1 font-semibold text-indigo-900">
                  <li><strong>Management profile (Admin2)</strong> — Institutional Monitoring</li>
                  <li><strong>IQAC profile (Admin3)</strong> — Quality Assurance Cell</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-submit-admins"
                disabled={submittingToAdmins}
                onClick={handleConfirmSubmitToAdmins}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {submittingToAdmins ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to Admins...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Yes, Submit to Admins</span>
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
export default HODDashboard;
