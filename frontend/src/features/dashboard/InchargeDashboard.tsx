import { SecureLink, SecureImage, openPrivateFile } from '../../api/privateMedia';
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import {
  Download,
  Bell,
  Plus,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  X,
  FileText,
  User,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  RotateCcw
} from 'lucide-react';

interface FacultyMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_id?: string;
  designation?: string;
  avatar?: string;
  department_name?: string;
  phone?: string;
  faculty_profile?: {
    profile_photo?: string;
    designation?: string;
    qualification?: string;
  };
}

interface StoredReport {
  id: string;
  title: string;
  faculty_id?: string;
  faculty_name?: string;
  faculty_designation?: string;
  record_count: number;
  file_size: number;
  output_format: string;
  generated_at: string;
  is_merged?: boolean;
  submitted_to_hod?: boolean;
  submitted_at?: string;
  hod_name?: string;
  download_url: string;
}

interface ReportRequestItem {
  id: string;
  faculty_id: string;
  faculty_name: string;
  faculty_designation?: string;
  title: string;
  body: string;
  created_at: string;
  response?: 'Okay' | 'Done' | 'No' | null;
  response_text?: string;
  response_timestamp?: string;
  status: string;
}

interface InchargeDashboardProps {
  initialView?: 'dashboard' | 'merge' | 'downloads';
}

