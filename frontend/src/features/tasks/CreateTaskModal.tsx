import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { TaskPriority } from '../../types';
import { Button } from '../../components/ui/Button';
import { X, CheckSquare, Calendar, User, Building2, Layers, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [metricId, setMetricId] = useState('');

  const [usersList, setUsersList] = useState<Array<{ id: string; full_name: string; email: string; role: string }>>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);
  const [academicYearsList, setAcademicYearsList] = useState<Array<{ id: string; name: string }>>([]);
  const [metricsList, setMetricsList] = useState<Array<{ id: string; number: string; title: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Default due date to 7 days from now
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);

      fetchDropdownData();
    }
  }, [isOpen]);

  const fetchDropdownData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes, ayRes, metRes] = await Promise.all([
        apiClient.get('/auth/users/').catch(() => apiClient.get('/users/')).catch(() => ({ data: [] })),
        apiClient.get('/departments/').catch(() => ({ data: [] })),
        apiClient.get('/academic-years/').catch(() => ({ data: [] })),
        apiClient.get('/metrics/').catch(() => ({ data: [] })),
      ]);

      setUsersList(usersRes.data.results || usersRes.data || []);
      setDepartmentsList(deptRes.data.results || deptRes.data || []);
      setAcademicYearsList(ayRes.data.results || ayRes.data || []);
      setMetricsList(metRes.data.results || metRes.data || []);

      if (user?.id) {
        setOwnerId(user.id);
      }
      if (user?.department) {
        setDepartmentId(user.department);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !ownerId) {
      setErrorMsg('Please fill in all required fields (Title, Owner, Due Date).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.post('/tasks/', {
        title: title.trim(),
        description: description.trim(),
        owner: ownerId,
        department: departmentId || null,
        academic_year: academicYearId || null,
        related_metric: metricId || null,
        priority,
        due_date: dueDate,
        status: 'TODO',
      });

      onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.response?.data?.error || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create IQAC Workflow Task</h3>
              <p className="text-xs text-slate-500">Assign quality assurance action items and follow-ups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Upload missing FDP certificates for Q2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Description / Action Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Detailed instructions for the assigned responsible user..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs"
            />
          </div>

          {/* Owner & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Assignee / Owner *
              </label>
              <select
                required
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              >
                <option value="">Select Assignee</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date & Department Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Department (Optional)
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              >
                <option value="">College-Wide / None</option>
                {departmentsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Academic Year & Metric Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Academic Year
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              >
                <option value="">Select Academic Year</option>
                {academicYearsList.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Related Metric (Optional)
              </label>
              <select
                value={metricId}
                onChange={(e) => setMetricId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-slate-800 text-xs bg-white"
              >
                <option value="">None / General</option>
                {metricsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.number} - {m.title.substring(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
