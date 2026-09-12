import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { College } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Building,
  Palette,
  Calendar,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export const CollegeSettingsView: React.FC = () => {
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable settings state
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    academic_year_format: 'YYYY-YYYY',
    date_format: 'YYYY-MM-DD',
    timezone: 'Asia/Kolkata',
    default_report_format: 'PDF',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    report_header: '',
    report_footer: '',
    ai_confidence_threshold: 0.75,
  });

  useEffect(() => {
    fetchCollegeSettings();
  }, []);

  const fetchCollegeSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/colleges/current/');
      const data = res.data;
      setCollege(data);
      setFormData({
        name: data.name || '',
        short_name: data.short_name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        academic_year_format: data.academic_year_format || 'YYYY-YYYY',
        date_format: data.date_format || 'YYYY-MM-DD',
        timezone: data.timezone || 'Asia/Kolkata',
        default_report_format: data.default_report_format || 'PDF',
        primary_color: data.branding_config?.primary_color || '#2563eb',
        secondary_color: data.branding_config?.secondary_color || '#1e40af',
        report_header: data.branding_config?.report_header || '',
        report_footer: data.branding_config?.report_footer || '',
        ai_confidence_threshold: data.ai_settings?.confidence_threshold || 0.75,
      });
    } catch (e: any) {
      console.error('Failed to load college settings:', e);
      setErrorMessage('Failed to load institutional settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        name: formData.name,
        short_name: formData.short_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        academic_year_format: formData.academic_year_format,
        date_format: formData.date_format,
        timezone: formData.timezone,
        default_report_format: formData.default_report_format,
        branding_config: {
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          report_header: formData.report_header,
          report_footer: formData.report_footer,
        },
        ai_settings: {
          confidence_threshold: formData.ai_confidence_threshold,
        },
      };

      await apiClient.patch('/colleges/current/settings/', payload);
      setSuccessMessage('Institutional settings and report branding saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading college settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Tenant Configuration
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">College Settings & Branding</h2>
          <p className="text-xs text-slate-500">
            Configure institutional profile, report headers, regional dates, and quality automation settings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
            {college?.code}
          </span>
          <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
            {college?.active_subscription?.plan_details?.name || college?.subscription_plan}
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: IDENTITY */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-black text-slate-900">Institutional Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Institution Legal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Short Name / Display Alias</label>
              <input
                type="text"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Official Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Campus Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">State / Province</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: REPORT BRANDING */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-900">Report Header & Footer Branding</h3>
          </div>

          <p className="text-xs text-slate-500">
            Generated institutional reports (PDF, Word, Excel) will display this branding. College A reports will never leak into other institutions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Primary Branding Color</label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-9 h-9 rounded-xl cursor-pointer border border-slate-200 p-1"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-32 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Default Report Format</label>
              <select
                value={formData.default_report_format}
                onChange={(e) => setFormData({ ...formData, default_report_format: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value="PDF">Portable Document Format (.pdf)</option>
                <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                <option value="WORD">Microsoft Word (.docx)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Report Header Title Line</label>
              <input
                type="text"
                value={formData.report_header}
                onChange={(e) => setFormData({ ...formData, report_header: e.target.value })}
                placeholder="e.g. Apex Institute of Technology — Accredited NAAC A++"
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Report Footer Subtitle / Address</label>
              <input
                type="text"
                value={formData.report_footer}
                onChange={(e) => setFormData({ ...formData, report_footer: e.target.value })}
                placeholder="e.g. Quality Assurance Directorate, Innovation Campus, Bengaluru"
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Live Report Preview Box */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Header Preview:</span>
            <div
              className="mt-2 p-5 rounded-2xl text-white shadow-xs"
              style={{ backgroundColor: formData.primary_color }}
            >
              <h4 className="text-sm font-black text-center uppercase tracking-wide">
                {formData.report_header || formData.name || 'INSTITUTION REPORT HEADER'}
              </h4>
              <p className="text-[11px] text-center opacity-90 mt-0.5">
                {formData.report_footer || 'Accredited Higher Education Institution — Internal Quality Assurance Cell'}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: REGIONAL & AI SETTINGS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">Regional & Quality Automation</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Date Format</label>
              <select
                value={formData.date_format}
                onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">AI Confidence Threshold</label>
              <select
                value={formData.ai_confidence_threshold}
                onChange={(e) => setFormData({ ...formData, ai_confidence_threshold: parseFloat(e.target.value) })}
                className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value={0.70}>70% (Permissive)</option>
                <option value={0.75}>75% (Standard Default)</option>
                <option value={0.85}>85% (High Precision)</option>
                <option value={0.90}>90% (Strict Audit)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 shadow-md"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};