export const InchargeDashboard: React.FC<InchargeDashboardProps> = ({ initialView }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Active view: 'dashboard' | 'merge' | 'downloads'
  const currentView = useMemo(() => {
    if (initialView) return initialView;
    if (location.pathname.includes('/merge')) return 'merge';
    if (location.pathname.includes('/downloads')) return 'downloads';
    return 'dashboard';
  }, [initialView, location.pathname]);

  // Data states
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [requestsList, setRequestsList] = useState<ReportRequestItem[]>([]);
  const [storedReports, setStoredReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification modal states
  const [activeFacultyForNotif, setActiveFacultyForNotif] = useState<FacultyMember | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Report download states
  const [downloadingFacultyId, setDownloadingFacultyId] = useState<string | null>(null);

  // Merge report view states
  const [isStoredReportsModalOpen, setIsStoredReportsModalOpen] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedReportResult, setMergedReportResult] = useState<StoredReport | null>(null);

  // Submit to HOD confirmation popup states
  const [reportToSubmit, setReportToSubmit] = useState<StoredReport | null>(null);
  const [isSubmittingHOD, setIsSubmittingHOD] = useState(false);
  const [hodSubmitSuccess, setHodSubmitSuccess] = useState<string | null>(null);

  // Toast / alert banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    loadData();
  }, [currentView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facRes, reqRes, reportsRes] = await Promise.all([
        apiClient.get('/auth/users/?role=FACULTY').catch(() => ({ data: [] })),
        apiClient.get('/notifications/incharge-requests/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/reports/incharge-stored-reports/').catch(() => ({ data: { results: [] } })),
      ]);

      const faculties: FacultyMember[] = facRes.data.results || facRes.data || [];
      setFacultyList(faculties);

      const reqs: ReportRequestItem[] = reqRes.data.results || reqRes.data || [];
      setRequestsList(reqs);

      const reps: StoredReport[] = reportsRes.data.results || reportsRes.data || [];
      setStoredReports(reps);
    } catch (e) {
      console.error('Failed to load incharge data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get latest request for faculty
  const getFacultyRequest = (facultyId: string): ReportRequestItem | undefined => {
    return requestsList.find((r) => r.faculty_id === facultyId);
  };

  // Handle Send Notification to Faculty
  const handleOpenNotificationModal = (faculty: FacultyMember) => {
    setActiveFacultyForNotif(faculty);
    setCustomMessage(
      `Department In-charge ${user?.full_name || 'In-charge'} requests your comprehensive faculty report for departmental consolidation.`
    );
  };

  const handleSendNotification = async () => {
    if (!activeFacultyForNotif) return;
    setSendingNotif(true);
    try {
      await apiClient.post('/notifications/send-report-request/', {
        faculty_id: activeFacultyForNotif.id,
        message: customMessage,
      });
      showToast(`Report request notification sent to ${activeFacultyForNotif.first_name} ${activeFacultyForNotif.last_name}`);
      setActiveFacultyForNotif(null);
      // Refresh requests list
      const reqRes = await apiClient.get('/notifications/incharge-requests/');
      setRequestsList(reqRes.data.results || reqRes.data || []);
    } catch (e: any) {
      console.error('Error sending notification:', e);
      showToast(e.response?.data?.error || 'Failed to send notification.', 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  // Handle Download Faculty Report
  const handleDownloadFacultyReport = async (faculty: FacultyMember) => {
    setDownloadingFacultyId(faculty.id);
    try {
      const res = await apiClient.post('/reports/incharge-faculty-report/', {
        faculty_id: faculty.id,
      });
      showToast(`Report for ${faculty.first_name} ${faculty.last_name} generated and stored in application.`);
      
      // Trigger browser file download
      if (res.data?.file_url) {
        void openPrivateFile(res.data.file_url);
      }

      // Refresh stored reports list
      const reportsRes = await apiClient.get('/reports/incharge-stored-reports/');
      setStoredReports(reportsRes.data.results || reportsRes.data || []);
    } catch (e: any) {
      console.error('Error downloading faculty report:', e);
      showToast(e.response?.data?.error || 'Failed to download faculty report.', 'error');
    } finally {
      setDownloadingFacultyId(null);
    }
  };

  // Handle Merge Selected Reports
  const handleMergeReports = async () => {
    if (selectedReportIds.length === 0) {
      showToast('Please select at least one report to merge.', 'error');
      return;
    }
    setIsMerging(true);
    try {
      const res = await apiClient.post('/reports/merge-reports/', {
        report_ids: selectedReportIds,
      });
      showToast(`Successfully merged ${res.data.source_count} reports into a single consolidated file.`);
      setMergedReportResult({
        id: res.data.id,
        title: res.data.title,
        record_count: res.data.record_count,
        file_size: res.data.file_size,
        output_format: 'PDF',
        generated_at: res.data.generated_at,
        is_merged: true,
        download_url: res.data.download_url,
      });

      // Refresh stored reports
      const reportsRes = await apiClient.get('/reports/incharge-stored-reports/');
      setStoredReports(reportsRes.data.results || reportsRes.data || []);
    } catch (e: any) {
      console.error('Error merging reports:', e);
      showToast(e.response?.data?.error || 'Failed to merge selected reports.', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  // Handle Submit Merged Report to HOD
  const handleConfirmSubmitToHOD = async () => {
    if (!reportToSubmit) return;
    setIsSubmittingHOD(true);
    try {
      const res = await apiClient.post(`/reports/${reportToSubmit.id}/submit-to-hod/`);
      setHodSubmitSuccess(res.data.message || 'Report submitted to HOD successfully.');
      showToast(`Merged report submitted to HOD ${res.data.hod_name || ''}!`);
      
      // Update local stored reports state
      setStoredReports((prev) =>
        prev.map((r) =>
          r.id === reportToSubmit.id
            ? {
                ...r,
                submitted_to_hod: true,
                submitted_at: res.data.submitted_at,
                hod_name: res.data.hod_name,
              }
            : r
        )
      );

      if (mergedReportResult && mergedReportResult.id === reportToSubmit.id) {
        setMergedReportResult((prev) =>
          prev
            ? {
                ...prev,
                submitted_to_hod: true,
                submitted_at: res.data.submitted_at,
                hod_name: res.data.hod_name,
              }
            : null
        );
      }

      setTimeout(() => {
        setReportToSubmit(null);
        setHodSubmitSuccess(null);
      }, 2000);
    } catch (e: any) {
      console.error('Error submitting report to HOD:', e);
      showToast(e.response?.data?.error || 'Failed to submit report to HOD.', 'error');
    } finally {
      setIsSubmittingHOD(false);
    }
  };

  // Checkbox toggle for report selection
  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const handleSelectAllReports = () => {
    const unmergedReports = storedReports.filter((r) => !r.is_merged);
    if (selectedReportIds.length === unmergedReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(unmergedReports.map((r) => r.id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : toastMessage.type === 'info'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MAIN DASHBOARD: FACULTY PROFILE CARDS                                  */}
      {/* ========================================================================= */}
      {currentView === 'dashboard' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  Department In-charge Workspace
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {user?.department_name || 'Computer Science & Engineering'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                Department Faculty Members
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Collect, organize, and download individual reports for faculty members belonging to your department.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 flex items-center gap-3 shrink-0">
              <User className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Assigned Faculty</p>
                <p className="text-xl font-black text-white">{facultyList.length}</p>
              </div>
            </div>
          </div>

          {/* Faculty Profile Cards Grid */}
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold">Loading department faculty profiles...</p>
            </div>
          ) : facultyList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No faculty members found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no active faculty members assigned to your department.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {facultyList.map((faculty) => {
                const req = getFacultyRequest(faculty.id);
                const hasResponded = req?.response != null;
                const isDownloading = downloadingFacultyId === faculty.id;

                const facultyPhoto =
                  faculty.avatar || faculty.faculty_profile?.profile_photo;
                const facultyName =
                  `${faculty.first_name || ''} ${faculty.last_name || ''}`.trim() ||
                  faculty.email;
                const facultyDesignation =
                  faculty.designation ||
                  faculty.faculty_profile?.designation ||
                  'Assistant Professor';

                return (
                  <div
                    key={faculty.id}
                    id={`faculty-card-${faculty.id}`}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* ID Card Top Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-indigo-50/50 p-5 border-b border-slate-100 flex items-center gap-4">
                      {/* Faculty Profile Photo / Avatar */}
                      <div className="relative shrink-0">
                        {facultyPhoto ? (
                          <SecureImage
                            src={facultyPhoto}
                            alt={facultyName}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shadow-indigo-500/10"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-700 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-md shadow-indigo-500/10">
                            {faculty.first_name?.[0] || 'F'}
                            {faculty.last_name?.[0] || ''}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Active Department Member" />
                      </div>

                      {/* Faculty Info */}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                          {faculty.employee_id || 'FACULTY'}
                        </span>
                        <h3 className="text-base font-black text-slate-900 leading-tight mt-1 truncate" title={facultyName}>
                          {facultyName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                          {facultyDesignation}
                        </p>
                      </div>
                    </div>

                    {/* Notification Status (if any) */}
                    <div className="p-4 bg-white border-b border-slate-100">
                      {req ? (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">
                              {hasResponded ? (
                                <span>
                                  Responded:{' '}
                                  <strong
                                    className={`font-bold ${
                                      req.response === 'Okay'
                                        ? 'text-emerald-700'
                                        : req.response === 'Done'
                                        ? 'text-indigo-700'
                                        : 'text-rose-700'
                                    }`}
                                  >
                                    {req.response}
                                  </strong>
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold">Report requested</span>
                              )}
                            </span>
                          </div>
                          {hasResponded && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white border text-slate-600 shrink-0">
                              {req.response}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic text-center py-1">
                          No active report request sent yet
                        </div>
                      )}
                    </div>

                    {/* Strict Required Actions: Report Download & Notification */}
                    <div className="p-4 bg-slate-50/50 grid grid-cols-2 gap-3">
                      {/* 1. Report Download Button */}
                      <button
                        type="button"
                        id={`btn-download-${faculty.id}`}
                        disabled={isDownloading}
                        onClick={() => handleDownloadFacultyReport(faculty)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-xs hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
                        title="Download faculty report and store in application"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isDownloading ? 'Saving...' : 'Report Download'}</span>
                      </button>

                      {/* 2. Notification Button */}
                      <button
                        type="button"
                        id={`btn-notif-${faculty.id}`}
                        onClick={() => handleOpenNotificationModal(faculty)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shadow-indigo-600/20 transition cursor-pointer"
                        title="Send report request notification to this faculty member"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Notification</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MERGE REPORT VIEW                                                      */}
      {/* ========================================================================= */}
      {currentView === 'merge' && (
        <div className="space-y-6">
          {/* View Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  Consolidated Reporting
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {user?.department_name || 'CSE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                Merge Department Reports
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Select downloaded faculty reports stored inside Professor360 and consolidate them into a single file for HOD submission.
              </p>
            </div>

            {/* In-App Stored Reports Button (+) */}
            <button
              type="button"
              id="btn-add-stored-reports"
              onClick={() => setIsStoredReportsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-950 hover:bg-blue-50 font-black text-sm shadow-lg transition cursor-pointer shrink-0"
              title="Open stored reports view inside application"
            >
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>Select Stored Reports (+)</span>
            </button>
          </div>

          {/* Stored Reports Selection Status / Selected Reports Preview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Reports Selected for Consolidation ({selectedReportIds.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click the <strong>+</strong> button above to browse stored faculty reports inside Professor360.
                </p>
              </div>

              {selectedReportIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReportIds([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    id="btn-trigger-merge"
                    disabled={isMerging}
                    onClick={handleMergeReports}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Layers className="w-4 h-4" />
                    <span>{isMerging ? 'Merging Reports...' : 'Merge Reports'}</span>
                  </button>
                </div>
              )}
            </div>

            {selectedReportIds.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No reports selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click the <strong>+ button</strong> above to open your stored reports inside Professor360 and select the faculty reports to merge.
                </p>
                <button
                  type="button"
                  onClick={() => setIsStoredReportsModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Choose Reports from Stored List</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                {storedReports
                  .filter((r) => selectedReportIds.includes(r.id))
                  .map((report) => (
                    <div
                      key={report.id}
                      className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {report.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Faculty: {report.faculty_name} ({report.faculty_designation}) • {report.record_count} Records
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleReportSelection(report.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Remove from merge list"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Generated Merged Report Card with Submit to HOD Action */}
            {mergedReportResult && (
              <div
                id="merged-report-card"
                className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 shadow-sm animate-in fade-in"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Consolidated Report Ready
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(mergedReportResult.generated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        {mergedReportResult.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Combined verified faculty reports • {mergedReportResult.record_count} activities included
                      </p>
                    </div>
                  </div>

                  {/* Submit to HOD Action Button */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {mergedReportResult.download_url && (
                      <SecureLink
                        href={mergedReportResult.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </SecureLink>
                    )}
                    <button
                      type="button"
                      id="btn-submit-to-hod"
                      disabled={mergedReportResult.submitted_to_hod}
                      onClick={() => setReportToSubmit(mergedReportResult)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition cursor-pointer ${
                        mergedReportResult.submitted_to_hod
                          ? 'bg-emerald-600 text-white opacity-80 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {mergedReportResult.submitted_to_hod
                          ? `Submitted to HOD (${mergedReportResult.hod_name || 'Done'})`
                          : 'Submit to HOD'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DOWNLOADED REPORTS VIEW                                                */}
      {/* ========================================================================= */}
      {currentView === 'downloads' && (
        <div className="space-y-6">
          {/* View Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  Document Archive
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {user?.department_name || 'CSE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                Downloaded Reports
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                View and access all faculty and merged departmental reports downloaded through Professor360.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 flex items-center gap-3 shrink-0">
              <FileCheck className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Reports</p>
                <p className="text-xl font-black text-white">{storedReports.length}</p>
              </div>
            </div>
          </div>

          {/* Downloaded Reports List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Downloaded Reports History</h3>
                <p className="text-xs text-slate-500">
                  Access previously downloaded faculty reports and merged department documents
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {storedReports.length} records
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center text-slate-400 text-xs">
                Loading downloaded reports...
              </div>
            ) : storedReports.length === 0 ? (
              <div className="p-16 text-center">
                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No downloaded reports yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Download faculty reports from the Faculty Cards view to store them in your application archive.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Report Title</th>
                      <th className="px-6 py-3.5">Faculty / Type</th>
                      <th className="px-6 py-3.5">Date Downloaded</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {storedReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{report.title}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {report.output_format} • {report.record_count} activities
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-700 block">
                            {report.faculty_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {report.faculty_designation || (report.is_merged ? 'Consolidated Department' : 'Faculty')}
                          </span>
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
                          {report.submitted_to_hod ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Submitted to HOD ({report.hod_name || 'HOD'})
                            </span>
                          ) : report.is_merged ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Layers className="w-3 h-3 text-indigo-600" />
                              Merged File
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Stored in App
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <SecureLink
                            href={report.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                            title="Download / View Report"
                          >
                            <Download className="w-3 h-3 text-indigo-600" />
                            <span>Download</span>
                          </SecureLink>
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
      {/* 4. MODAL: SEND NOTIFICATION TO FACULTY                                    */}
      {/* ========================================================================= */}
      {activeFacultyForNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Send Report Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    To: {activeFacultyForNotif.first_name} {activeFacultyForNotif.last_name} ({activeFacultyForNotif.designation || 'Faculty'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveFacultyForNotif(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Notification Message
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  placeholder="Enter message requesting faculty report..."
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Interactive Faculty Response Supported:
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Faculty will be provided with exactly three response buttons in their notification area:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Okay ("Let me submit it soon.")
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                    Done ("Report uploaded")
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                    No ("Unable to submit")
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveFacultyForNotif(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-send-notif"
                disabled={sendingNotif || !customMessage.trim()}
                onClick={handleSendNotification}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotif ? 'Sending Request...' : 'Send Notification'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: IN-APP STORED REPORTS VIEW WITH CHECKBOXES                      */}
      {/* ========================================================================= */}
      {isStoredReportsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    In-App Stored Reports
                  </span>
                  <span className="text-xs text-slate-400">
                    {user?.department_name || 'CSE'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Select Stored Reports to Merge
                </h3>
                <p className="text-xs text-slate-500">
                  Select previously downloaded reports to merge into a single consolidated file
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStoredReportsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Reports with Checkboxes */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {storedReports.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No stored reports found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    First click <strong>Report Download</strong> on faculty cards to store reports here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Available Reports ({storedReports.length})</span>
                    <button
                      type="button"
                      onClick={handleSelectAllReports}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer"
                    >
                      {selectedReportIds.length === storedReports.filter((r) => !r.is_merged).length
                        ? 'Deselect All'
                        : 'Select All Unmerged'}
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {storedReports.map((report) => {
                      const isSelected = selectedReportIds.includes(report.id);
                      return (
                        <label
                          key={report.id}
                          className={`p-4 flex items-center gap-3.5 cursor-pointer transition select-none ${
                            isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleReportSelection(report.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {report.title}
                              </p>
                              {report.is_merged && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                  Merged
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Faculty: {report.faculty_name} • {report.record_count} activities • {new Date(report.generated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {report.output_format}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {selectedReportIds.length} reports selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStoredReportsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  id="btn-modal-merge-now"
                  disabled={selectedReportIds.length === 0}
                  onClick={() => {
                    setIsStoredReportsModalOpen(false);
                    handleMergeReports();
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Merge Reports ({selectedReportIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CONFIRMATION POPUP: SUBMIT MERGED REPORT TO HOD                        */}
      {/* ========================================================================= */}
      {reportToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirm Submission to HOD
                </h3>
                <p className="text-xs text-slate-500">
                  Formal department report forwarding
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4 text-slate-700">
              <p className="font-bold text-slate-900">
                Are you sure you want to submit this consolidated report to the Head of Department?
              </p>
              <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Report:</strong> {reportToSubmit.title}
                </p>
                <p>
                  <strong>Target HOD:</strong> Dr. Anita Deshmukh (HOD, {user?.department_name || 'CSE'})
                </p>
                <p>
                  <strong>Included Activities:</strong> {reportToSubmit.record_count} verified records
                </p>
              </div>
              <p className="text-[10px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                This action will formally notify the HOD and log the submission in the institutional audit trail.
              </p>
            </div>

            {hodSubmitSuccess && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{hodSubmitSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingHOD}
                onClick={() => setReportToSubmit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-hod-submission"
                disabled={isSubmittingHOD}
                onClick={handleConfirmSubmitToHOD}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingHOD ? 'Submitting to HOD...' : 'Confirm & Submit to HOD'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
