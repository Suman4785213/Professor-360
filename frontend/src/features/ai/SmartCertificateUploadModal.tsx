import React, { useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  Edit3,
  Send,
  Save,
  X,
  ShieldCheck,
  Check,
  HelpCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import {
  ActivityCategory,
  AcademicYear,
  AIProcessingJob,
  AIDuplicateInfo,
} from '../../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { DuplicateAlert } from './DuplicateAlert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface SmartCertificateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ActivityCategory[];
  academicYears: AcademicYear[];
  onSuccess: (activityId: string, submitted: boolean) => void;
  onManualFallback: (extractedValues?: any) => void;
}

type WizardStep = 'UPLOAD' | 'PROCESSING' | 'REVIEW';

export const SmartCertificateUploadModal: React.FC<SmartCertificateUploadModalProps> = ({
  isOpen,
  onClose,
  categories,
  academicYears,
  onSuccess,
  onManualFallback,
}) => {
  const [step, setStep] = useState<WizardStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Output
  const [job, setJob] = useState<AIProcessingJob | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<AIDuplicateInfo | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [initialExtractedFields, setInitialExtractedFields] = useState<Record<string, string>>({});

  // Editable Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = file.name.toLowerCase();
    const isValid = validExts.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError('Please upload a valid PDF or Image file (PDF, JPG, PNG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB limit.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    startAIAnalysis(file);
  };

  const startAIAnalysis = async (file: File) => {
    setStep('PROCESSING');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/ai/documents/upload-and-process/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const jobData: AIProcessingJob = res.data.job;
      const dupData: AIDuplicateInfo = res.data.duplicate_info;

      setJob(jobData);
      setDuplicateInfo(dupData);

      // Extract field values
      const fields = jobData.extraction_result?.extracted_data || {};
      const initialMap: Record<string, string> = {};

      const extTitle = fields.activity_title?.value || '';
      const extOrg = fields.organizer?.value || '';
      const extStart = fields.start_date?.value || '';
      const extEnd = fields.end_date?.value || '';
      const extDur = fields.duration?.value || '';
      const extCert = fields.certificate_number?.value || '';
      const extVenue = fields.venue?.value || '';
      const extDesc = fields.description?.value || '';

      initialMap.activity_title = extTitle;
      initialMap.organizer = extOrg;
      initialMap.start_date = extStart;
      initialMap.end_date = extEnd;
      initialMap.duration = extDur;
      initialMap.certificate_number = extCert;
      initialMap.venue = extVenue;
      initialMap.description = extDesc;
      setInitialExtractedFields(initialMap);

      setTitle(extTitle);
      setOrganizer(extOrg);
      setStartDate(extStart);
      setEndDate(extEnd);
      setDuration(extDur);
      setCertificateNumber(extCert);
      setVenue(extVenue);
      setDescription(extDesc);

      // Category Suggestion
      const suggestedCatId = jobData.classification_result?.suggested_category;
      if (suggestedCatId) {
        setCategoryId(suggestedCatId);
      } else if (categories.length > 0) {
        setCategoryId(categories[0].id);
      }

      // Default Academic Year
      const currentAy = academicYears.find((ay) => ay.is_current) || academicYears[0];
      if (currentAy) {
        setAcademicYearId(currentAy.id);
      }

      setStep('REVIEW');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'AI processing encountered an error. You can continue with manual entry.'
      );
      setStep('UPLOAD');
    }
  };

  const handleConfirmSubmission = async (submitForVerification: boolean) => {
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select an activity category.');
      return;
    }
    if (duplicateInfo?.has_duplicate_warning && !duplicateAcknowledged) {
      setError('Please acknowledge the duplicate warning before proceeding.');
      return;
    }

    if (!job) return;

    setSubmitting(true);
    setError(null);

    // Compute corrections
    const corrections = [];
    if (title.trim() !== (initialExtractedFields.activity_title || '')) {
      corrections.push({
        field_name: 'activity_title',
        original_value: initialExtractedFields.activity_title || '',
        corrected_value: title.trim(),
      });
    }
    if (organizer.trim() !== (initialExtractedFields.organizer || '')) {
      corrections.push({
        field_name: 'organizer',
        original_value: initialExtractedFields.organizer || '',
        corrected_value: organizer.trim(),
      });
    }
    if (certificateNumber.trim() !== (initialExtractedFields.certificate_number || '')) {
      corrections.push({
        field_name: 'certificate_number',
        original_value: initialExtractedFields.certificate_number || '',
        corrected_value: certificateNumber.trim(),
      });
    }
    if (startDate !== (initialExtractedFields.start_date || '')) {
      corrections.push({
        field_name: 'start_date',
        original_value: initialExtractedFields.start_date || '',
        corrected_value: startDate,
      });
    }

    const payload = {
      title: title.trim(),
      category: categoryId,
      academic_year: academicYearId || null,
      organizer: organizer.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      duration: duration.trim(),
      certificate_number: certificateNumber.trim(),
      venue: venue.trim(),
      description: description.trim(),
      submit_for_verification: submitForVerification,
      corrections: corrections,
    };

    try {
      const res = await apiClient.post(`/ai/jobs/${job.id}/confirm/`, payload);
      onSuccess(res.data.activity_id, submitForVerification);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Failed to confirm and save activity record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldConf = (fieldName: string) => {
    return job?.extraction_result?.extracted_data?.[fieldName];
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  AI Certificate Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Phase 7 AI Layer
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your certificate for automated text extraction & category classification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => onManualFallback()}
                className="text-xs font-semibold underline hover:no-underline text-rose-800 dark:text-rose-200"
              >
                Switch to Manual Entry
              </button>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                }`}
                onClick={() => document.getElementById('ai-file-input')?.click()}
              >
                <input
                  type="file"
                  id="ai-file-input"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Drag and drop your certificate or proof
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Supports PDF, JPG, JPEG, and PNG documents up to 15 MB.
                </p>

                <div className="mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                    Browse Local File
                  </span>
                </div>
              </div>

              {/* Guarantees & Features Callout */}
              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Zero Manual Typing
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Auto-detects title, dates, organizer, duration, and certificate ID.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Confidence Indicators
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Visual high/medium/low confidence indicators on every extracted field.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Human Verification
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    AI never bypasses verification. In-charge, HOD & IQAC remain authoritative.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'PROCESSING' && (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-8 h-8 animate-bounce" />
                </div>
              </div>

              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Analyzing Certificate Intelligence...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Extracting text, computing field confidences, and matching against institutional categories...
              </p>

              <div className="mt-6 flex justify-center items-center gap-2 text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                <span>Filename: {selectedFile?.name}</span>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === 'REVIEW' && (
            <div className="space-y-5">
              {/* Document Summary Bar */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {job?.file_name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/80 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                        {job?.extraction_result?.ai_document_type || 'CERTIFICATE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      <span>{(job?.file_size ? job.file_size / 1024 : 0).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>Processed in {job?.execution_time_ms} ms</span>
                      <span>•</span>
                      <span>Model: {job?.model_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Overall Accuracy:
                  </span>
                  <ConfidenceBadge
                    confidence={job?.extraction_result?.overall_confidence}
                    detected={true}
                    size="md"
                  />
                </div>
              </div>

              {/* Duplicate Warning Alert */}
              <DuplicateAlert
                duplicateInfo={duplicateInfo}
                acknowledged={duplicateAcknowledged}
                onToggleAcknowledge={setDuplicateAcknowledged}
              />

              {/* AI Category Suggestion Pill */}
              {job?.classification_result && (
                <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div>
                      <span className="text-xs font-semibold text-violet-950 dark:text-violet-200">
                        Suggested Category: {job.classification_result.suggested_name || job.classification_result.suggested_code}
                      </span>
                      <span className="text-[11px] text-violet-700 dark:text-violet-300 ml-2">
                        ({Math.round(job.classification_result.confidence * 100)}% match)
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    You can change category below
                  </span>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Activity Title *
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('activity_title')?.confidence}
                      detected={getFieldConf('activity_title')?.detected}
                    />
                  </div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 5-Day FDP on Artificial Intelligence"
                    className="text-sm font-medium"
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Activity Category *
                    </label>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      Official Scheme
                    </span>
                  </div>
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={categories.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.code})`,
                    }))}
                  />
                </div>

                {/* Academic Year */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Academic Year
                    </label>
                    <span className="text-[11px] text-slate-400">Institutional Context</span>
                  </div>
                  <Select
                    value={academicYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    options={academicYears.map((ay) => ({
                      value: ay.id,
                      label: `${ay.name} ${ay.is_current ? '(Current)' : ''}`,
                    }))}
                  />
                </div>

                {/* Organizer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Organizing Institution / Agency
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('organizer')?.confidence}
                      detected={getFieldConf('organizer')?.detected}
                    />
                  </div>
                  <Input
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="e.g. AICTE Training & Learning Academy"
                  />
                </div>

                {/* Certificate Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Certificate ID / Number
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('certificate_number')?.confidence}
                      detected={getFieldConf('certificate_number')?.detected}
                    />
                  </div>
                  <Input
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="e.g. CERT-2025-9012"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Start Date
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('start_date')?.confidence}
                      detected={getFieldConf('start_date')?.detected}
                    />
                  </div>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      End Date
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('end_date')?.confidence}
                      detected={getFieldConf('end_date')?.detected}
                    />
                  </div>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Duration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Duration
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('duration')?.confidence}
                      detected={getFieldConf('duration')?.detected}
                    />
                  </div>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 5 Days / 40 Hours"
                  />
                </div>

                {/* Venue / Mode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Venue / Delivery Mode
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('venue')?.confidence}
                      detected={getFieldConf('venue')?.detected}
                    />
                  </div>
                  <Input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Online / Virtual Mode"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Activity Description / Key Takeaways
                    </label>
                    <ConfidenceBadge
                      confidence={getFieldConf('description')?.confidence}
                      detected={getFieldConf('description')?.detected}
                    />
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the program and acquired competencies..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <button
              onClick={() => {
                onClose();
                onManualFallback({
                  title,
                  categoryId,
                  academicYearId,
                  organizer,
                  startDate,
                  endDate,
                  duration,
                  certificateNumber,
                  description,
                  file: selectedFile,
                });
              }}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Enter Manually Instead
            </button>
          </div>

          <div className="flex items-center gap-2">
            {step === 'REVIEW' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep('UPLOAD')}
                  disabled={submitting}
                  className="text-xs"
                >
                  <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                  Analyze Another File
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleConfirmSubmission(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save as Draft
                </Button>

                <Button
                  onClick={() => handleConfirmSubmission(true)}
                  disabled={submitting}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Confirm & Submit to In-charge
                    </>
                  )}
                </Button>
              </>
            )}

            {step === 'UPLOAD' && (
              <Button variant="outline" onClick={onClose} className="text-xs">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
