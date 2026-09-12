import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { NotificationPreference } from '../../types';
import { Button } from '../../components/ui/Button';
import { X, Bell, Mail, MessageSquare, PhoneCall, Smartphone, ShieldCheck, CheckSquare, Clock, FileSpreadsheet, FileText, Settings2 } from 'lucide-react';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreference>({
    channel_in_app: true,
    channel_email: false,
    channel_sms: false,
    channel_whatsapp: false,
    channel_push: false,
    category_verification: true,
    category_tasks: true,
    category_deadlines: true,
    category_aqar_ssr: true,
    category_reports: true,
    category_system: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/notifications/preferences/');
      if (res.data) {
        setPreferences(res.data);
      }
    } catch (e) {
      console.error('Error fetching preferences:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.post('/notifications/preferences/', preferences);
      setPreferences(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error saving preferences:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Configure alert channels and event subscriptions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading preferences...</div>
          ) : (
            <>
              {/* Delivery Channels */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Delivery Channels
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-brand-600" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">In-App Alerts</span>
                        <span className="text-[11px] text-slate-500">Notification center and top bar badges</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.channel_in_app}
                      onChange={(e) => setPreferences({ ...preferences, channel_in_app: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Email Notifications</span>
                        <span className="text-[11px] text-slate-400">Email digests and high-priority dispatches (Future)</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.channel_email}
                      onChange={(e) => setPreferences({ ...preferences, channel_email: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-600 block">WhatsApp & SMS</span>
                        <span className="text-[11px] text-slate-400">Instant workflow escalation alerts (Future)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">
                      Roadmap
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow Event Subscriptions */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Subscribed Categories
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-800">Verification & Review Actions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.category_verification}
                      onChange={(e) => setPreferences({ ...preferences, category_verification: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-medium text-slate-800">Assigned Tasks & Status Updates</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.category_tasks}
                      onChange={(e) => setPreferences({ ...preferences, category_tasks: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-slate-800">Deadlines & Approaching Due Dates</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.category_deadlines}
                      onChange={(e) => setPreferences({ ...preferences, category_deadlines: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                      <span className="text-xs font-medium text-slate-800">AQAR / SSR Workspace Milestones</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.category_aqar_ssr}
                      onChange={(e) => setPreferences({ ...preferences, category_aqar_ssr: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-violet-600" />
                      <span className="text-xs font-medium text-slate-800">Report Generation & Analytics</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.category_reports}
                      onChange={(e) => setPreferences({ ...preferences, category_reports: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded-sm border-slate-300 focus:ring-brand-500"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {saveSuccess ? (
            <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
              Preferences saved successfully!
            </span>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
