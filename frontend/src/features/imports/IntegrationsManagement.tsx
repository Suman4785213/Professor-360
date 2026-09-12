import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  FileSpreadsheet,
  Plus,
  Trash2,
  Send,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Globe,
  Clock,
  ExternalLink,
  Mail,
  Calendar,
  Database,
  Lock,
  Layers,
  Activity as ActivityIcon,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { importsApi } from '../../api/imports';
import { integrationsApi } from '../../api/integrations';
import {
  APIKey,
  WebhookEndpoint,
  WebhookDeliveryLog,
  ImportTemplate,
  IntegrationHealth,
  SSOConfiguration,
  StorageMigrationJob,
  EmailDeliveryLog,
} from '../../types';

const SCOPE_OPTIONS = [
  { id: 'faculty:read', label: 'Read Faculty Profiles' },
  { id: 'faculty:write', label: 'Create / Update Faculty' },
  { id: 'activities:read', label: 'Read Faculty Activities' },
  { id: 'activities:write', label: 'Submit Draft Activities (Never auto-verified)' },
  { id: 'evidence:read', label: 'Read Sealed Evidence Metadata' },
  { id: 'metric:read', label: 'Read Criteria & Metrics Status' },
  { id: 'report:read', label: 'Read Institutional Accreditation Reports' },
  { id: 'task:read', label: 'Read IQAC Tasks & Assignments' },
  { id: 'task:write', label: 'Create External Tasks' },
];

const WEBHOOK_EVENTS = [
  { id: 'EVIDENCE_VERIFIED', label: 'Evidence Verified (IQAC Approval)' },
  { id: 'ACTIVITY_CREATED', label: 'New Activity Submitted' },
  { id: 'REPORT_GENERATED', label: 'Institutional Report Generated' },
  { id: 'METRIC_COMPLETED', label: 'Accreditation Metric Completed' },
];

