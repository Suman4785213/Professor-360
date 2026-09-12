import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { ActivityCategory, AcademicYear } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowLeft, X, Sparkles } from 'lucide-react';
import { SmartCertificateUploadModal } from '../ai/SmartCertificateUploadModal';

export const ActivityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [catRes, ayRes] = await Promise.all([
        apiClient.get('/activity-categories/'),
        apiClient.get('/academic-years/'),
      ]);
      const cats = catRes.data.results || catRes.data || [];
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);

      const ays = ayRes.data.results || ayRes.data || [];
      setAcademicYears(ays);
      const activeAy = ays.find((a: AcademicYear) => a.is_current) || ays[0];
      if (activeAy) setAcademicYearId(activeAy.id);
    } catch (e) {
      console.error(e);
      setError('Failed to load activity categories or academic years.');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleBlur = async () => {
    if (!title.trim()) return;
    try {
      const res = await apiClient.post('/activities/check-duplicate/', {
        title: title.trim(),
        academic_year: academicYearId,
        category: categoryId,
      });
      if (res.data.is_duplicate) {
        setDuplicateWarning(res.data.warning || 'A submission with this title already exists in your records.');
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore background duplicate check failure
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmitForm = async (submitForVerification: boolean) => {
    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select an activity category.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Activity
      const catObj = categories.find((c) => c.id === categoryId);
      const payload = {
        title: title.trim(),
        category: categoryId,
        activity_type: catObj?.code || 'OTHER',
        academic_year: academicYearId || null,
        organizer: organizer.trim(),
        location: location.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        duration: duration.trim(),
        description: description.trim(),
        certificate_number: certificateNumber.trim(),
        additional_remarks: additionalRemarks.trim(),
      };

      const res = await apiClient.post('/activities/', payload);
      const activityId = res.data.id;

      // 2. Upload Document if provided
      if (selectedFile) {
        const formData = new FormData();
        formData.append('activity', activityId);
        formData.append('file', selectedFile);
        formData.append('file_name', selectedFile.name);
        formData.append('document_type', 'CERTIFICATE');
        formData.append('is_primary', 'true');

        await apiClient.post('/documents/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. If "Submit for Verification" chosen, transition to PENDING_INCHARGE
      if (submitForVerification) {
        await apiClient.post(`/activities/${activityId}/submit/`, {
          comment: 'Submitted for verification.',
        });
        navigate('/faculty/submissions');
      } else {
        navigate('/faculty/activities');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.title?.[0] ||
        err.message ||
        'Error saving activity.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading form...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/faculty/activities')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Activities
          </button>
          <h2 className="text-xl font-black text-slate-900">Add Academic Activity</h2>
          <p className="text-xs text-slate-500">
            Submit credentials, certificates, or professional achievements for quality verification
          </p>
        </div>

        <button
          onClick={() => setIsAiModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5 shrink-0"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          <span>⚡ Auto-Fill with AI Certificate Intelligence</span>
        </button>
      </div>

      {/* AI Assistant Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-violet-50/60 to-indigo-50/90 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950">
              Have your certificate or proof ready?
            </h4>
            <p className="text-[11px] text-indigo-700">
              Upload your PDF or image to extract title, dates, organizer, duration, and certificate ID with AI.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsAiModalOpen(true)}
          className="shrink-0 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Launch AI Extraction
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Potential Duplicate Detected:</span>
            {duplicateWarning} You may still proceed if this is a distinct iteration.
          </div>
          <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 hover:text-amber-800">
            ✕
          </button>
        </div>
      )}

      <Card title="Activity Information">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Activity Category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="Academic Year"
              required
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              options={academicYears.map((a) => ({
                value: a.id,
                label: `${a.name} ${a.is_current ? '(Current Active)' : ''}`,
              }))}
            />
          </div>

          <Input
            label="Activity Title / Program Name"
            required
            placeholder="e.g. 5-Day Faculty Development Program on Generative AI"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organizing Body / Institution"
              placeholder="e.g. IIT Madras, AICTE ATAL Academy, IEEE"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
            />

            <Input
              label="Venue / Location"
              placeholder="e.g. Online, Campus Center, Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <Input
              label="Duration"
              placeholder="e.g. 5 Days / 30 Hours"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <Input
            label="Certificate / Credential ID"
            placeholder="e.g. ATAL/2024/CSE/9912 or NPTEL24CS88"
            value={certificateNumber}
            onChange={(e) => setCertificateNumber(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Description / Summary</label>
            <textarea
              rows={3}
              placeholder="Brief summary of syllabus, modules learned, or research presented..."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Additional Remarks (Optional)</label>
            <textarea
              rows={2}
              placeholder="Special mentions, awards won, committee appointments..."
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              value={additionalRemarks}
              onChange={(e) => setAdditionalRemarks(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card title="Supporting Certificate / Evidence Document">
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 mb-1">
              Upload Certificate (PDF, PNG, JPG, JPEG)
            </p>
            <p className="text-[11px] text-slate-400 mb-3">Maximum file size: 10 MB</p>
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
            >
              Browse Computer
            </label>
          </div>

          {selectedFile && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold truncate">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{selectedFile.name}</span>
                <span className="text-emerald-600 text-[10px]">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleSubmitForm(false)}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          Save as Draft
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => handleSubmitForm(true)}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit for Verification
        </Button>
      </div>

      {/* Smart Certificate Upload Modal */}
      <SmartCertificateUploadModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        categories={categories}
        academicYears={academicYears}
        onSuccess={(activityId, submitted) => {
          navigate(submitted ? '/faculty/submissions' : '/faculty/activities');
        }}
        onManualFallback={(extracted) => {
          if (extracted) {
            if (extracted.title) setTitle(extracted.title);
            if (extracted.categoryId) setCategoryId(extracted.categoryId);
            if (extracted.academicYearId) setAcademicYearId(extracted.academicYearId);
            if (extracted.organizer) setOrganizer(extracted.organizer);
            if (extracted.startDate) setStartDate(extracted.startDate);
            if (extracted.endDate) setEndDate(extracted.endDate);
            if (extracted.duration) setDuration(extracted.duration);
            if (extracted.certificateNumber) setCertificateNumber(extracted.certificateNumber);
            if (extracted.description) setDescription(extracted.description);
            if (extracted.file) setSelectedFile(extracted.file);
          }
        }}
      />
    </div>
  );
};
