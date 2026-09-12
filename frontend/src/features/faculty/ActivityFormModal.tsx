import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { ActivityType } from '../../types';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('FDP');
  const [organizer, setOrganizer] = useState('');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState('5');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activityTypes: { value: ActivityType; label: string }[] = [
    { value: 'FDP', label: 'Faculty Development Program (FDP)' },
    { value: 'WORKSHOP', label: 'Workshop' },
    { value: 'SEMINAR', label: 'Seminar' },
    { value: 'CONFERENCE', label: 'Conference' },
    { value: 'CERTIFICATION', label: 'Professional Certification' },
    { value: 'PUBLICATION', label: 'Research Publication' },
    { value: 'RESEARCH', label: 'Research Grant / Project' },
    { value: 'TRAINING', label: 'Training / STTP' },
    { value: 'ACHIEVEMENT', label: 'Faculty Achievement' },
    { value: 'AWARD', label: 'Institutional / State / National Award' },
    { value: 'OTHER', label: 'Other Activity' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create Activity
      const activityRes = await apiClient.post('/activities/', {
        title,
        activity_type: activityType,
        organizer,
        venue,
        start_date: startDate || null,
        end_date: endDate || null,
        duration_days: durationDays ? parseInt(durationDays) : null,
        certificate_number: certificateNumber,
        description,
        is_online: isOnline,
      });

      const activityId = activityRes.data.id;

      // 2. Upload Document if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('activity', activityId);
        formData.append('file', selectedFile);
        formData.append('file_name', selectedFile.name);
        formData.append('file_size', selectedFile.size.toString());
        formData.append('mime_type', selectedFile.type);
        formData.append('document_type', 'CERTIFICATE');
        formData.append('is_primary', 'true');

        await apiClient.post('/documents/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setOrganizer('');
      setCertificateNumber('');
      setDescription('');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit activity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Faculty Activity & Upload Certificate" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Activity Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 5-Day National Workshop on AI in Engineering"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {activityTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Organizing Body</label>
            <input
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. IIT Bombay / AICTE ATAL / IEEE"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
            <input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Certificate / Credential Number
            </label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="e.g. ATAL-2024-88412"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={(e) => setIsOnline(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
              Online / Virtual Event
            </label>
          </div>
        </div>

        {/* Certificate File Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Certificate Document (PDF, JPG, PNG)
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-4 text-center transition cursor-pointer bg-slate-50/50">
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }}
              className="hidden"
              id="cert-file-input"
            />
            <label htmlFor="cert-file-input" className="cursor-pointer block">
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-xs">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Click to upload certificate</p>
                  <p className="text-[11px] text-slate-400">PDF, PNG, JPG up to 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Brief Description / Key Learnings</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key outcomes, technologies covered, or paper presentation topic..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Activity & Certificate
          </Button>
        </div>
      </form>
    </Modal>
  );
};