export const IntegrationsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'services' | 'api_keys' | 'webhooks' | 'storage' | 'sso' | 'logs'
  >('services');

  // Integration Health
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'faculty:read',
    'activities:read',
    'metric:read',
  ]);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{ raw_token?: string; name?: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['EVIDENCE_VERIFIED']);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Storage Migration
  const [storageJobs, setStorageJobs] = useState<StorageMigrationJob[]>([]);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [sourceProvider, setSourceProvider] = useState('LOCAL');
  const [targetProvider, setTargetProvider] = useState('S3');

  // SSO Configuration
  const [ssoConfig, setSSOConfig] = useState<SSOConfiguration | null>(null);
  const [isLoadingSSO, setIsLoadingSSO] = useState(false);
  const [ssoDomain, setSSODomain] = useState('');
  const [ssoProtocol, setSSOProtocol] = useState<'OIDC' | 'SAML' | 'GOOGLE' | 'MICROSOFT'>('OIDC');
  const [ssoClientId, setSSOClientId] = useState('');
  const [ssoIssuerUrl, setSSOIssuerUrl] = useState('');
  const [ssoEnforce, setSSOEnforce] = useState(false);
  const [ssoNotice, setSSONotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Unified Delivery Logs
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailDeliveryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsSubTab, setLogsSubTab] = useState<'email' | 'webhook'>('email');
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    loadHealth();
    loadAPIKeys();
    loadWebhooks();
    loadStorageJobs();
    loadSSOConfig();
    loadLogs();
  };

  const loadHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const data = await integrationsApi.getHealth();
      setHealth(data);
    } catch (err) {
      console.warn('Failed to fetch integration health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const loadAPIKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const data = await importsApi.getAPIKeys();
      setApiKeys(data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const loadWebhooks = async () => {
    setIsLoadingWebhooks(true);
    try {
      const data = await importsApi.getWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  const loadStorageJobs = async () => {
    setIsLoadingStorage(true);
    try {
      const data = await integrationsApi.getStorageJobs();
      setStorageJobs(data);
    } catch (err) {
      console.warn('Failed to load storage jobs:', err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const loadSSOConfig = async () => {
    setIsLoadingSSO(true);
    try {
      const data = await integrationsApi.getSSOConfig();
      if (data) {
        setSSOConfig(data);
        setSSODomain(data.domain || '');
        setSSOProtocol(data.protocol || 'OIDC');
        setSSOClientId(data.client_id || '');
        setSSOIssuerUrl(data.issuer_url || '');
        setSSOEnforce(data.enforce_sso || false);
      }
    } catch (err) {
      console.warn('No SSO config or failed:', err);
    } finally {
      setIsLoadingSSO(false);
    }
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [wLogs, eLogsData] = await Promise.all([
        importsApi.getWebhookLogs(),
        integrationsApi.getEmailLogs(),
      ]);
      setWebhookLogs(wLogs);
      setEmailLogs(eLogsData.results || []);
    } catch (err) {
      console.error('Failed to load delivery logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleCreateAPIKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await importsApi.createAPIKey({
        name: newKeyName.trim(),
        scopes: selectedScopes,
      });
      setGeneratedKeyResult({ raw_token: res.raw_token, name: res.name });
      setNewKeyName('');
      loadAPIKeys();
      loadHealth();
    } catch (err) {
      alert('Failed to provision API key.');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to revoke this API key? External systems using it will immediately lose access.'
      )
    )
      return;
    try {
      await importsApi.revokeAPIKey(id);
      loadAPIKeys();
      loadHealth();
    } catch (err) {
      alert('Failed to revoke API key.');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim() || !webhookSecret.trim()) return;
    try {
      await importsApi.createWebhook({
        url: webhookUrl.trim(),
        secret: webhookSecret.trim(),
        events: selectedEvents,
      });
      setIsWebhookModalOpen(false);
      setWebhookUrl('');
      setWebhookSecret('');
      loadWebhooks();
      loadHealth();
    } catch (err) {
      alert('Failed to register webhook endpoint.');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!window.confirm('Delete this webhook endpoint?')) return;
    try {
      await importsApi.deleteWebhook(id);
      loadWebhooks();
      loadHealth();
    } catch (err) {
      alert('Failed to delete webhook.');
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestResult('Sending signed ping...');
    try {
      const res = await importsApi.testWebhook(id);
      setTestResult(res.message);
      loadLogs();
    } catch (err: any) {
      setTestResult(err.response?.data?.message || 'Webhook ping failed.');
    }
  };

  const handleSaveSSO = async () => {
    setSSONotice(null);
    try {
      const data = await integrationsApi.saveSSOConfig({
        domain: ssoDomain.trim(),
        protocol: ssoProtocol,
        client_id: ssoClientId.trim(),
        issuer_url: ssoIssuerUrl.trim(),
        enforce_sso: ssoEnforce,
      });
      setSSOConfig(data);
      setSSONotice({ type: 'success', message: 'Enterprise SSO configuration saved successfully!' });
      loadHealth();
    } catch (err: any) {
      setSSONotice({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save SSO configuration.',
      });
    }
  };

  const handleTestSSO = async () => {
    setSSONotice(null);
    try {
      const res = await integrationsApi.testSSOConfig();
      setSSONotice({ type: res.success ? 'success' : 'error', message: res.message });
    } catch (err: any) {
      setSSONotice({
        type: 'error',
        message: err.response?.data?.message || 'SSO connection test failed.',
      });
    }
  };

  const handleStartMigration = async () => {
    try {
      await integrationsApi.startStorageMigration({
        source_provider: sourceProvider,
        target_provider: targetProvider,
      });
      setIsMigrationModalOpen(false);
      loadStorageJobs();
      setActionNotice({ type: 'success', message: 'Storage migration job queued successfully!' });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start storage migration.');
    }
  };

  const handleRetryEmail = async (id: string) => {
    setRetryingEmailId(id);
    setActionNotice(null);
    try {
      const res = await integrationsApi.retryEmail(id);
      setActionNotice({ type: res.success ? 'success' : 'error', message: res.message });
      loadLogs();
      loadHealth();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.response?.data?.error || 'Email retry failed.',
      });
    } finally {
      setRetryingEmailId(null);
    }
  };

  const handleDownloadCalendar = async (scope: 'all' | 'tasks' | 'deadlines') => {
    try {
      const blob = await integrationsApi.downloadCalendarICS(scope);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iqac_schedule_${scope}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export iCalendar file.');
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'ACTIVE':
      case 'HEALTHY':
        return (
          <Badge variant="success" className="text-[10px] uppercase tracking-wider font-bold">
            <CheckCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      case 'WARNING':
      case 'DEGRADED':
      case 'TESTING':
        return (
          <Badge variant="warning" className="text-[10px] uppercase tracking-wider font-bold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      case 'FAILED':
      case 'DOWN':
      case 'ERROR':
        return (
          <Badge variant="danger" className="text-[10px] uppercase tracking-wider font-bold">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-[10px] uppercase tracking-wider font-bold">
            DISCONNECTED
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-brand-600" />
            External Integrations & Connected Services
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero-dependency resilient integration layer: REST APIs, HMAC webhooks, cloud document storage, calendar sync,
            and enterprise SSO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          {activeTab === 'api_keys' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setGeneratedKeyResult(null);
                setNewKeyName('');
                setIsKeyModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New API Key
            </Button>
          )}
          {activeTab === 'webhooks' && (
            <Button variant="primary" size="sm" onClick={() => setIsWebhookModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Register Webhook
            </Button>
          )}
          {activeTab === 'storage' && (
            <Button variant="primary" size="sm" onClick={() => setIsMigrationModalOpen(true)}>
              <Database className="w-4 h-4 mr-1" />
              Start Migration
            </Button>
          )}
        </div>
      </div>

      {/* Global Action Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Primary Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'services'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ActivityIcon className="w-4 h-4" />
          Connected Services ({health?.overall_status || 'HEALTHY'})
        </button>

        <button
          onClick={() => setActiveTab('api_keys')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'api_keys'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          Institutional API ({apiKeys.length})
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Webhook className="w-4 h-4" />
          Webhooks ({webhooks.length})
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'storage'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Cloud Storage & Migration
        </button>

        <button
          onClick={() => setActiveTab('sso')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'sso'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          Enterprise SSO
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Delivery Logs & Telemetry
        </button>
      </div>

      {/* TAB 1: CONNECTED SERVICES OVERVIEW */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Zero Dependency Architecture Card */}
          <div className="p-5 bg-gradient-to-r from-brand-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-brand-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-base font-bold">Zero-Dependency Failure Resilience Principle</h3>
              </div>
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Active & Enforced
              </Badge>
            </div>
            <p className="text-xs text-brand-100 leading-relaxed max-w-4xl">
              All external services (Email, Webhooks, Calendar, Cloud Storage, and SSO) are decoupled through isolated
              provider interfaces. If an external service experiences timeouts, downtime, or network failures,
              <strong> core IQAC workflows (evidence verification, activity creation, SSR drafting, and tasks) never fail or block.</strong>
            </p>
          </div>

          {/* 6 Connected Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Email Service */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 rounded-xl">
                    <Mail className="w-5 h-5" />
                  </div>
                  {getStatusBadge(health?.services?.email?.status || 'CONNECTED')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Email Dispatch Service</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Automated notifications with 3-attempt exponential retries and template interpolation.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Provider:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {health?.services?.email?.provider || 'SMTP'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Core Failure Impact:</span>
                    <span className="text-emerald-600 font-semibold">Zero (Isolated)</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('logs')}>
                  View Email Logs
                </Button>
              </div>
            </Card>

            {/* 2. Calendar Sync */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  {getStatusBadge(health?.services?.calendar?.status || 'CONNECTED')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Calendar & Deadlines Sync</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    RFC 5545 standard iCalendar (.ics) integration for Google Calendar, Outlook, and Apple iCal.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Protocol:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">RFC 5545 iCal</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Sync Scope:</span>
                    <span className="text-slate-800 dark:text-slate-200">Tasks & AQAR Deadlines</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadCalendar('all')}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export .ics
                </Button>
              </div>
            </Card>

            {/* 3. Cloud Document Storage */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  {getStatusBadge(health?.services?.storage?.status || 'CONNECTED')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cloud Document Storage</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Signed expiring download URLs with SHA-256 integrity checksums.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Active Provider:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {health?.services?.storage?.provider || 'LOCAL_STORAGE'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Signed URL Security:</span>
                    <span className="text-emerald-600 font-semibold">HMAC Tokenized</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('storage')}>
                  Storage Migration
                </Button>
              </div>
            </Card>

            {/* 4. Outbound Webhooks */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                    <Webhook className="w-5 h-5" />
                  </div>
                  {getStatusBadge(health?.services?.webhooks?.status || 'CONNECTED')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Outbound Webhooks</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Real-time HMAC-SHA256 signed event dispatch with 5-minute replay attack prevention.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Active Endpoints:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {webhooks.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Replay Window:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">300s Max</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('webhooks')}>
                  Manage Webhooks
                </Button>
              </div>
            </Card>

            {/* 5. Institutional REST API */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                    <Key className="w-5 h-5" />
                  </div>
                  {getStatusBadge(health?.services?.api?.status || 'CONNECTED')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Institutional REST API</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Granular token scopes (`faculty:read`, `evidence:read`, `metric:read`, `report:read`) & 100 req/min rate limit.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Provisioned Keys:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {apiKeys.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Rate Limit:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">100 req/min</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('api_keys')}>
                  Manage API Keys
                </Button>
              </div>
            </Card>

            {/* 6. Enterprise SSO */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 rounded-xl">
                    <Lock className="w-5 h-5" />
                  </div>
                  {getStatusBadge(ssoConfig?.status || 'INACTIVE')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise SSO & Identity</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    OIDC / SAML authentication with institutional email domain discovery.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Domain:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {ssoConfig?.domain || 'Not Configured'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Enforced:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ssoConfig?.enforce_sso ? 'Yes' : 'Optional'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('sso')}>
                  Configure SSO
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: API KEYS */}
      {activeTab === 'api_keys' && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Provisioned External API Keys</h3>
              <p className="text-xs text-slate-500">
                Authenticate external Campus ERP, HRMS, or custom reporting pipelines. Every external write creates a DRAFT
                record that requires standard faculty review.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setGeneratedKeyResult(null);
                setNewKeyName('');
                setIsKeyModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New API Key
            </Button>
          </div>

          {isLoadingKeys ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Key className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No API Keys Generated</p>
              <p className="text-xs text-slate-400 mt-1">Generate a key to allow external systems to access IQAC data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-4">Key Name</th>
                    <th className="py-2.5 px-4">Prefix</th>
                    <th className="py-2.5 px-4">Authorized Scopes</th>
                    <th className="py-2.5 px-4">Last Used</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{k.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{k.key_prefix}••••••••</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        {k.is_active ? (
                          <Badge variant="success" className="text-[10px]">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            REVOKED
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {k.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px]"
                            onClick={() => handleRevokeKey(k.id)}
                          >
                            Revoke
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
      )}

      {/* TAB 3: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Outgoing Webhooks</h3>
              <p className="text-xs text-slate-500">
                Push verified accreditation events in real-time to external ERPs. Payloads include HMAC-SHA256 signatures
                and adhere to strict data minimization.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsWebhookModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Register Webhook
            </Button>
          </div>

          {isLoadingWebhooks ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading webhooks...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Webhook className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No Webhooks Registered</p>
              <p className="text-xs text-slate-400 mt-1">Register an endpoint to receive real-time verification alerts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((w) => (
                <div
                  key={w.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{w.url}</span>
                      {w.is_active ? (
                        <Badge variant="success" className="text-[10px]">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">
                          DISABLED
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-mono text-[10px]"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button variant="outline" size="sm" onClick={() => handleTestWebhook(w.id)}>
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Ping Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDeleteWebhook(w.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {testResult && (
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl flex items-center justify-between">
                  <span>{testResult}</span>
                  <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: STORAGE & MIGRATION */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Cloud Storage Providers & Migration</h3>
                <p className="text-xs text-slate-500">
                  Manage evidence document repositories. Switch between Local, AWS S3, or Cloud Object stores with
                  asynchronous SHA-256 verified file migration.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsMigrationModalOpen(true)}>
                <Database className="w-4 h-4 mr-1" />
                Start Migration Job
              </Button>
            </div>

            {isLoadingStorage ? (
              <div className="text-center py-12 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                Loading storage status...
              </div>
            ) : storageJobs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">No Migration Jobs Executed</p>
                <p className="text-xs text-slate-400 mt-1">
                  Evidence documents are currently stored safely with HMAC-signed tokenized URLs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-4">Source Provider</th>
                      <th className="py-2.5 px-4">Target Provider</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Files Migrated</th>
                      <th className="py-2.5 px-4">Failed Files</th>
                      <th className="py-2.5 px-4">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {storageJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-[11px]">{job.source_provider}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">{job.target_provider}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              job.status === 'COMPLETED'
                                ? 'success'
                                : job.status === 'RUNNING'
                                ? 'warning'
                                : job.status === 'FAILED'
                                ? 'danger'
                                : 'neutral'
                            }
                            className="text-[10px]"
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {job.migrated_files} / {job.total_files}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-rose-600">
                          {job.failed_files}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(job.created_at).toLocaleString()}
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

      {/* TAB 5: ENTERPRISE SSO */}
      {activeTab === 'sso' && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-3xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-600" />
              Institutional Single Sign-On (SSO)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enable your faculty and staff to log in using institutional identity providers (Google Workspace, Microsoft
              Azure AD, or OIDC / SAML 2.0).
            </p>
          </div>

          {ssoNotice && (
            <div
              className={`p-3 rounded-xl border mb-4 text-xs font-medium ${
                ssoNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {ssoNotice.message}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Institutional Email Domain
              </label>
              <input
                type="text"
                placeholder="college.edu or ait.edu.in"
                value={ssoDomain}
                onChange={(e) => setSSODomain(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs bg-transparent dark:text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Users logging in with this domain are automatically redirected to your institutional IdP.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">SSO Protocol</label>
                <select
                  value={ssoProtocol}
                  onChange={(e) => setSSOProtocol(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
                >
                  <option value="OIDC">OpenID Connect (OIDC)</option>
                  <option value="GOOGLE">Google Workspace</option>
                  <option value="MICROSOFT">Microsoft Azure AD</option>
                  <option value="SAML">SAML 2.0</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Client / App ID</label>
                <input
                  type="text"
                  placeholder="iqac-saas-client"
                  value={ssoClientId}
                  onChange={(e) => setSSOClientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs bg-transparent dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Issuer / Discovery URL</label>
              <input
                type="url"
                placeholder="https://accounts.google.com or https://login.microsoftonline.com/..."
                value={ssoIssuerUrl}
                onChange={(e) => setSSOIssuerUrl(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs bg-transparent dark:text-white"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ssoEnforce}
                  onChange={(e) => setSSOEnforce(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Enforce SSO for Institutional Domain
                </span>
                <span className="text-slate-400 text-[11px]">(Disables password login for institutional users)</span>
              </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={handleTestSSO}>
                Test IdP Connection
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveSSO} disabled={!ssoDomain.trim()}>
                Save SSO Settings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 6: DELIVERY LOGS & TELEMETRY */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
              <button
                onClick={() => setLogsSubTab('email')}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors ${
                  logsSubTab === 'email'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Outbound Email Delivery ({emailLogs.length})
              </button>
              <button
                onClick={() => setLogsSubTab('webhook')}
                className={`pb-2 text-xs font-bold border-b-2 transition-colors ${
                  logsSubTab === 'webhook'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Webhook Dispatches ({webhookLogs.length})
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {logsSubTab === 'email' ? (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              {emailLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No Email Logs Available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                        <th className="py-2.5 px-4">Recipient</th>
                        <th className="py-2.5 px-4">Subject</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Attempts</th>
                        <th className="py-2.5 px-4">Response / Error</th>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {emailLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-mono text-[11px]">{l.recipient}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white line-clamp-1">
                            {l.subject}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge
                              variant={
                                l.status === 'SENT'
                                  ? 'success'
                                  : l.status === 'RETRYING'
                                  ? 'warning'
                                  : l.status === 'FAILED'
                                  ? 'danger'
                                  : 'neutral'
                              }
                              className="text-[10px]"
                            >
                              {l.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px]">
                            {l.attempt_count} / {l.max_retries}
                          </td>
                          <td className="py-2.5 px-4 text-[11px] text-slate-500 font-mono max-w-xs truncate">
                            {l.provider_response || l.error_message || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {(l.status === 'FAILED' || l.status === 'RETRYING') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryEmail(l.id)}
                                disabled={retryingEmailId === l.id}
                                className="text-[10px] text-brand-600"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 mr-1 ${retryingEmailId === l.id ? 'animate-spin' : ''}`}
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
          ) : (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              {webhookLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Webhook className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">No Webhook Logs Available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                        <th className="py-2.5 px-4">Event</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Response Code</th>
                        <th className="py-2.5 px-4">Attempts</th>
                        <th className="py-2.5 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {webhookLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-mono text-[11px] font-semibold">{l.event}</td>
                          <td className="py-2.5 px-4">
                            {l.status === 'DELIVERED' ? (
                              <Badge variant="success" className="text-[10px]">
                                ✓ DELIVERED
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="text-[10px]">
                                ✕ {l.status}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px]">{l.response_status || '—'}</td>
                          <td className="py-2.5 px-4 font-mono text-[11px]">{l.attempt}</td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE API KEY */}
      <Modal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        title="Provision Integration API Key"
        maxWidth="md"
      >
        <div className="space-y-4 py-2 text-xs">
          {generatedKeyResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Copy Secret Key Now
                </p>
                <p className="text-[11px]">
                  For institutional security, this token will <strong>never be shown again</strong>. Store it securely in
                  your external integration vault.
                </p>
              </div>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs break-all select-all flex items-center justify-between gap-2">
                <span>{generatedKeyResult.raw_token}</span>
                <button
                  onClick={() => copyToClipboard(generatedKeyResult.raw_token)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={() => setIsKeyModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Key Name / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Banner SIS Nightly Sync"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Allowed Scopes</label>
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 max-h-48 overflow-y-auto">
                  {SCOPE_OPTIONS.map((sc) => (
                    <label key={sc.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(sc.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedScopes((prev) => [...prev, sc.id]);
                          else setSelectedScopes((prev) => prev.filter((s) => s !== sc.id));
                        }}
                        className="rounded text-brand-600"
                      />
                      <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {sc.id}
                      </span>
                      <span className="text-slate-500 text-[11px]">({sc.label})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsKeyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateAPIKey} disabled={!newKeyName.trim()}>
                  Generate Key
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 2: REGISTER WEBHOOK */}
      <Modal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        title="Register Outgoing Webhook Endpoint"
        maxWidth="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Webhook URL (HTTPS recommended)
            </label>
            <input
              type="url"
              placeholder="https://erp.college.edu/api/iqac-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-transparent dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">HMAC Signing Secret</label>
            <input
              type="text"
              placeholder="Enter shared secret for signature verification"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono bg-transparent dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Subscribed Events</label>
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedEvents((prev) => [...prev, ev.id]);
                      else setSelectedEvents((prev) => prev.filter((s) => s !== ev.id));
                    }}
                    className="rounded text-brand-600"
                  />
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {ev.id}
                  </span>
                  <span className="text-slate-500 text-[11px]">({ev.label})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsWebhookModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateWebhook}
              disabled={!webhookUrl.trim() || !webhookSecret.trim()}
            >
              Register Webhook
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: STORAGE MIGRATION */}
      <Modal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        title="Start Storage Migration Job"
        maxWidth="md"
      >
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-500">
            Asynchronously copies and verifies document checksums between cloud storage providers without service interruption.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Source Provider</label>
              <select
                value={sourceProvider}
                onChange={(e) => setSourceProvider(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
              >
                <option value="LOCAL">Local Filesystem</option>
                <option value="S3">AWS S3</option>
                <option value="AZURE">Azure Blob</option>
                <option value="GCS">Google Cloud Storage</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Target Provider</label>
              <select
                value={targetProvider}
                onChange={(e) => setTargetProvider(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-transparent dark:text-white"
              >
                <option value="S3">AWS S3</option>
                <option value="LOCAL">Local Filesystem</option>
                <option value="AZURE">Azure Blob</option>
                <option value="GCS">Google Cloud Storage</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200 text-[11px]">
            Migration will calculate and verify SHA-256 hashes for every file. Existing evidence documents will remain
            accessible during migration.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsMigrationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartMigration}>
              Queue Migration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
