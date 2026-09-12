import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  History,
  Wand2,
  RefreshCw,
  FileText,
  HelpCircle,
  Layers,
  ChevronRight,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { importsApi } from '../../api/imports';
import { ImportJob, ImportDataType, ImportMode, ImportPreviewRow, ImportErrorDetail } from '../../types';

const DATA_TYPE_OPTIONS: Array<{ id: ImportDataType; title: string; description: string; icon: any }> = [
  {
    id: 'FACULTY',
    title: 'Faculty Profiles',
    description: 'Bulk import professors, assistant professors, qualifications, and employee IDs.',
    icon: Layers,
  },
  {
    id: 'ACTIVITIES',
    title: 'Faculty Activities',
    description: 'Bulk import workshops, FDPs, conferences, and seminars (imported strictly in DRAFT status).',
    icon: FileSpreadsheet,
  },
  {
    id: 'EVIDENCE_METADATA',
    title: 'Evidence Metadata',
    description: 'Import accreditation evidence records and certificate metadata without physical files.',
    icon: FileText,
  },
  {
    id: 'DEPARTMENTS',
    title: 'Departments',
    description: 'Import institutional departments, department codes, and descriptions.',
    icon: Layers,
  },
  {
    id: 'PROGRAMS',
    title: 'Academic Programs',
    description: 'Import undergraduate and postgraduate degree programs (e.g. B.Tech, M.E.).',
    icon: Layers,
  },
  {
    id: 'ACADEMIC_YEARS',
    title: 'Academic Years',
    description: 'Import academic calendar years and start/end dates.',
    icon: Clock,
  },
];

