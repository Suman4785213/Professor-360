import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Mail,
  FileText,
  Plus,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit2,
  Flame,
  Users,
  Building,
  GraduationCap,
  Calendar,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Announcement, EmailDeliveryLog, EmailTemplate, UserRole } from '../../types';
import { integrationsApi } from '../../api/integrations';
import { useAuthStore } from '../../stores/authStore';

export const CommunicationCenter: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'announcements' | 'email_logs' | 'templates'>('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [announcementAudience, setAnnouncementAudience] = useState<'ENTIRE_COLLEGE' | 'DEPARTMENT' | 'ROLE' | 'ACADEMIC_YEAR'>('ENTIRE_COLLEGE');
  const [announcementRole, setAnnouncementRole] = useState<UserRole>('FACULTY');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  // Email Logs state
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Email Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  useEffect(() => {
    loadAnnouncements();
    loadEmailLogs();
    loadTemplates();
  }, []);

  const loadAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const data = await integrationsApi.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const loadEmailLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await integrationsApi.getEmailLogs();
      setEmailLogs(data.results || []);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const data = await integrationsApi.getEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load email templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Announcement Handlers
  const handleSaveAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    try {
      const payload: Partial<Announcement> = {
        title: announcementTitle,
        message: announcementContent,
        content: announcementContent,
        priority: announcementPriority,
        audience_type: announcementAudience,
        audience: announcementAudience,
        target_role: announcementAudience === 'ROLE' ? announcementRole : undefined,
        is_active: true,
      };

      if (editingAnnouncementId) {
        await integrationsApi.updateAnnouncement(editingAnnouncementId, payload);
        setActionNotice({ type: 'success', message: 'Announcement updated successfully' });
      } else {
        await integrationsApi.createAnnouncement(payload);
        setActionNotice({ type: 'success', message: 'Institutional announcement published!' });
      }

      setIsAnnouncementModalOpen(false);
      resetAnnouncementForm();
      loadAnnouncements();
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.response?.data?.detail || 'Failed to save announcement' });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await integrationsApi.deleteAnnouncement(id);
      loadAnnouncements();
      setActionNotice({ type: 'success', message: 'Announcement deleted' });
    } catch (err) {
      setActionNotice({ type: 'error', message: 'Failed to delete announcement' });
    }
  };

  const resetAnnouncementForm = () => {
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setAnnouncementPriority('NORMAL');
    setAnnouncementAudience('ENTIRE_COLLEGE');
    setEditingAnnouncementId(null);
  };

  // Email Log Retry Handler
  const handleRetryEmail = async (id: string) => {
    setRetryingLogId(id);
    setActionNotice(null);
    try {
      const res = await integrationsApi.retryEmail(id);
      setActionNotice({ type: res.success ? 'success' : 'error', message: res.message });
      loadEmailLogs();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.error || 'Email retry attempt failed.',
      });
    } finally {
      setRetryingLogId(null);
    }
  };

  // Template Handlers
  const handleEditTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    setTemplateSubject(tpl.subject);
    setTemplateBody(tpl.body);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await integrationsApi.updateEmailTemplate(selectedTemplate.id, {
        subject: templateSubject,
        body: templateBody,
      });
      setIsTemplateModalOpen(false);
      loadTemplates();
      setActionNotice({ type: 'success', message: `Template "${selectedTemplate.name}" updated successfully` });
    } catch (err: any) {
      setActionNotice({ type: 'error', message: 'Failed to update template' });
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setTemplateBody((prev) => prev + ` {{${placeholder}}}`);
  };

  // Filtered email logs
  const filteredLogs = emailLogs.filter((log) => {
    if (logFilterStatus !== 'ALL' && log.status !== logFilterStatus) return false;
    if (logSearchQuery) {
      const query = logSearchQuery.toLowerCase();
      return (
        log.recipient.toLowerCase().includes(query) ||
        log.subject.toLowerCase().includes(query) ||
        log.event.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-brand-600" />
            Communication & Broadcast Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Institutional broadcasts, resilient email delivery monitoring, and automated event templates.
          </p>
        </div>

        {/* Global Action Button */}
        {activeTab === 'announcements' && (
          <Button
            variant="primary"
            onClick={() => {
              resetAnnouncementForm();
              setIsAnnouncementModalOpen(true);
            }}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Publish Announcement
          </Button>
        )}
        {activeTab === 'email_logs' && (
          <Button variant="outline" onClick={loadEmailLogs} className="flex items-center gap-2 self-start sm:self-auto">
            <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            Refresh Delivery Logs
          </Button>
        )}
      </div>

      {/* Alert Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="opacity-70 hover:opacity-100 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Primary Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'announcements'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Campus Announcements ({announcements.length})
        </button>

        <button
          onClick={() => setActiveTab('email_logs')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'email_logs'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email Delivery Monitor ({emailLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Notification Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 dark:bg-brand-950/60 text-brand-600 rounded-xl">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Announcements</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{announcements.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Campus Broadcasts</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                    {announcements.filter((a) => a.is_active).length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">High / Urgent Priority</p>
                  <p className="text-2xl font-bold text-rose-600 mt-0.5">
                    {announcements.filter((a) => a.priority === 'HIGH' || a.priority === 'URGENT').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Announcements List */}
          {isLoadingAnnouncements ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading institutional broadcasts...
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">No Announcements Published</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create institutional announcements to broadcast critical accreditation updates, compliance deadlines,
                or department notifications.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  resetAnnouncementForm();
                  setIsAnnouncementModalOpen(true);
                }}
                className="mt-4"
              >
                Publish First Announcement
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((a) => (
                <Card
                  key={a.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Left accent strip by priority */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      a.priority === 'URGENT'
                        ? 'bg-rose-500'
                        : a.priority === 'HIGH'
                        ? 'bg-amber-500'
                        : a.priority === 'NORMAL'
                        ? 'bg-brand-500'
                        : 'bg-slate-300'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            a.priority === 'URGENT' ? 'danger' : a.priority === 'HIGH' ? 'warning' : 'neutral'
                          }
                          className="text-[10px] uppercase font-bold tracking-wider"
                        >
                          {a.priority}
                        </Badge>
                        <Badge variant="neutral" className="text-[10px]">
                          Audience: {(a.audience_type || a.audience || 'ENTIRE_COLLEGE').replace('_', ' ')}
                          {a.target_role ? ` (${a.target_role})` : ''}
                        </Badge>
                        {a.is_active ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Archived</span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{a.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{a.message || a.content}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2">
                        <span>Published: {new Date(a.created_at).toLocaleDateString()}</span>
                        {a.created_by_name && <span>By: {a.created_by_name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAnnouncementId(a.id);
                          setAnnouncementTitle(a.title);
                          setAnnouncementContent(a.message || a.content || '');
                          setAnnouncementPriority(a.priority);
                          setAnnouncementAudience(a.audience_type || a.audience || 'ENTIRE_COLLEGE');
                          setIsAnnouncementModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EMAIL DELIVERY LOGS */}
      {activeTab === 'email_logs' && (
        <div className="space-y-4">
          {/* Failure Isolation Banner */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Zero-Dependency Failure Resilience Active</p>
                <p className="text-[11px] opacity-90">
                  External email provider failures are safely trapped and recorded. Faculty verification, activity creation,
                  and AQAR workspace operations are 100% protected and never blocked.
                </p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              Zero Core Impact
            </Badge>
          </div>

          {/* Filters Bar */}
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recipient, event, or subject..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="p-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent dark:text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="RETRYING">Retrying</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {isLoadingLogs ? (
              <div className="text-center py-12 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                Loading delivery telemetry...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Email Logs Found</p>
                <p className="text-xs text-slate-400 mt-0.5">Logs appear when system notifications trigger external emails.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Subject & Event</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attempts</th>
                      <th className="py-3 px-4">Last Response</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          {log.recipient}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{log.subject}</p>
                          <span className="text-[10px] font-mono text-slate-400">{log.event}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral" className="text-[10px]">
                            {log.provider}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              log.status === 'SENT'
                                ? 'success'
                                : log.status === 'RETRYING'
                                ? 'warning'
                                : log.status === 'FAILED'
                                ? 'danger'
                                : 'neutral'
                            }
                            className="text-[10px]"
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {log.attempt_count} / {log.max_retries}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500 font-mono">
                          {log.provider_response || log.error_message || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryEmail(log.id)}
                              disabled={retryingLogId === log.id}
                              className="text-[10px] text-brand-600 hover:text-brand-700"
                            >
                              <RefreshCw
                                className={`w-3 h-3 mr-1 ${retryingLogId === log.id ? 'animate-spin' : ''}`}
                              />
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Customize automated email notifications triggered by system events. Placeholders are dynamically interpolated.
            </p>
          </div>

          {isLoadingTemplates ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Custom Templates Found</p>
              <p className="text-xs text-slate-400 mt-1">Default system templates are automatically applied.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" className="font-mono text-[10px]">
                        {tpl.event}
                      </Badge>
                      {tpl.is_active ? (
                        <Badge variant="success" className="text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tpl.name}</h4>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subject: <span className="font-normal font-mono text-slate-600 dark:text-slate-400">{tpl.subject}</span>
                    </p>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-line">
                      {tpl.body}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleEditTemplate(tpl)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      <Modal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title={editingAnnouncementId ? 'Edit Announcement' : 'Publish Institutional Announcement'}
        maxWidth="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Mandatory NAAC Criterion 3 Evidence Deadline"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Priority</label>
              <select
                value={announcementPriority}
                onChange={(e) => setAnnouncementPriority(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Audience</label>
              <select
                value={announcementAudience}
                onChange={(e) => setAnnouncementAudience(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
              >
                <option value="ENTIRE_COLLEGE">Entire College</option>
                <option value="DEPARTMENT">My Department</option>
                <option value="ROLE">Specific Role</option>
                <option value="ACADEMIC_YEAR">Current Academic Year</option>
              </select>
            </div>
          </div>

          {announcementAudience === 'ROLE' && (
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Target Role</label>
              <select
                value={announcementRole}
                onChange={(e) => setAnnouncementRole(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
              >
                <option value="FACULTY">Faculty</option>
                <option value="DEPARTMENT_INCHARGE">Department In-charge</option>
                <option value="HOD">HOD</option>
                <option value="IQAC">IQAC Coordinator</option>
                <option value="COLLEGE_MANAGEMENT">College Management</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Message Content</label>
            <textarea
              rows={4}
              placeholder="Provide clear institutional instructions or guidelines..."
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim()}
            >
              {editingAnnouncementId ? 'Save Changes' : 'Broadcast Now'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* EDIT EMAIL TEMPLATE MODAL */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={`Edit Template: ${selectedTemplate?.name || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Email Subject Line</label>
            <input
              type="text"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-transparent dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">Email Body Template</label>
              <span className="text-[10px] text-slate-400">Click to insert placeholder:</span>
            </div>

            {/* Placeholders Toolbar */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['faculty_name', 'activity_title', 'college_name', 'department_name', 'comment', 'portal_url'].map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    +{`{{${p}}}`}
                  </button>
                )
              )}
            </div>

            <textarea
              rows={6}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-transparent dark:text-white leading-relaxed"
            />
          </div>

          {/* Live Preview Pane */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Interpolation Preview:</p>
            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-line">
              {templateBody
                .replace(/{{faculty_name}}/g, 'Dr. Sunita Patil')
                .replace(/{{activity_title}}/g, 'Cloud Computing Workshop')
                .replace(/{{college_name}}/g, user?.college_name || 'Apex Institute')
                .replace(/{{department_name}}/g, 'Computer Science')
                .replace(/{{comment}}/g, 'Verified and sealed in dossier.')
                .replace(/{{portal_url}}/g, 'https://iqac.college.edu')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveTemplate}>
              Save Template Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
