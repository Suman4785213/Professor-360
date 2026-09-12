import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Sliders,
  Search,
  Info,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { billingApi } from '../../api/billing';
import { apiClient } from '../../api/client';
import {
  RevenueAnalytics,
  AdminFeatureOverride,
  ReconciliationReport,
  College
} from '../../types';

export const AdminBillingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'overrides'>('overview');
  
  // Data states
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [overrides, setOverrides] = useState<AdminFeatureOverride[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  
  // Filters
  const [reconcileFilter, setReconcileFilter] = useState<'ALL' | 'MISMATCH' | 'MATCH' | 'UNKNOWN'>('ALL');
  const [overrideSearch, setOverrideSearch] = useState('');
  
  // Modal states
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    college: '',
    feature_key: 'ai_copilot',
    is_enabled: true,
    reason: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsData, overridesData, reconData, collegesRes] = await Promise.all([
        billingApi.getAdminRevenueAnalytics().catch((err) => {
          console.error('Failed to load revenue analytics:', err);
          return null;
        }),
        billingApi.getAdminOverrides().catch((err) => {
          console.error('Failed to load overrides:', err);
          return [];
        }),
        billingApi.reconcileSubscriptions().catch((err) => {
          console.error('Failed to load initial reconciliation:', err);
          return null;
        }),
        apiClient.get('/colleges/').catch(() => ({ data: { results: [] } }))
      ]);

      setAnalytics(analyticsData);
      setOverrides(overridesData);
      setReconciliation(reconData);
      const cols = collegesRes.data.results || collegesRes.data || [];
      setColleges(cols);
      if (cols.length > 0 && !overrideForm.college) {
        setOverrideForm(prev => ({ ...prev, college: cols[0].id }));
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to load billing administrative data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      const report = await billingApi.reconcileSubscriptions();
      setReconciliation(report);
      setNotification({
        type: 'success',
        message: `Audit complete: ${report.matches} matched, ${report.mismatches} mismatched across ${report.total_audited} subscriptions.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Subscription reconciliation failed.'
      });
    } finally {
      setReconciling(false);
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.college || !overrideForm.feature_key || !overrideForm.reason.trim()) {
      setNotification({
        type: 'error',
        message: 'College, feature key, and justification reason are mandatory.'
      });
      return;
    }

    setOverrideSubmitting(true);
    try {
      const dateWithTime = new Date(`${overrideForm.valid_until}T23:59:59Z`).toISOString();
      await billingApi.createAdminOverride({
        college: overrideForm.college,
        feature_key: overrideForm.feature_key,
        is_enabled: overrideForm.is_enabled,
        reason: overrideForm.reason.trim(),
        valid_until: dateWithTime,
      });

      setNotification({
        type: 'success',
        message: `Feature override successfully granted for ${overrideForm.feature_key}.`
      });
      setIsOverrideModalOpen(false);
      setOverrideForm(prev => ({ ...prev, reason: '' }));
      // Refresh overrides & analytics
      const updatedOverrides = await billingApi.getAdminOverrides();
      setOverrides(updatedOverrides);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to create feature override.'
      });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleRevokeOverride = async (overrideId: string, featureKey: string, collegeName: string) => {
    if (!window.confirm(`Revoke temporary override for "${featureKey}" on ${collegeName}? Normal plan entitlements will resume immediately.`)) {
      return;
    }

    try {
      await billingApi.revokeAdminOverride(overrideId);
      setNotification({
        type: 'success',
        message: `Override revoked for ${featureKey}. Plan entitlements restored.`
      });
      const updatedOverrides = await billingApi.getAdminOverrides();
      setOverrides(updatedOverrides);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to revoke feature override.'
      });
    }
  };

  const filteredReconcileResults = reconciliation?.results.filter(item => {
    if (reconcileFilter === 'ALL') return true;
    return item.reconciliation_status === reconcileFilter;
  }) || [];

  const filteredOverrides = overrides.filter(ov => {
    if (!overrideSearch) return true;
    const q = overrideSearch.toLowerCase();
    return (
      ov.college_name.toLowerCase().includes(q) ||
      ov.feature_key.toLowerCase().includes(q) ||
      ov.reason.toLowerCase().includes(q) ||
      ov.created_by_name.toLowerCase().includes(q)
    );
  });

  const featureOptions = [
    { key: 'ai_copilot', label: 'IQAC AI Copilot & Chat Assistant' },
    { key: 'ai_verification', label: 'AI Certificate Intelligence & Auto-Fill' },
    { key: 'sso', label: 'Enterprise Institutional Single Sign-On (SSO)' },
    { key: 'advanced_analytics', label: 'Executive Analytics & Trend Forecasting' },
    { key: 'custom_reports', label: 'Custom NAAC/AQAR/SSR Report Builder' },
    { key: 'external_integrations', label: 'Webhooks & External REST API' },
    { key: 'automated_workflows', label: 'Automated Escalation & Deadline Rules' },
    { key: 'export_excel', label: 'Controlled Excel & ZIP Evidence Exports' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200/60">
              Super Admin SaaS Operations
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Gateway Sync
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS Billing & Revenue Operations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Commercial SaaS oversight • MRR tracking • Gateway reconciliation • Entitlement overrides
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh billing data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>

          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <ShieldCheck className={`w-4 h-4 ${reconciling ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
            {reconciling ? 'Auditing...' : 'Run Global Audit'}
          </button>

          <button
            onClick={() => setIsOverrideModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Grant Feature Override
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Recurring</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{analytics ? (analytics.mrr || 0).toLocaleString('en-IN') : '0'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>ARR Run Rate: </span>
              <strong className="text-slate-700">₹{analytics ? (analytics.arr || 0).toLocaleString('en-IN') : '0'}</strong>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-80" />
        </div>

        {/* Active Subscriptions Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {analytics?.active_subscriptions ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                {analytics?.trial_subscriptions ?? 0} In Trial
              </span>
              <span className="text-xs text-slate-500">
                of {analytics?.total_tenants ?? 0} institutions
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
        </div>

        {/* Past-Due / Grace Period Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Past Due / Grace</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {analytics?.past_due_subscriptions ?? 0}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>14-day grace protects data access</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-80" />
        </div>

        {/* Payment Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Success Rate</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {analytics ? (analytics.payment_success_rate || 0).toFixed(1) : '100.0'}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className="font-semibold text-emerald-600">{analytics?.successful_payments_count ?? 0} succeeded</span>
              <span>•</span>
              <span className="text-rose-600">{analytics?.failed_payments_count ?? 0} failed</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 opacity-80" />
        </div>
      </div>

      {/* Data Sufficiency Warning Banner (when billing history is young) */}
      {analytics && !analytics.has_sufficient_data && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-amber-900">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-950">Limited Historical Billing Data</div>
            <p className="text-amber-800/90 mt-0.5">
              MRR and ARR represent current annualized run-rates. As recurring subscription renewals and invoice payments complete, multi-month cohort retention and churn curves will calibrate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Plan Distribution & Metrics
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reconciliation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Subscription Gateway Reconciliation
          {reconciliation && reconciliation.mismatches > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full border border-rose-200">
              {reconciliation.mismatches} Mismatch
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('overrides')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overrides'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Controlled Feature Overrides
          {overrides.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
              {overrides.length} Active
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Plan Distribution & SaaS Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Plan Distribution Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">Institutional Plan Distribution</h2>
              <span className="text-xs text-slate-500">Live active subscriptions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Starter Plan */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter Plan</span>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      ₹15,000/mo
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {analytics?.plan_distribution?.['STARTER'] ?? 0}
                    <span className="text-sm font-medium text-slate-500 ml-2">colleges</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Core evidence repository, up to 50 faculty, 5GB secure evidence storage.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Standard Support</span>
                  <span className="font-semibold text-slate-700">Essential IQAC</span>
                </div>
              </div>

              {/* Professional Plan */}
              <div className="bg-white p-5 rounded-2xl border-2 border-indigo-500 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-bl-xl">
                  Most Popular
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Professional Plan</span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      ₹35,000/mo
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {analytics?.plan_distribution?.['PROFESSIONAL'] ?? 0}
                    <span className="text-sm font-medium text-slate-500 ml-2">colleges</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    AI verification, AI Copilot, AQAR/SSR intelligence, up to 200 faculty, 25GB storage.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Priority Support</span>
                  <span className="font-semibold text-indigo-600">Full AI Suite</span>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Enterprise Plan</span>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      ₹75,000/mo
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {analytics?.plan_distribution?.['ENTERPRISE'] ?? 0}
                    <span className="text-sm font-medium text-slate-500 ml-2">colleges</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Custom frameworks, Institutional SSO, Dedicated account manager, 100GB storage.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>24/7 Phone + SLA</span>
                  <span className="font-semibold text-purple-600">Institutional SSO</span>
                </div>
              </div>
            </div>
          </div>

          {/* SaaS Commercial Governance Invariants */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              SaaS Institutional Governance & Data Preservation Standards
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              The College IQAC platform is engineered around unbreachable data safety rules. Academic and accreditation compliance data cannot be deleted or hostage-held due to commercial subscription transitions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  1. Zero Data Destruction
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Trial expiry, payment failure, or cancellation never deletes verified faculty records, evidence files, AQAR/SSR responses, or audit logs.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  2. 14-Day Grace Period
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Institutions with past-due invoices retain full read access, report viewing, and verification history for 14 days before high-consumption actions are restricted.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  3. Safe Downgrade Gate
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Downgrades warn when current storage or faculty exceed the new tier limits. Existing data is sealed; only new uploads and additions are blocked.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Subscription Reconciliation Tool */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Reconciliation Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audited</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{reconciliation?.total_audited ?? 0}</div>
              <span className="text-xs text-slate-400">Subscriptions audited</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Gateway Matches</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{reconciliation?.matches ?? 0}</div>
              <span className="text-xs text-emerald-600/80">Local and gateway match</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Mismatches</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">{reconciliation?.mismatches ?? 0}</div>
              <span className="text-xs text-rose-600/80">Require administrative review</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Unknown / Pending</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{reconciliation?.unknowns ?? 0}</div>
              <span className="text-xs text-amber-600/80">Offline / mock provider</span>
            </div>
          </div>

          {/* Audit Controls & Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Status:</span>
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'MISMATCH', 'MATCH', 'UNKNOWN'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setReconcileFilter(filter)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                        reconcileFilter === filter
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                Audited at: {reconciliation?.audited_at ? new Date(reconciliation.audited_at).toLocaleString() : 'Never'}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">College / Institution</th>
                    <th className="px-5 py-3">Local Status</th>
                    <th className="px-5 py-3">Gateway Status</th>
                    <th className="px-5 py-3">Reconciliation</th>
                    <th className="px-5 py-3">Last Audited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReconcileResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs">
                        No subscription records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredReconcileResults.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {item.college}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {item.local_status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {item.provider_status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {item.reconciliation_status === 'MATCH' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              MATCH
                            </span>
                          ) : item.reconciliation_status === 'MISMATCH' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              MISMATCH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Info className="w-3.5 h-3.5 text-amber-600" />
                              UNKNOWN
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {new Date(item.last_audited).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Controlled Feature Overrides Manager */}
      {activeTab === 'overrides' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Temporary Entitlement Overrides</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grant or restrict premium features for pilot trials or institutional agreements. Overrides enforce an expiration date and mandatory justification log.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search college, feature, reason..."
                  value={overrideSearch}
                  onChange={e => setOverrideSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>

              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Grant Override
              </button>
            </div>
          </div>

          {/* Overrides Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">College</th>
                    <th className="px-5 py-3">Feature Key</th>
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3">Justification Reason</th>
                    <th className="px-5 py-3">Valid Range</th>
                    <th className="px-5 py-3">Granted By</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOverrides.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-xs">
                        No manual feature overrides found. Click "+ Grant Override" to add an institutional entitlement.
                      </td>
                    </tr>
                  ) : (
                    filteredOverrides.map(ov => {
                      const isExpired = !ov.is_currently_valid || !ov.is_active;
                      return (
                        <tr key={ov.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {ov.college_name}
                          </td>
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                              {ov.feature_key}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {isExpired ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                Expired / Inactive
                              </span>
                            ) : ov.is_enabled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Unlock className="w-3 h-3 text-emerald-600" />
                                Granted (Enabled)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3 text-rose-600" />
                                Restricted (Disabled)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600 max-w-xs truncate" title={ov.reason}>
                            {ov.reason}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            <div>From: {new Date(ov.valid_from).toLocaleDateString()}</div>
                            <div className="font-medium text-slate-700">Until: {new Date(ov.valid_until).toLocaleDateString()}</div>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {ov.created_by_name || 'Super Admin'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {!isExpired && (
                              <button
                                onClick={() => handleRevokeOverride(ov.id, ov.feature_key, ov.college_name)}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grant Feature Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Grant Feature Override</h3>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOverride} className="mt-4 space-y-4">
              {/* College Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Select Institution
                </label>
                <select
                  value={overrideForm.college}
                  onChange={e => setOverrideForm(prev => ({ ...prev, college: e.target.value }))}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || 'No Code'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature Key */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Feature Key
                </label>
                <select
                  value={overrideForm.feature_key}
                  onChange={e => setOverrideForm(prev => ({ ...prev, feature_key: e.target.value }))}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {featureOptions.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* State Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Entitlement Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideForm(prev => ({ ...prev, is_enabled: true }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      overrideForm.is_enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Grant Access (Enable)
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideForm(prev => ({ ...prev, is_enabled: false }))}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      !overrideForm.is_enabled
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Restrict Access (Disable)
                  </button>
                </div>
              </div>

              {/* Justification Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mandatory Business Justification
                </label>
                <textarea
                  rows={3}
                  value={overrideForm.reason}
                  onChange={e => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., Authorized 30-day AI Copilot pilot agreed with College Principal pending annual board renewal."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Valid Until Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={overrideForm.valid_until}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setOverrideForm(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                        setOverrideForm(prev => ({ ...prev, valid_until: d.toISOString().split('T')[0] }));
                      }}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                    >
                      +{days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 active:scale-95 disabled:opacity-50"
                >
                  {overrideSubmitting ? 'Granting...' : 'Confirm & Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
