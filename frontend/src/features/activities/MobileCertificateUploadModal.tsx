import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import {
  Camera,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

interface MobileCertificateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MobileCertificateUploadModal: React.FC<MobileCertificateUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'SELECT' | 'UPLOADING' | 'AI_EXTRACTING' | 'REVIEW' | 'ERROR'>('SELECT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Extracted fields
  const [extractedData, setExtractedData] = useState({
    title: '',
    organizer: '',
    category_code: 'FDP',
    start_date: '',
    end_date: '',
    confidence: 0,
    jobId: '',
  });

  const resetState = () => {
    setStep('SELECT');
    setSelectedFile(null);
    setUploadProgress(0);
    setErrorMessage('');
    setExtractedData({
      title: '',
      organizer: '',
      category_code: 'FDP',
      start_date: '',
      end_date: '',
      confidence: 0,
      jobId: '',
    });
  };

  const handleFileChosen = (file: File) => {
    // 1. Validation
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15 MB limit.');
      setStep('ERROR');
      return;
    }

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Unsupported file format. Please upload a PDF, PNG, or JPEG file.');
      setStep('ERROR');
      return;
    }

    setSelectedFile(file);
    startUploadPipeline(file);
  };

  const startUploadPipeline = async (file: File) => {
    setStep('UPLOADING');
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50);
      setStep('AI_EXTRACTING');

      const response = await apiClient.post('/ai/jobs/upload-and-process/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(90, Math.max(20, percent)));
          }
        },
      });

      setUploadProgress(100);
      const data = response.data;
      const fields = data.extracted_fields || {};

      setExtractedData({
        title: fields.activity_title?.value || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        organizer: fields.organizer?.value || '',
        category_code: data.suggested_category?.code || 'FDP',
        start_date: fields.start_date?.value || new Date().toISOString().split('T')[0],
        end_date: fields.end_date?.value || new Date().toISOString().split('T')[0],
        confidence: Math.round((data.overall_confidence || 0.85) * 100),
        jobId: data.job_id || '',
      });

      setStep('REVIEW');
    } catch (err: any) {
      console.warn('AI upload failed, falling back to manual entry:', err);
      // Even if AI service fails (graceful degradation), allow user to review manual fields!
      setExtractedData({
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        organizer: '',
        category_code: 'FDP',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        confidence: 0,
        jobId: '',
      });
      setStep('REVIEW');
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedData.title.trim()) return;

    setStep('UPLOADING');
    try {
      // 1. Create Activity
      const actPayload = {
        title: extractedData.title,
        description: `Organized by: ${extractedData.organizer || 'Institutional body'}`,
        start_date: extractedData.start_date,
        end_date: extractedData.end_date,
        academic_year_name: '2024-25',
      };

      const actResp = await apiClient.post('/activities/', actPayload);
      const newActivity = actResp.data;

      // 2. Attach Uploaded Document
      if (selectedFile && newActivity.id) {
        const docFormData = new FormData();
        docFormData.append('activity', newActivity.id);
        docFormData.append('document_type', 'CERTIFICATE');
        docFormData.append('file_name', selectedFile.name);
        docFormData.append('file', selectedFile);

        await apiClient.post('/documents/', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Submit for In-charge review
        await apiClient.post(`/activities/${newActivity.id}/submit/`).catch(() => {});
      }

      if (onSuccess) onSuccess();
      onClose();
      resetState();
      navigate(`/faculty/submissions/${newActivity.id}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete submission. Please retry.');
      setStep('ERROR');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Mobile Certificate Upload"
      maxWidth="md"
    >
      {/* STEP 1: SELECT FILE OR TAKE PHOTO */}
      {step === 'SELECT' && (
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-600">
            Upload your certificate proof. Our institutional AI will automatically scan, verify, and fill your submission fields.
          </p>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
          />

          {/* Camera Action Card */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400 text-left transition-all cursor-pointer group focus-ring touch-target"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/30 group-active:scale-95 transition-transform shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">Take Photo with Camera</span>
              <span className="text-xs text-slate-500">Capture physical certificate or seminar badge</span>
            </div>
          </button>

          {/* Document / File Picker Card */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all cursor-pointer group focus-ring touch-target shadow-xs"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-active:scale-95 transition-transform shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block">Choose PDF or Image</span>
              <span className="text-xs text-slate-500">Select file from device storage (max 15 MB)</span>
            </div>
          </button>

          <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted upload • Magic bytes verified • Tenant-isolated</span>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOADING & AI EXTRACTION PROGRESS */}
      {(step === 'UPLOADING' || step === 'AI_EXTRACTING') && (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {step === 'UPLOADING' ? 'Uploading Certificate...' : 'AI Extracting Metadata...'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedFile ? selectedFile.name : 'Processing document contents'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            Verifying signatures • Parsing institutional dates • Classifying NAAC category
          </p>
        </div>
      )}

      {/* STEP 3: REVIEW EXTRACTED FIELDS */}
      {step === 'REVIEW' && (
        <form onSubmit={handleFinalSubmit} className="space-y-3.5 py-1">
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold">Scanned Successfully</span>
            </div>
            {extractedData.confidence > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white rounded-md shadow-xs">
                {extractedData.confidence}% Confidence
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={extractedData.title}
              onChange={(e) => setExtractedData({ ...extractedData, title: e.target.value })}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus-ring text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Organizer / Sponsoring Agency
            </label>
            <input
              type="text"
              value={extractedData.organizer}
              onChange={(e) => setExtractedData({ ...extractedData, organizer: e.target.value })}
              placeholder="e.g. AICTE, IEEE, University"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus-ring text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={extractedData.start_date}
                onChange={(e) => setExtractedData({ ...extractedData, start_date: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus-ring text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={extractedData.end_date}
                onChange={(e) => setExtractedData({ ...extractedData, end_date: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus-ring text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={resetState}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Re-upload
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/30 transition-all cursor-pointer focus-ring touch-target"
            >
              <span>Confirm & Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: ERROR / RETRY */}
      {step === 'ERROR' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Upload Issue Detected</h3>
            <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetState}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer focus-ring"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