const TARGET_FIELDS_BY_TYPE: Record<ImportDataType, Array<{ field: string; label: string; required?: boolean }>> = {
  FACULTY: [
    { field: 'first_name', label: 'First Name', required: true },
    { field: 'last_name', label: 'Last Name', required: true },
    { field: 'email', label: 'Email Address', required: true },
    { field: 'employee_id', label: 'Employee ID' },
    { field: 'department', label: 'Department (Code or Name)', required: true },
    { field: 'designation', label: 'Designation' },
    { field: 'qualification', label: 'Highest Qualification' },
    { field: 'phone', label: 'Phone Number' },
    { field: 'joining_date', label: 'Joining Date (YYYY-MM-DD)' },
  ],
  ACTIVITIES: [
    { field: 'title', label: 'Activity Title', required: true },
    { field: 'faculty', label: 'Faculty (Email or Employee ID)', required: true },
    { field: 'department', label: 'Department', required: true },
    { field: 'category', label: 'Category / Activity Type' },
    { field: 'academic_year', label: 'Academic Year' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' },
    { field: 'organizer', label: 'Organizing Agency / Host' },
    { field: 'certificate_number', label: 'Certificate Number' },
    { field: 'description', label: 'Remarks / Summary' },
  ],
  EVIDENCE_METADATA: [
    { field: 'title', label: 'Evidence Title', required: true },
    { field: 'faculty', label: 'Faculty Email or ID', required: true },
    { field: 'department', label: 'Department', required: true },
    { field: 'category', label: 'Category' },
    { field: 'academic_year', label: 'Academic Year' },
    { field: 'certificate_number', label: 'Certificate / Ref No' },
    { field: 'organizer', label: 'Organizer' },
    { field: 'document_filename', label: 'Document Filename' },
  ],
  DEPARTMENTS: [
    { field: 'name', label: 'Department Name', required: true },
    { field: 'code', label: 'Department Code', required: true },
    { field: 'description', label: 'Description' },
  ],
  PROGRAMS: [
    { field: 'name', label: 'Program Name', required: true },
    { field: 'code', label: 'Program Code', required: true },
    { field: 'department', label: 'Department Code', required: true },
    { field: 'degree', label: 'Degree (e.g. B.Tech)', required: true },
    { field: 'duration_years', label: 'Duration in Years' },
  ],
  ACADEMIC_YEARS: [
    { field: 'name', label: 'Academic Year (e.g. 2024-25)', required: true },
    { field: 'start_date', label: 'Start Date (YYYY-MM-DD)', required: true },
    { field: 'end_date', label: 'End Date (YYYY-MM-DD)', required: true },
  ],
};

export const ImportCenter: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [selectedDataType, setSelectedDataType] = useState<ImportDataType>('FACULTY');
  const [selectedMode, setSelectedMode] = useState<ImportMode>('INSERT_ONLY');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Active Job State
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [referenceMapping, setReferenceMapping] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    total_rows: number;
    valid_rows: number;
    warning_count: number;
    error_count: number;
    duplicate_count: number;
    preview: ImportPreviewRow[];
    error_details: ImportErrorDetail[];
  } | null>(null);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: string;
    imported_count: number;
    error_count: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const jobs = await importsApi.getJobs();
      setRecentJobs(jobs);
    } catch (err) {
      console.error('Failed to load import jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleOpenWizard = (dataType: ImportDataType) => {
    setSelectedDataType(dataType);
    setSelectedMode('INSERT_ONLY');
    setSelectedFile(null);
    setActiveJob(null);
    setDetectedHeaders([]);
    setColumnMapping({});
    setReferenceMapping({});
    setValidationResults(null);
    setExecutionResult(null);
    setUploadError(null);
    setStep(1);
    setIsWizardOpen(true);
  };

  const handleFileChosen = async (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    try {
      const job = await importsApi.uploadFile(file, selectedDataType, selectedMode);
      setActiveJob(job);
      const headers = job.validation_results?.headers || [];
      setDetectedHeaders(headers);
      setColumnMapping(job.column_mapping || {});
      setStep(3); // Proceed to column mapping
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Failed to upload spreadsheet file. Check file format and size.');
    }
  };

  const handleSaveMappingAndValidate = async () => {
    if (!activeJob) return;
    setIsValidating(true);
    setUploadError(null);

    try {
      // 1. Save mapping
      await importsApi.mapColumns(activeJob.id, columnMapping, referenceMapping, selectedMode);

      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        try {
          await importsApi.saveTemplate({
            name: templateName.trim(),
            data_type: selectedDataType,
            column_mapping: columnMapping,
            reference_mapping: referenceMapping,
          });
        } catch (tErr) {
          console.warn('Could not save template:', tErr);
        }
      }

      // 2. Run validation
      const valRes = await importsApi.validateJob(activeJob.id);
      setValidationResults(valRes);
      setStep(5); // Proceed to preview
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Validation failed. Please review your column mappings.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!activeJob) return;
    setIsExecuting(true);
    setUploadError(null);

    try {
      const res = await importsApi.executeJob(activeJob.id, selectedMode);
      setExecutionResult({
        status: res.status,
        imported_count: res.imported_count,
        error_count: res.error_count,
      });
      setStep(6);
      loadJobs();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Execution failed during database transaction.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadTemplate = async (dataType: ImportDataType, format: 'XLSX' | 'CSV') => {
    try {
      const blob = await importsApi.downloadTemplate(dataType, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType.toLowerCase()}_template.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Could not download template. Please try again.');
    }
  };

  const handleDownloadErrors = async (jobId: string) => {
    try {
      const blob = await importsApi.downloadErrorReport(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_errors_${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Could not download error report.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Institutional Import Center</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Migrate legacy spreadsheets into the IQAC platform with column mapping, automated validation, and duplicate detection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/imports/migration')}
            className="flex items-center gap-2 border-slate-300"
          >
            <Wand2 className="w-4 h-4 text-brand-600" />
            Migration Wizard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/imports/history')}
            className="flex items-center gap-2 border-slate-300"
          >
            <History className="w-4 h-4 text-slate-600" />
            Import History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings/integrations')}
            className="flex items-center gap-2 border-slate-300"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            API & Integrations
          </Button>
        </div>
      </div>

      {/* Import Launchers Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            Select Data Type to Import
          </h2>
          <span className="text-xs text-slate-500 font-medium">Supports .xlsx and .csv files up to 25 MB</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DATA_TYPE_OPTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-500 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-slate-100 group-hover:bg-brand-50 text-slate-700 group-hover:text-brand-600 rounded-lg transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadTemplate(item.id, 'XLSX')}
                        title="Download Excel Template"
                        className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1 bg-slate-50 hover:bg-brand-50 px-2 py-1 rounded border border-slate-200 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        .xlsx
                      </button>
                      <button
                        onClick={() => handleDownloadTemplate(item.id, 'CSV')}
                        title="Download CSV Template"
                        className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1 bg-slate-50 hover:bg-brand-50 px-2 py-1 rounded border border-slate-200 transition-colors"
                      >
                        .csv
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Step-by-step mapping</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenWizard(item.id)}
                    className="flex items-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    Start Import
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Imports Table */}
      <Card
        title="Recent Import Jobs"
        action={
          <Button variant="outline" size="sm" onClick={loadJobs} className="flex items-center gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingJobs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      >
        {isLoadingJobs ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading recent imports...</div>
        ) : recentJobs.length === 0 ? (
          <div className="py-12 text-center">
            <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No import jobs recorded yet</p>
            <p className="text-xs text-slate-500 mt-1">Select a data type above to launch your first spreadsheet import.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Total / Imported</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.slice(0, 8).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate" title={job.original_filename}>
                      {job.original_filename}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{job.data_type_display || job.data_type}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">{job.file_format}</td>
                    <td className="py-3 px-4 text-[11px]">
                      {job.mode === 'INSERT_AND_UPDATE' ? (
                        <span className="text-sky-700 font-medium">Insert & Update</span>
                      ) : (
                        <span className="text-slate-600">Insert Only</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{job.imported_count}</span>
                      <span className="text-slate-400"> / {job.total_rows}</span>
                      {job.error_count > 0 && (
                        <span className="text-rose-500 text-[11px] ml-1.5 font-medium">({job.error_count} failed)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {job.status === 'COMPLETED' && (
                        <Badge variant="success" className="text-[10px]">
                          ✓ Completed
                        </Badge>
                      )}
                      {job.status === 'COMPLETED_WITH_ERRORS' && (
                        <Badge variant="warning" className="text-[10px]">
                          ⚠️ Partial Errors
                        </Badge>
                      )}
                      {job.status === 'READY' && (
                        <Badge variant="info" className="text-[10px]">
                          Validated (Ready)
                        </Badge>
                      )}
                      {job.status === 'FAILED' && (
                        <Badge variant="danger" className="text-[10px]">
                          ✕ Failed
                        </Badge>
                      )}
                      {job.status === 'UPLOADED' && (
                        <Badge variant="neutral" className="text-[10px]">
                          Uploaded
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {job.error_count > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadErrors(job.id)}
                          className="text-[11px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Errors
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 6-STEP INTERACTIVE IMPORT WIZARD MODAL */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title={`Import ${DATA_TYPE_OPTIONS.find((d) => d.id === selectedDataType)?.title || 'Data'}`}
        maxWidth="2xl"
      >
        <div className="space-y-6 py-2">
          {/* Wizard Stepper Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-semibold">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Mode' },
              { num: 3, label: 'Map Columns' },
              { num: 4, label: 'References' },
              { num: 5, label: 'Validate & Preview' },
              { num: 6, label: 'Result' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 ${
                  step === s.num
                    ? 'text-brand-600 font-bold'
                    : step > s.num
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                    step === s.num
                      ? 'bg-brand-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Error Banner */}
          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Import Issue</p>
                <p>{uploadError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Upload your institutional spreadsheet in Excel (.xlsx) or CSV format. Maximum file size is 25 MB.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand-500 hover:bg-slate-50/50 transition-all rounded-2xl p-8 text-center cursor-pointer"
              >
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select spreadsheet or drag and drop'}
                </p>
                <p className="text-xs text-slate-500 mt-1">.xlsx or .csv up to 25 MB</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-brand-600" />
                  Need the sample format first?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadTemplate(selectedDataType, 'XLSX')}
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    Download .xlsx
                  </button>
                  <span>|</span>
                  <button
                    onClick={() => handleDownloadTemplate(selectedDataType, 'CSV')}
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    Download .csv
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MODE SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">Select how the system should handle existing records during import:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setSelectedMode('INSERT_ONLY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMode === 'INSERT_ONLY'
                      ? 'border-brand-600 bg-brand-50/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">Insert Only</span>
                    {selectedMode === 'INSERT_ONLY' && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Safely skips or flags duplicate records (e.g. matching employee IDs or existing activity titles). Never modifies existing data.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedMode('INSERT_AND_UPDATE')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMode === 'INSERT_AND_UPDATE'
                      ? 'border-brand-600 bg-brand-50/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">Insert & Update</span>
                    {selectedMode === 'INSERT_AND_UPDATE' && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Inserts new rows and updates existing draft details. Verified institutional evidence is strictly protected and never modified.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setStep(3)}>
                  Continue to Mapping
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Map Spreadsheet Columns to System Fields</p>
                  <p className="text-[11px] text-slate-500">Auto-suggested based on detected column headers.</p>
                </div>
                <Badge variant="info" className="text-[11px]">
                  {detectedHeaders.length} Columns Detected
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Spreadsheet Column</th>
                      <th className="py-2.5 px-4">Maps to Target Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedHeaders.map((header) => (
                      <tr key={header} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{header}</td>
                        <td className="py-2.5 px-4">
                          <select
                            value={columnMapping[header] || ''}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [header]: e.target.value,
                              }))
                            }
                            className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-brand-500"
                          >
                            <option value="">-- Do Not Import / Skip --</option>
                            {TARGET_FIELDS_BY_TYPE[selectedDataType]?.map((tf) => (
                              <option key={tf.field} value={tf.field}>
                                {tf.label} {tf.required ? '*(Required)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Template save option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <span className="font-semibold text-slate-800">Save this mapping configuration as a reusable template</span>
                </label>
                {saveAsTemplate && (
                  <input
                    type="text"
                    placeholder="e.g. Standard Anna Univ Faculty Excel Format"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setStep(4)}>
                  Next: Reference Aliases
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: REFERENCE MAPPING */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-800">Reference Aliases & Normalization</p>
                <p className="text-[11px] text-slate-500">
                  Map spreadsheet abbreviations (e.g. 'CSE', 'IT', 'MECH') to official departments registered in your institution.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>The platform will automatically resolve standard department codes and names.</span>
                </div>
                <p className="text-xs text-slate-500">
                  If your spreadsheet uses customized department abbreviations, they can be matched during validation.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveMappingAndValidate}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validating Rows...
                    </>
                  ) : (
                    <>
                      Validate & Preview
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: VALIDATE & PREVIEW */}
          {step === 5 && validationResults && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 font-medium">Total Rows</span>
                  <p className="text-lg font-bold text-slate-900">{validationResults.total_rows}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] text-emerald-700 font-medium">Valid Rows</span>
                  <p className="text-lg font-bold text-emerald-700">{validationResults.valid_rows}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                  <span className="text-[11px] text-amber-700 font-medium">Warnings / Duplicates</span>
                  <p className="text-lg font-bold text-amber-700">
                    {validationResults.warning_count + validationResults.duplicate_count}
                  </p>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                  <span className="text-[11px] text-rose-700 font-medium">Errors</span>
                  <p className="text-lg font-bold text-rose-700">{validationResults.error_count}</p>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Accreditation Safeguard:</strong> Imported records will initialize in <strong>DRAFT</strong> status. They require formal institutional verification before sealing into final accreditation evidence.
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Primary Field</th>
                      <th className="py-2 px-3">Details / Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {validationResults.preview.map((p) => (
                      <tr key={p.row_number} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-500">{p.row_number}</td>
                        <td className="py-2 px-3">
                          {p.status === 'NEW' && <Badge variant="success">NEW</Badge>}
                          {p.status === 'UPDATE' && <Badge variant="info">UPDATE</Badge>}
                          {p.status === 'DUPLICATE' && <Badge variant="warning">DUPLICATE</Badge>}
                          {p.status === 'INVALID' || p.errors.length > 0 ? (
                            <Badge variant="danger">INVALID</Badge>
                          ) : null}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-xs">
                          {p.mapped_data.title || p.mapped_data.email || p.mapped_data.name || '—'}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {p.errors.length > 0 ? (
                            <span className="text-rose-600 font-semibold">{p.errors[0].message}</span>
                          ) : p.warnings.length > 0 ? (
                            <span className="text-amber-600">{p.warnings[0]}</span>
                          ) : (
                            <span className="text-emerald-600">✓ Ready for import</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Adjust Mapping
                </Button>
                <div className="flex gap-2">
                  {validationResults.error_count > 0 && activeJob && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadErrors(activeJob.id)}
                      className="text-xs text-rose-600 border-rose-200"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Error CSV
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleExecuteImport}
                    disabled={isExecuting || validationResults.valid_rows === 0}
                    className="flex items-center gap-2"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        Import {validationResults.valid_rows} Valid Rows
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: EXECUTION RESULT */}
          {step === 6 && executionResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Spreadsheet Import Completed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Successfully imported{' '}
                  <span className="font-bold text-slate-900">{executionResult.imported_count}</span> records into your
                  institutional repository.
                </p>
              </div>

              {executionResult.error_count > 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  {executionResult.error_count} rows were skipped due to validation constraints.
                </p>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Data Type:</span>
                  <span className="font-bold text-slate-900">{selectedDataType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Initial Verification Status:</span>
                  <Badge variant="neutral">DRAFT</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Transaction Safety:</span>
                  <span className="font-bold text-emerald-600">Atomic Commit Verified</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setIsWizardOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsWizardOpen(false);
                    if (selectedDataType === 'FACULTY') navigate('/admin/users');
                    else if (selectedDataType === 'ACTIVITIES') navigate('/faculty/activities');
                    else navigate('/imports/history');
                  }}
                >
                  View Records
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
