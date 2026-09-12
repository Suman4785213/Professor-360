import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Users,
  FileText,
  HelpCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { billingApi } from '../../api/billing';
import {
  TenantBillingInfo,
  Invoice,
  PaymentTransaction,
  BillingSupportTicket,
  SoftWarning
} from '../../types';
import { useAuthStore } from '../../stores/authStore';

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'entitlements' | 'controls'>('invoices');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({
    ticket_type: 'BILLING_QUESTION',
    subject: '',
    message: '',
    invoice_id: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subData, invData, payData] = await Promise.all([
        billingApi.getSubscription(),
        billingApi.getInvoices(),
        billingApi.getPayments(),
      ]);
      setBillingInfo(subData);
      setInvoices(invData);
      setPayments(payData);
    } catch (err: any) {
      console.error('Failed to load billing data', err);
      setError(err?.response?.data?.error || 'Failed to load institutional billing information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handlePauseResume = async (action: 'pause' | 'resume') => {
    setActionLoading(true);
    try {
      if (action === 'pause') {
        await billingApi.pauseSubscription();
        setSuccessMessage('Subscription paused successfully. Core institutional data remains preserved.');
      } else {
        await billingApi.resumeSubscription();
        setSuccessMessage('Subscription resumed successfully.');
      }
      await fetchBillingData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to execute subscription action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? All your institutional evidence, faculty profiles, and AQAR/SSR reports will remain completely safe and accessible.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await billingApi.cancelSubscription(false);
      setSuccessMessage(res.message);
      await fetchBillingData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await billingApi.createSupportTicket({
        ticket_type: supportForm.ticket_type,
        subject: supportForm.subject,
        message: supportForm.message,
        invoice: supportForm.invoice_id || undefined,
      });
      setSupportModalOpen(false);
      setSupportForm({ ticket_type: 'BILLING_QUESTION', subject: '', message: '', invoice_id: '' });
      setSuccessMessage('Billing support ticket created. Our team has received your request.');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create support ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading Institutional Billing & Subscription...</p>
        </div>
      </div>
    );
  }

  if (error || !billingInfo) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold">Billing Error</h3>
            <p className="mt-1 text-sm">{error || 'Unable to retrieve subscription details.'}</p>
            <button
              onClick={fetchBillingData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sub = billingInfo.subscription;
  const usage = billingInfo.usage;
  const currency = usage?.currency || 'INR';

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
      case 'TRIAL':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Sparkles className="w-3.5 h-3.5" /> Free Trial</span>;
      case 'PAST_DUE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> Past Due</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><PauseCircle className="w-3.5 h-3.5" /> Paused</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status || 'Unsubscribed'}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Trial Alert Banner */}
      {sub?.is_trial && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl shrink-0">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Institution Trial Active — {sub.trial_days_remaining} Days Remaining</h3>
              <p className="text-blue-100 text-sm mt-1">
                You are currently exploring {sub.plan_details?.name || 'IQAC SaaS'}. Your institutional data and evidence will never be deleted when the trial ends.
              </p>
            </div>
          </div>
          <button
            id="btn-upgrade-trial"
            onClick={() => navigate('/billing/plans')}
            className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-50 transition-all shadow-sm shrink-0 flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Choose Commercial Plan
          </button>
        </div>
      )}

      {/* Grace Period Alert Banner */}
      {billingInfo.is_in_grace_period && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">14-Day Grace Period Active</h3>
              <p className="text-amber-800 text-sm mt-1">
                Your payment is past due. All faculty records, verified evidence, and reports remain 100% accessible according to institutional preservation policy.
              </p>
            </div>
          </div>
          <button
            id="btn-grace-renew"
            onClick={() => navigate('/billing/plans')}
            className="px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-xl text-sm hover:bg-amber-700 transition-colors shrink-0 flex items-center gap-2 shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Settle Invoice & Renew
          </button>
        </div>
      )}

      {/* Header & Plan Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Billing & Plan</h1>
            {getStatusBadge(sub?.status)}
          </div>
          <p className="text-slate-500 text-sm">
            Tenant: <strong className="text-slate-800">{billingInfo.college_name} ({billingInfo.college_code})</strong>
            {sub?.current_period_end && (
              <> • Renewal Date: <span className="text-slate-800 font-medium">{new Date(sub.current_period_end).toLocaleDateString()}</span></>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-billing-support"
            onClick={() => setSupportModalOpen(true)}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            Billing Support
          </button>
          <button
            id="btn-compare-plans"
            onClick={() => navigate('/billing/plans')}
            className="px-5 py-2 bg-brand-600 text-white font-medium rounded-xl text-sm hover:bg-brand-700 transition-all shadow-sm flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Compare & Upgrade
          </button>
        </div>
      </div>

      {/* Soft Limit Warnings Callout */}
      {billingInfo.soft_warnings && billingInfo.soft_warnings.length > 0 && (
        <div className="space-y-2">
          {billingInfo.soft_warnings.map((warn: SoftWarning, idx: number) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
                warn.severity === 'danger'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{warn.message}</span>
              </div>
              <button
                onClick={() => navigate('/billing/plans')}
                className="font-semibold underline ml-4 hover:opacity-80 shrink-0 text-xs"
              >
                Upgrade Quota
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Usage & Quota Meters Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600" />
            Current Resource Consumption & Limits
          </h2>
          <span className="text-xs text-slate-500">
            Non-destructive: Reaching a quota pauses new additions while keeping past data safe.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* AI Processing */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">AI Document Extraction</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                usage.ai_processing.percentage >= 90 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {usage.ai_processing.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Used: {usage.ai_processing.used} / {usage.ai_processing.limit} jobs</span>
                <span className="font-medium text-slate-700">Remaining: {usage.ai_processing.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.ai_processing.percentage >= 90 ? 'bg-red-500' : usage.ai_processing.percentage >= 70 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.ai_processing.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Evidence Cloud Storage</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                usage.storage.percentage >= 90 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {usage.storage.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Used: {usage.storage.used_gb} GB / {usage.storage.limit_gb} GB</span>
                <span className="font-medium text-slate-700">Remaining: {usage.storage.remaining_gb} GB</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.storage.percentage >= 90 ? 'bg-red-500' : usage.storage.percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.storage.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Faculty Profiles */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Faculty Members</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                usage.faculty.percentage >= 90 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {usage.faculty.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Used: {usage.faculty.used} / {usage.faculty.limit} faculty</span>
                <span className="font-medium text-slate-700">Remaining: {usage.faculty.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.faculty.percentage >= 90 ? 'bg-red-500' : usage.faculty.percentage >= 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.faculty.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Report Generation */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Monthly Reports</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                usage.reports.percentage >= 90 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {usage.reports.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Used: {usage.reports.used} / {usage.reports.limit} reports</span>
                <span className="font-medium text-slate-700">Remaining: {usage.reports.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usage.reports.percentage >= 90 ? 'bg-red-500' : usage.reports.percentage >= 70 ? 'bg-amber-500' : 'bg-purple-600'
                  }`}
                  style={{ width: `${Math.min(100, usage.reports.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Academic Departments */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Departments</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                {usage.departments.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Active: {usage.departments.used} / {usage.departments.limit}</span>
                <span className="font-medium text-slate-700">Remaining: {usage.departments.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{ width: `${Math.min(100, usage.departments.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* User Accounts */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800">User Seats</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                {usage.users.percentage}%
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Active: {usage.users.used} / {usage.users.limit}</span>
                <span className="font-medium text-slate-700">Remaining: {usage.users.remaining}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-600"
                  style={{ width: `${Math.min(100, usage.users.percentage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout: Invoices, Payments, Entitlements, Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex px-6 pt-4 gap-6">
          <button
            id="tab-invoices"
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoices & Receipts ({invoices.length})
          </button>
          <button
            id="tab-payments"
            onClick={() => setActiveTab('payments')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payment History ({payments.length})
          </button>
          <button
            id="tab-entitlements"
            onClick={() => setActiveTab('entitlements')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'entitlements'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Feature Entitlements
          </button>
          <button
            id="tab-controls"
            onClick={() => setActiveTab('controls')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'controls'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Subscription Lifecycle
          </button>
        </div>

        <div className="p-6">
          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-medium">No billing invoices found.</p>
                  <p className="text-xs text-slate-400 mt-1">Invoices are automatically issued on subscription creation and renewal.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Billing Period</th>
                        <th className="py-3 px-4">Subtotal</th>
                        <th className="py-3 px-4">GST (18%)</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            {new Date(inv.billing_period_start).toLocaleDateString()} — {new Date(inv.billing_period_end).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {inv.currency} {inv.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs">
                            {inv.currency} {inv.tax_amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {inv.currency} {inv.total_amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'OPEN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              id={`btn-view-invoice-${inv.id}`}
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-brand-600 hover:text-brand-800 font-medium text-xs inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div>
              {payments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-medium">No payment transactions recorded.</p>
                  <p className="text-xs text-slate-400 mt-1">Payment transactions are logged idempotently when payments occur.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Payment Reference</th>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-800">
                            {pay.payment_reference}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            {pay.invoice_number || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {pay.currency} {pay.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs uppercase">
                            {pay.payment_method}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              pay.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pay.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs">
                            {new Date(pay.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ENTITLEMENTS TAB */}
          {activeTab === 'entitlements' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <span>
                  Feature access is evaluated through the <strong>Entitlement Engine</strong>: Super Admin temporary overrides take precedence, followed by tenant feature flags, and active plan allocations.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(billingInfo.entitlements || {}).map(([key, item]: [string, any]) => (
                  <div key={key} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{key.replace(/_/g, ' ')}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Authority: {item.source}</p>
                    </div>
                    <div>
                      {item.enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Locked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBSCRIPTION CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-6 max-w-2xl">
              <div className="border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-base font-semibold text-slate-900">Pause Subscription</h3>
                <p className="text-xs text-slate-600">
                  Temporarily pause active billing. Your institution data, faculty records, and evidence files remain preserved and safely stored.
                </p>
                {sub?.status === 'PAUSED' ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => handlePauseResume('resume')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Resume Subscription
                  </button>
                ) : (
                  <button
                    disabled={actionLoading || sub?.status !== 'ACTIVE'}
                    onClick={() => handlePauseResume('pause')}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <PauseCircle className="w-4 h-4" />
                    Pause Subscription
                  </button>
                )}
              </div>

              <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 space-y-3">
                <h3 className="text-base font-semibold text-red-900">Cancel Subscription</h3>
                <p className="text-xs text-red-700">
                  Cancel your subscription at period end. Under our <strong>Institutional Data Preservation Guarantee</strong>, cancelling never deletes faculty records, activities, uploaded evidence, or reports.
                </p>
                <button
                  disabled={actionLoading || sub?.status === 'CANCELLED'}
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  {sub?.status === 'CANCELLED' ? 'Subscription Already Cancelled' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INVOICE RECEIPT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Official Invoice Receipt</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">Invoice #{selectedInvoice.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Tenant:</span>
                  <p className="font-semibold text-slate-800">{selectedInvoice.college_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Plan:</span>
                  <p className="font-semibold text-slate-800">{selectedInvoice.plan_name || 'Commercial SaaS'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Issue Date:</span>
                  <p className="font-medium text-slate-700">{selectedInvoice.issue_date}</p>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>
                  <p className="font-medium text-slate-700">{selectedInvoice.due_date}</p>
                </div>
              </div>

              <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Amount</span>
                  <span>{selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{selectedInvoice.tax_name} ({selectedInvoice.tax_rate}%)</span>
                  <span>{selectedInvoice.currency} {selectedInvoice.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                  <span>Total Paid / Payable</span>
                  <span>{selectedInvoice.currency} {selectedInvoice.total_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500">
                Status: <strong className="text-slate-800">{selectedInvoice.status}</strong> • Provider: {selectedInvoice.provider}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILLING SUPPORT MODAL */}
      {supportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Contact Billing Support</h3>
                <p className="text-xs text-slate-500 mt-0.5">Submit billing or payment queries directly to our operations team.</p>
              </div>
              <button
                onClick={() => setSupportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Type</label>
                <select
                  value={supportForm.ticket_type}
                  onChange={(e) => setSupportForm({ ...supportForm, ticket_type: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus-ring"
                >
                  <option value="PAYMENT_ISSUE">Payment / Checkout Failure</option>
                  <option value="INVOICE_QUERY">Invoice / Tax Question</option>
                  <option value="PLAN_CHANGE_REQUEST">Plan Upgrade / Custom Limits</option>
                  <option value="BILLING_QUESTION">General Billing Question</option>
                  <option value="OTHER">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding GST invoice details"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your question or issue in detail..."
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-xl p-2.5 focus-ring"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl text-xs font-medium hover:bg-brand-700 transition-colors"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Support Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
