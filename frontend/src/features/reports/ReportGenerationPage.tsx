import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  User,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  Upload,
  Layers,
  ChevronRight,
  RefreshCw,
  Search,
  FileType,
  Sparkles,
  Info,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  ReportType,
  ReportTemplate,
  GeneratedReport,
  ReportPreviewData,
  ReportOutputFormat
} from '../../types';

export const ReportGenerationPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'builder' | 'history' | 'templates'>('builder');

  // Master Data
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [historyReports, setHistoryReports] = useState<GeneratedReport[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current: boolean }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; code: string }[]>([]);
  const [criteria, setCriteria] = useState<{ id: string; criterion_number: string; title: string }[]>([]);
  const [metrics, setMetrics] = useState<{ id: string; metric_number: string; title: string }[]>([]);
  const [facultyList, setFacultyList] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);

  // Stepper State (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);

  // Filters State
  const [selectedAY, setSelectedAY] = useState<string>(searchParams.get('academic_year') || '');
  const [selectedDept, setSelectedDept] = useState<string>(
    user?.role === 'HOD' || user?.role === 'DEPARTMENT_INCHARGE'
      ? (user.department || '')
      : (searchParams.get('department') || '')
  );
  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    user?.role === 'FACULTY' ? (user.id || '') : (searchParams.get('faculty') || '')
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedCriterion, setSelectedCriterion] = useState<string>(searchParams.get('criterion') || '');
  const [selectedMetric, setSelectedMetric] = useState<string>(searchParams.get('metric') || '');
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState<string>(searchParams.get('date_to') || '');
  const [outputFormat, setOutputFormat] = useState<ReportOutputFormat>('PDF');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Preview & Generation State
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // History & Template Modals
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [historyFormatFilter, setHistoryFormatFilter] = useState<string>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [activeTemplateForVersion, setActiveTemplateForVersion] = useState<ReportTemplate | null>(null);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);

  // New Template Form
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateReportType, setNewTemplateReportType] = useState<string>('');
  const [newTemplateFormat, setNewTemplateFormat] = useState<ReportOutputFormat>('WORD');
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionSummary, setVersionSummary] = useState<string>('');
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState<boolean>(false);

  // Load Initial Metadata
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [rtRes, tplRes, deptRes, ayRes, catRes, critRes] = await Promise.all([
        apiClient.get('/report-types/'),
        apiClient.get('/report-templates/'),
        apiClient.get('/departments/'),
        apiClient.get('/academic-years/'),
        apiClient.get('/activity-categories/').catch(() => ({ data: [] })),
        apiClient.get('/criteria/').catch(() => ({ data: [] }))
      ]);

      const typesList: ReportType[] = rtRes.data.results || rtRes.data || [];
      setReportTypes(typesList);
      setTemplates(tplRes.data.results || tplRes.data || []);
      setDepartments(deptRes.data.results || deptRes.data || []);
      
      const ays = ayRes.data.results || ayRes.data || [];
      setAcademicYears(ays);
      const curAY = ays.find((a: any) => a.is_current);
      if (curAY && !selectedAY) {
        setSelectedAY(curAY.id);
      }

      setCategories(catRes.data.results || catRes.data || []);
      setCriteria(critRes.data.results || critRes.data || []);

      // Auto-select type if matched from query param or default
      const qType = searchParams.get('report_type');
      if (qType && typesList.length > 0) {
        const found = typesList.find((t) => t.code === qType || t.id === qType);
        if (found) {
          setSelectedType(found);
          setOutputFormat(found.default_format || 'PDF');
        }
      } else if (typesList.length > 0 && !selectedType) {
        setSelectedType(typesList[0]);
        setOutputFormat(typesList[0].default_format || 'PDF');
      }

      loadHistory();
    } catch (err) {
      console.error('Failed to load report metadata:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await apiClient.get('/reports/history/');
      setHistoryReports(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load reports history:', err);
    }
  };

  // Load Department Faculty when Dept Changes
  useEffect(() => {
    if (selectedDept) {
      apiClient.get(`/auth/users/?department=${selectedDept}&role=FACULTY`)
        .then((res) => setFacultyList(res.data.results || res.data || []))
        .catch(() => setFacultyList([]));
    } else {
      setFacultyList([]);
    }
  }, [selectedDept]);

  // Load Metrics when Criterion Changes
  useEffect(() => {
    if (selectedCriterion) {
      apiClient.get(`/metrics/?criterion=${selectedCriterion}`)
        .then((res) => setMetrics(res.data.results || res.data || []))
        .catch(() => setMetrics([]));
    } else {
      setMetrics([]);
    }
  }, [selectedCriterion]);

  // Fetch Report Preview (Section 6)
  const handleFetchPreview = async () => {
    if (!selectedType) return;
    setIsLoadingPreview(true);
    setErrorMessage('');
    try {
      const payload = {
        report_type: selectedType.id,
        academic_year: selectedAY || undefined,
        department: selectedDept || undefined,
        faculty: selectedFaculty || undefined,
        category: selectedCategory || undefined,
        criterion: selectedCriterion || undefined,
        metric: selectedMetric || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const res = await apiClient.post('/reports/preview/', payload);
      setPreviewData(res.data);
      setCurrentStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate preview.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Execute Generation (Section 15)
  const handleGenerateReport = async () => {
    if (!selectedType) return;
    setIsGenerating(true);
    setErrorMessage('');
    setGeneratedResult(null);

    try {
      const payload = {
        report_type: selectedType.id,
        academic_year: selectedAY || undefined,
        department: selectedDept || undefined,
        faculty: selectedFaculty || undefined,
        category: selectedCategory || undefined,
        criterion: selectedCriterion || undefined,
        metric: selectedMetric || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        output_format: outputFormat,
        template: selectedTemplateId || undefined,
      };

      const res = await apiClient.post('/reports/generate/', payload);
      setGeneratedResult(res.data);
      setCurrentStep(5);
      loadHistory();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to generate report.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsGenerating(false);
    }
  };

  // Secure File Download (Section 21)
  const handleDownloadFile = async (reportId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/reports/${reportId}/download/`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download report. You may not have authorization for this document.');
    }
  };

  // Soft-Archive Report (Section 18)
  const handleArchiveReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to archive this historical report?')) return;
    try {
      await apiClient.post(`/reports/${reportId}/archive/`, { reason: 'Archived by IQAC Officer' });
      loadHistory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive report.');
    }
  };

  // Create Template Upload
  const handleUploadNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateFile || !newTemplateReportType || !newTemplateName) {
      alert('Please fill all required template fields and attach a file.');
      return;
    }

    setIsSubmittingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('report_type', newTemplateReportType);
      formData.append('name', newTemplateName);
      formData.append('file_format', newTemplateFormat);
      formData.append('file', newTemplateFile);

      await apiClient.post('/report-templates/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Template uploaded successfully.');
      setIsUploadModalOpen(false);
      setNewTemplateName('');
      setNewTemplateFile(null);
      const tplRes = await apiClient.get('/report-templates/');
      setTemplates(tplRes.data.results || tplRes.data || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload template.');
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  // Upload New Version (Section 11)
  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplateForVersion || !versionFile) {
      alert('Please attach the updated template file.');
      return;
    }

    setIsSubmittingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('change_summary', versionSummary || 'Updated template version');

      await apiClient.post(`/report-templates/${activeTemplateForVersion.id}/upload-version/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert(`Version updated successfully to v${activeTemplateForVersion.version + 1}!`);
      setIsVersionModalOpen(false);
      setVersionFile(null);
      setVersionSummary('');
      const tplRes = await apiClient.get('/report-templates/');
      setTemplates(tplRes.data.results || tplRes.data || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload new template version.');
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const copyToClipboard = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    setCopiedPlaceholder(placeholder);
    setTimeout(() => setCopiedPlaceholder(null), 2000);
  };

  const filteredHistory = historyReports.filter((rep) => {
    const matchesSearch =
      rep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.report_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.department_name && rep.department_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFormat = historyFormatFilter === 'ALL' || rep.output_format === historyFormatFilter;
    return matchesSearch && matchesFormat;
  });

  const placeholdersList = [
    { key: '{{college_name}}', desc: 'Name of the College / Institution' },
    { key: '{{college_logo}}', desc: 'College Official Seal / Logo' },
    { key: '{{report_title}}', desc: 'Official Report Document Title' },
    { key: '{{academic_year}}', desc: 'Selected Academic Cycle (e.g. 2025-26)' },
    { key: '{{department_name}}', desc: 'Academic Department' },
    { key: '{{faculty_name}}', desc: 'Faculty Member Name' },
    { key: '{{employee_id}}', desc: 'Faculty Employee Code' },
    { key: '{{designation}}', desc: 'Faculty Academic Designation' },
    { key: '{{activity_title}}', desc: 'Title of the Program / Workshop' },
    { key: '{{activity_category}}', desc: 'Activity Category (FDP, Seminar, etc.)' },
    { key: '{{organizer}}', desc: 'Organizing Institution / Body' },
    { key: '{{start_date}}', desc: 'Start Date of Event' },
    { key: '{{end_date}}', desc: 'End Date of Event' },
    { key: '{{duration}}', desc: 'Event Duration (Days / Hours)' },
    { key: '{{#activities}}...{{/activities}}', desc: 'Repeatable Table Row Loop for Activities' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Automated Report Generation Engine</h1>
              <p className="text-xs text-slate-500 font-medium">
                Transform verified institutional data into publication-ready PDF, Excel, and Word compliance reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Rule 1: Verified Institutional Records Only
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" /> Multi-Format: PDF · Excel · Word (.docx)
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'builder'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileType className="w-4 h-4" />
            Report Builder
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            History ({historyReports.length})
          </button>
          {['SUPER_ADMIN', 'IQAC'].includes(user?.role || '') && (
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'templates'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Templates ({templates.length})
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: REPORT BUILDER (STEPPER WORKFLOW)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold">
              {[
                { step: 1, label: '1. Report Type' },
                { step: 2, label: '2. Data Filters' },
                { step: 3, label: '3. Format & Template' },
                { step: 4, label: '4. Data Preview' },
                { step: 5, label: '5. Download' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => s.step <= currentStep && setCurrentStep(s.step)}
                  disabled={s.step > currentStep}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    currentStep === s.step
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : s.step < currentStep
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {s.step < currentStep && <Check className="w-3.5 h-3.5" />}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* STEP 1: Select Report Type */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">Step 1: Select Institutional Report Type</h2>
                  <p className="text-xs text-slate-500">
                    Choose from standard accreditation dossiers, departmental progress sheets, or criteria compliance packages
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {reportTypes.map((type) => {
                  const isSelected = selectedType?.id === type.id;
                  return (
                    <div
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type);
                        setOutputFormat(type.default_format || 'PDF');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                            {type.code}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {type.default_format}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900">{type.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {type.description || 'Verified institutional quality compliance report.'}
                        </p>
                      </div>

                      {type.category_code && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Target: <strong className="text-slate-700">{type.category_code}</strong></span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 font-black" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  disabled={!selectedType}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  Continue to Data Filters <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Data Filters */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-base font-black text-slate-900">Step 2: Configure Data Scope & Institutional Filters</h2>
                <p className="text-xs text-slate-500">
                  Select matching parameters. Only IQAC-verified records matching ALL filters will be included.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Academic Cycle
                  </label>
                  <select
                    value={selectedAY}
                    onChange={(e) => setSelectedAY(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none"
                  >
                    <option value="">All Academic Cycles</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? '(Current Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Department Scope
                  </label>
                  <select
                    disabled={user?.role === 'HOD' || user?.role === 'DEPARTMENT_INCHARGE'}
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All Departments (College-Wide)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> Faculty Member (Optional)
                  </label>
                  <select
                    disabled={user?.role === 'FACULTY'}
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All Faculty</option>
                    {facultyList.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.first_name} {fac.last_name} ({fac.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Activity Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" /> Activity Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none"
                  >
                    <option value="">All Categories (Auto-scope by Report Type)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Criteria Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> NAAC Criterion (Optional)
                  </label>
                  <select
                    value={selectedCriterion}
                    onChange={(e) => {
                      setSelectedCriterion(e.target.value);
                      setSelectedMetric('');
                    }}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none"
                  >
                    <option value="">All Criteria</option>
                    {criteria.map((c) => (
                      <option key={c.id} value={c.id}>
                        Criterion {c.criterion_number}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metric Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> NAAC Metric (Optional)
                  </label>
                  <select
                    disabled={!selectedCriterion}
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All Metrics under Criterion</option>
                    {metrics.map((m) => (
                      <option key={m.id} value={m.id}>
                        Metric {m.metric_number}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date (From)</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">End Date (To)</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  Continue to Format & Template <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Format & Template Selection */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-900">Step 3: Select Document Format & Official Template</h2>
                <p className="text-xs text-slate-500">
                  Select your desired publication output format and assign an institution-approved Word/Excel layout template.
                </p>
              </div>

              {/* Format Select Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    fmt: 'PDF' as ReportOutputFormat,
                    title: 'Portable Document Format (.pdf)',
                    desc: 'High-fidelity, styled ReportLab layout with college header, metadata box, running headers, and Page X of Y numbering.',
                    badge: 'Recommended for Compliance Audits',
                  },
                  {
                    fmt: 'EXCEL' as ReportOutputFormat,
                    title: 'Microsoft Excel (.xlsx)',
                    desc: 'Fully formatted OpenPyXL workbook with frozen headers, styled columns, auto-fit widths, and enabled filters for offline analysis.',
                    badge: 'Best for Data Verification & Analytics',
                  },
                  {
                    fmt: 'WORD' as ReportOutputFormat,
                    title: 'Microsoft Word (.docx)',
                    desc: 'Populates institutional Word templates with repeatable sections, placeholder substitution, and preserved institutional branding.',
                    badge: 'Editable Institutional Template',
                  },
                ].map((item) => {
                  const isSelected = outputFormat === item.fmt;
                  return (
                    <div
                      key={item.fmt}
                      onClick={() => setOutputFormat(item.fmt)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/30 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700">
                            {item.fmt}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 font-bold" />}
                        </div>
                        <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <div className="mt-4 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400">{item.badge}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Template Dropdown (Section 7) */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" /> College Template (Optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value="">Default Standard System Template</option>
                  {templates
                    .filter((t) => !selectedType || t.report_type === selectedType.id)
                    .map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} (v{tpl.version}) — {tpl.file_format}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload customized college templates under the "Templates" tab.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Back
                </button>
                <button
                  onClick={handleFetchPreview}
                  disabled={isLoadingPreview}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isLoadingPreview ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Fetching Preview...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Inspect Table Preview <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Report Preview & Inspection (Section 6 & 32) */}
          {currentStep === 4 && previewData && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                    {previewData.meta.report_type_code} · Pre-Generation Inspection
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">{previewData.meta.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                    <span>Academic Cycle: <strong className="text-slate-800">{previewData.meta.academic_year}</strong></span>
                    <span>•</span>
                    <span>Department: <strong className="text-slate-800">{previewData.meta.department}</strong></span>
                    <span>•</span>
                    <span>Format: <strong className="text-indigo-600">{outputFormat}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs">
                    {previewData.total_records} Verified Records
                  </div>
                </div>
              </div>

              {/* Empty Data Handling (Section 27) */}
              {previewData.total_records === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                  <h3 className="text-sm font-black text-amber-900">No verified records match the selected filters.</h3>
                  <p className="text-xs text-amber-700 max-w-md mx-auto">
                    The report generation engine strictly excludes draft, pending, or rejected activities (Rule 1). Please modify your filters to select cycles or departments with verified data.
                  </p>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Change Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Data Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Faculty Name</th>
                          <th className="p-3">Activity Title</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Date Range</th>
                          <th className="p-3">Organizer</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {previewData.sample_records.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-400 font-bold">{rec.sl_no}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{rec.faculty_name}</div>
                              <div className="text-[10px] text-slate-400">{rec.department_name}</div>
                            </td>
                            <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">
                              {rec.activity_title}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {rec.category_name}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">{rec.date_range}</td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">{rec.organizer}</td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> {rec.verified_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-400 italic text-right">
                    Showing top {previewData.sample_records.length} of {previewData.total_records} verified records.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Back
                </button>
                <button
                  disabled={previewData.total_records === 0 || isGenerating}
                  onClick={handleGenerateReport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Generating Final {outputFormat}...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Generate & Download {outputFormat}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Download & Success Card */}
          {currentStep === 5 && generatedResult && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {generatedResult.output_format} Report Generated Successfully
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">{generatedResult.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Report verified, compiled, and archived into institutional repository.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-left text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Records</span>
                  <strong className="text-slate-800">{generatedResult.record_count} Verified</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">File Size</span>
                  <strong className="text-slate-800">
                    {(generatedResult.file_size / 1024).toFixed(1)} KB
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Format</span>
                  <strong className="text-indigo-600">{generatedResult.output_format}</strong>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() =>
                    handleDownloadFile(
                      generatedResult.id,
                      generatedResult.file?.split('/').pop() || `${generatedResult.title}.${generatedResult.output_format.toLowerCase()}`
                    )
                  }
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" /> Download Report Now
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setGeneratedResult(null);
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700"
                >
                  Generate Another Report
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: REPORT HISTORY (Section 18)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Generated Reports History</h2>
              <p className="text-xs text-slate-500">
                Traceable archive of all compiled institutional reports with secure permission-checked downloads
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search historical reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 w-56"
                />
              </div>

              <select
                value={historyFormatFilter}
                onChange={(e) => setHistoryFormatFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none"
              >
                <option value="ALL">All Formats</option>
                <option value="PDF">PDF</option>
                <option value="EXCEL">Excel</option>
                <option value="WORD">Word</option>
              </select>

              <button
                onClick={loadHistory}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                title="Refresh History"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              No historical reports found matching search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Report Title</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Cycle & Dept</th>
                    <th className="p-3">Records</th>
                    <th className="p-3">Format</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Generated By</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredHistory.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{rep.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rep.generated_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-semibold text-slate-700">{rep.report_type_name}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 font-medium">{rep.academic_year_name || 'All Years'}</div>
                        <div className="text-[10px] text-slate-400">{rep.department_name || 'College-Wide'}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">{rep.record_count}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          rep.output_format === 'PDF'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : rep.output_format === 'EXCEL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {rep.output_format}
                        </span>
                      </td>
                      <td className="p-3">
                        {rep.status === 'COMPLETED' ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Completed
                          </span>
                        ) : rep.status === 'GENERATING' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Generating
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            {rep.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        {rep.generated_by_name}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleDownloadFile(
                                rep.id,
                                rep.file?.split('/').pop() || `${rep.title}.${rep.output_format.toLowerCase()}`
                              )
                            }
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all"
                            title="Download Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {['SUPER_ADMIN', 'IQAC'].includes(user?.role || '') && (
                            <button
                              onClick={() => handleArchiveReport(rep.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                              title="Archive Historical Report"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: TEMPLATES MANAGEMENT (Section 7, 10, 11)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Institutional Report Templates</h2>
                <p className="text-xs text-slate-500">
                  Manage college-branded Word (.docx) and Excel templates with automated placeholder injection
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Upload New Template
                </button>
              </div>
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tpl.file_format}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Version {tpl.version}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{tpl.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Assigned to: <strong className="text-slate-800">{tpl.report_type_name}</strong>
                    </p>
                    {tpl.created_by_name && (
                      <p className="text-[11px] text-slate-400">
                        Uploaded by {tpl.created_by_name} on {new Date(tpl.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {tpl.versions?.length || 1} revision(s)
                    </span>
                    <button
                      onClick={() => {
                        setActiveTemplateForVersion(tpl);
                        setIsVersionModalOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload v{tpl.version + 1}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Placeholders Cheat-Sheet (Section 31) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">Supported Word Template Placeholders</h3>
            </div>
            <p className="text-xs text-slate-500">
              Add these placeholder tokens anywhere in your college's official .docx template. The report engine will dynamically replace them with verified data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {placeholdersList.map((p) => (
                <div
                  key={p.key}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <code className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {p.key}
                    </code>
                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(p.key)}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-all"
                    title="Copy to clipboard"
                  >
                    {copiedPlaceholder === p.key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: UPLOAD NEW TEMPLATE
      ───────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-lg w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">Upload Official College Template</h3>
            <p className="text-xs text-slate-500">
              Upload an official .docx or .xlsx layout template to use for automated reporting.
            </p>

            <form onSubmit={handleUploadNewTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official College FDP Report Template"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Report Type</label>
                <select
                  required
                  value={newTemplateReportType}
                  onChange={(e) => setNewTemplateReportType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                >
                  <option value="">Select Target Report Type...</option>
                  {reportTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template Format</label>
                <select
                  value={newTemplateFormat}
                  onChange={(e) => setNewTemplateFormat(e.target.value as ReportOutputFormat)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                >
                  <option value="WORD">Microsoft Word (.docx)</option>
                  <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                  <option value="PDF">PDF Layout (.pdf)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Template File</label>
                <input
                  type="file"
                  required
                  accept=".docx,.xlsx,.pdf"
                  onChange={(e) => setNewTemplateFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTemplate}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  {isSubmittingTemplate ? 'Uploading...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: UPLOAD NEW VERSION (Section 11)
      ───────────────────────────────────────────────────────────── */}
      {isVersionModalOpen && activeTemplateForVersion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-lg w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Upload Version {activeTemplateForVersion.version + 1}
            </h3>
            <p className="text-xs text-slate-500">
              Updating <strong>{activeTemplateForVersion.name}</strong>. Historical reports created with v{activeTemplateForVersion.version} will remain untouched.
            </p>

            <form onSubmit={handleUploadNewVersion} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Template File</label>
                <input
                  type="file"
                  required
                  accept=".docx,.xlsx,.pdf"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Change Summary</label>
                <textarea
                  rows={2}
                  placeholder="Describe formatting or placeholder adjustments..."
                  value={versionSummary}
                  onChange={(e) => setVersionSummary(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTemplate}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  {isSubmittingTemplate ? 'Uploading...' : `Publish Version ${activeTemplateForVersion.version + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
