import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  UserPlus,
  Building2,
  Mail,
  Lock,
  User,
  Briefcase,
  Phone,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface FacultyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDepartmentId?: string;
}

export const FacultyRegistrationModal: React.FC<FacultyRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDepartmentId,
}) => {
  const { user } = useAuthStore();

  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    department: defaultDepartmentId || '',
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    designation: 'Assistant Professor',
    phone: '',
    password: '',
    confirm_password: '',
  });

  // Verify role permission (IQAC Coordinator or College Management only)
  const isAuthorized = user?.role === 'IQAC' || user?.role === 'COLLEGE_MANAGEMENT';

  // Load departments when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setForm((prev) => ({
        ...prev,
        department: defaultDepartmentId || prev.department,
        first_name: '',
        last_name: '',
        email: '',
        employee_id: '',
        phone: '',
        password: '',
        confirm_password: '',
      }));

      fetchDepartments();
    }
  }, [isOpen, defaultDepartmentId]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await apiClient.get('/departments/');
      const list = res.data?.results || res.data || [];
      setDepartments(list);
      if (!defaultDepartmentId && list.length > 0) {
        setForm((prev) => ({ ...prev, department: prev.department || list[0].id }));
      }
    } catch (e) {
      console.error('Failed to load departments:', e);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!isAuthorized) {
      setError('Access denied. Only IQAC Coordinator and College Management are authorized to register faculty.');
      return;
    }

    if (!form.department) {
      setError('Please select an academic department.');
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Faculty first name and last name are required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Institutional email address is required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        college: user?.college,
        department: form.department,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        employee_id: form.employee_id.trim(),
        designation: form.designation,
        phone: form.phone.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      };

      const res = await apiClient.post('/auth/register/faculty/', payload);
      setSuccessMsg(res.data?.message || `Faculty member ${form.first_name} ${form.last_name} registered successfully!`);

      if (onSuccess) {
        onSuccess();
      }

      // Reset form after short delay or keep open for multiple registrations
      setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          first_name: '',
          last_name: '',
          email: '',
          employee_id: '',
          phone: '',
          password: '',
          confirm_password: '',
        }));
      }, 1000);
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to register faculty member.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error) {
        msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        msg = `${firstKey.replace(/_/g, ' ')}: ${Array.isArray(val) ? val[0] : val}`;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Faculty Registration" maxWidth="xl">
      <div className="space-y-5">
        {/* Institutional Tenant Lock Notice */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-500 font-medium">Institution Tenant: </span>
              <span className="font-bold text-slate-900 truncate">
                {user?.college_name || 'Assigned Institution'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[10px] shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span>Authorized by {user?.role === 'IQAC' ? 'IQAC Coordinator' : 'College Management'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Academic Department <span className="text-rose-500">*</span>
              </label>
              <select
                id="modal-faculty-department-select"
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                disabled={loadingDepartments || departments.length === 0}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition disabled:bg-slate-100"
              >
                {loadingDepartments ? (
                  <option value="">Loading departments...</option>
                ) : departments.length === 0 ? (
                  <option value="">No departments available</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Academic Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation <span className="text-rose-500">*</span>
              </label>
              <select
                id="modal-faculty-designation-select"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-fname-input"
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Dr. Ramesh"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-lname-input"
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Shinde"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Institutional Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Institutional Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-email-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="ramesh.shinde@institution.edu"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Faculty / Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-empid-input"
                  type="text"
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  placeholder="e.g. FAC-2026-042"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-phone-input"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Initial Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-password-input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="modal-faculty-confirmpass-input"
                  type="password"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password to confirm"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="modal-submit-faculty-btn"
              type="submit"
              variant="primary"
              isLoading={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>Register Faculty Member</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
