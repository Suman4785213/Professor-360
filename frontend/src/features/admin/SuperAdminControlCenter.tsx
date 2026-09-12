import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  College,
  Plan,
  Subscription,
  SystemHealthData,
  SubscriptionDashboardData,
  TenantFeatureFlag,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { CollegeOnboardingWizard } from './CollegeOnboardingWizard';
import {
  Building,
  Users,
  Server,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  Layers,
  Settings,
  Activity,
  HardDrive,
  Cpu,
  RefreshCw,
  Download,
  Search,
  Filter,
  Sliders,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckSquare,
  AlertCircle
} from 'lucide-react';

export const SuperAdminControlCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'colleges' | 'subscriptions' | 'plans' | 'features' | 'health' | 'audit'>('overview');
  const [colleges, setColleges] = useState<College[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subDashboard, setSubDashboard] = useState<SubscriptionDashboardData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Feature Flags matrix state
  const [selectedCollegeForFlags, setSelectedCollegeForFlags] = useState<string>('');
  const [resolvedFlags, setResolvedFlags] = useState<Record<string, boolean>>({});
  const [flagActionLoading, setFlagActionLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [colRes, planRes, subRes, subDashRes, healthRes, auditRes] = await Promise.all([
        apiClient.get('/colleges/'),
        apiClient.get('/plans/'),
        apiClient.get('/subscriptions/'),
        apiClient.get('/subscriptions/dashboard/'),
        apiClient.get('/system/health/'),
        apiClient.get('/audit-logs/platform/').catch(() => ({ data: { results: [] } })),
      ]);

      const cols = colRes.data.results || colRes.data || [];
      setColleges(cols);
      setPlans(planRes.data.results || planRes.data || []);
      setSubscriptions(subRes.data.results || subRes.data || []);
      setSubDashboard(subDashRes.data);
      setSystemHealth(healthRes.data);
      setAuditLogs(auditRes.data.results || auditRes.data || []);

      if (cols.length > 0 && !selectedCollegeForFlags) {
        setSelectedCollegeForFlags(cols[0].id);
        fetchResolvedFlags(cols[0].id);
      }
    } catch (e) {
      console.error('Error loading Super Admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchResolvedFlags = async (collegeId: string) => {
    try {
      const res = await apiClient.get(`/features/resolved/?college_id=${collegeId}`);
      setResolvedFlags(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFeature = async (featureKey: string, currentVal: boolean) => {
    if (!selectedCollegeForFlags) return;
    setFlagActionLoading(true);
    try {
      await apiClient.post('/features/toggle/', {
        college_id: selectedCollegeForFlags,
        feature_key: featureKey,
        is_enabled: !currentVal,
        reason: 'Super Admin manual toggle',
      });
      fetchResolvedFlags(selectedCollegeForFlags);
    } catch (e) {
      console.error(e);
    } finally {
      setFlagActionLoading(false);
    }
  };

  const handleToggleCollegeStatus = async (college: College) => {
    const isCurrentlySuspended = college.status === 'SUSPENDED' || !college.is_active;
    const action = isCurrentlySuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} ${college.name}?`)) return;

    try {
      await apiClient.post(`/colleges/${college.id}/${action}/`);
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCollege = async (college: College) => {
    try {
      const res = await apiClient.get(`/colleges/${college.id}/export/`);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant_export_${college.code.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export tenant:', e);
      alert('Export failed.');
    }
  };

  const filteredColleges = colleges.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && c.status === 'ACTIVE') ||
      (statusFilter === 'SUSPENDED' && (c.status === 'SUSPENDED' || !c.is_active)) ||
      (statusFilter === 'SETUP' && c.status === 'SETUP');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-brand-300 uppercase tracking-widest bg-brand-500/20 px-2.5 py-0.5 rounded-full border border-brand-500/30">
              SaaS Platform Control Center
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {systemHealth?.overall_status || 'OPERATIONAL'}
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2">Super Admin Control Center</h2>
          <p className="text-sm text-slate-300 mt-1">
            Multi-college tenant provisioning, SaaS subscriptions, feature flags, quotas & system health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchAllData}
            variant="secondary"
            size="sm"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button
            onClick={() => setIsWizardOpen(true)}
            variant="primary"
            size="sm"
            className="bg-brand-600 hover:bg-brand-500 text-white shadow-lg font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Provision College (Wizard)
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Server },
          { id: 'colleges', label: `Tenants Directory (${colleges.length})`, icon: Building },
          { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: CreditCard },
          { id: 'plans', label: `SaaS Plans (${plans.length})`, icon: Layers },
          { id: 'features', label: 'Tenant Feature Flags', icon: Sliders },
          { id: 'health', label: 'System Health', icon: Activity },
          { id: 'audit', label: 'Platform Audit Logs', icon: CheckSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Institutions</p>
                <p className="text-2xl font-black text-slate-900">{colleges.length}</p>
                <span className="text-[10px] text-emerald-600 font-bold">
                  {colleges.filter((c) => c.status === 'ACTIVE').length} Active
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">MRR / Monthly Run Rate</p>
                <p className="text-2xl font-black text-purple-700">
                  ${subDashboard?.mrr ? subDashboard.mrr.toLocaleString() : '0'}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">
                  ARR: ${subDashboard?.arr ? subDashboard.arr.toLocaleString() : '0'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Subscriptions</p>
                <p className="text-2xl font-black text-emerald-600">{subDashboard?.active_subscriptions || 0}</p>
                <span className="text-[10px] text-amber-600 font-bold">
                  {subDashboard?.trial_colleges || 0} on Trial
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Global Storage Used</p>
                <p className="text-2xl font-black text-slate-900">
                  {systemHealth?.storage?.total_gb
                    ? `${(systemHealth.storage.total_gb * (systemHealth.storage.used_pct / 100)).toFixed(1)} GB`
                    : '0 GB'}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {systemHealth?.storage?.used_pct || 0}% Disk Capacity
                </span>
              </div>
            </div>
          </div>

          {/* Tenant Quick Status Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Institutional Tenants Overview</h3>
                <p className="text-xs text-slate-500">Recent college environments and quota consumption</p>
              </div>
              <Button onClick={() => setActiveTab('colleges')} variant="secondary" size="sm">
                View All Directory →
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Institution Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Active Plan</th>
                    <th className="p-4">Storage Usage</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {colleges.slice(0, 5).map((col) => {
                    const usage = col.usage_summary;
                    return (
                      <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{col.name}</td>
                        <td className="p-4 font-mono font-bold text-brand-600">{col.code}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              col.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : col.status === 'SUSPENDED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {col.status || (col.is_active ? 'ACTIVE' : 'SUSPENDED')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold uppercase">
                            {col.active_subscription?.plan_details?.name || col.subscription_plan}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                              <span>{usage?.storage.used_gb || 0} GB</span>
                              <span>{usage?.storage.percentage || 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (usage?.storage.percentage || 0) > 80 ? 'bg-rose-500' : 'bg-brand-500'
                                }`}
                                style={{ width: `${Math.min(100, usage?.storage.percentage || 0)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Button
                            onClick={() => handleExportCollege(col)}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Export
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COLLEGES DIRECTORY */}
      {activeTab === 'colleges' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search college name, code, city..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
                <option value="SETUP">Setup in Progress</option>
              </select>

              <Button onClick={() => setIsWizardOpen(true)} variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Onboard College
              </Button>
            </div>
          </div>

          {/* Colleges Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">College Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Departments</th>
                    <th className="p-4">Faculty</th>
                    <th className="p-4">Storage (GB)</th>
                    <th className="p-4">AI Jobs</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredColleges.map((col) => {
                    const usage = col.usage_summary;
                    const isSuspended = col.status === 'SUSPENDED' || !col.is_active;

                    return (
                      <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{col.name}</p>
                          <p className="text-[11px] text-slate-400">{col.city || 'Higher Education'}</p>
                        </td>
                        <td className="p-4 font-mono font-bold text-brand-600">{col.code}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              !isSuspended
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {col.status || (!isSuspended ? 'ACTIVE' : 'SUSPENDED')}
                          </span>
                        </td>
                        <td className="p-4 font-bold uppercase text-slate-700">
                          {col.active_subscription?.plan_details?.name || col.subscription_plan}
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{col.departments_count || 0}</td>
                        <td className="p-4 font-semibold text-slate-700">{col.faculty_count || 0}</td>
                        <td className="p-4 font-semibold text-slate-700">
                          {usage?.storage.used_gb || 0} / {usage?.storage.limit_gb || 10}
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {usage?.ai_processing.used || 0} / {usage?.ai_processing.limit || 100}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Button
                            onClick={() => handleToggleCollegeStatus(col)}
                            variant={isSuspended ? 'primary' : 'danger'}
                            size="sm"
                            className="text-xs"
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </Button>
                          <Button
                            onClick={() => handleExportCollege(col)}
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                          >
                            Export
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Monthly Recurring Revenue</p>
              <p className="text-3xl font-black text-purple-700 mt-1">
                ${subDashboard?.mrr ? subDashboard.mrr.toLocaleString() : '0'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Based on active institutional subscriptions</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Annualized Run Rate (ARR)</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                ${subDashboard?.arr ? subDashboard.arr.toLocaleString() : '0'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Projected 12-month platform contract volume</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Active vs Trial Ratio</p>
              <p className="text-3xl font-black text-brand-600 mt-1">
                {subDashboard?.active_subscriptions || 0} / {subDashboard?.trial_colleges || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Active paid seats vs 14-day evaluation accounts</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Institutional Subscriptions Ledger</h3>
              <p className="text-xs text-slate-500">Active contracts, billing cycles, and renewal timelines</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">College</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Billing Cycle</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Period Start</th>
                    <th className="p-4">Period End</th>
                    <th className="p-4">Auto-Renew</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{s.college_name || s.college_code}</td>
                      <td className="p-4 font-bold text-indigo-700 uppercase">{s.plan_details?.name || 'Custom'}</td>
                      <td className="p-4 font-semibold text-slate-600">{s.billing_cycle}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(s.current_period_start).toLocaleDateString()}</td>
                      <td className="p-4 text-slate-500">
                        {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : 'Continuous'}
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{s.auto_renew ? 'Enabled' : 'Manual'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLANS */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black uppercase text-brand-600 tracking-wider">{p.name}</span>
                  <span className="text-xs font-bold text-slate-400 font-mono">{p.code}</span>
                </div>
                <p className="text-3xl font-black text-slate-900 mt-3">${p.price_monthly}<span className="text-xs text-slate-500 font-normal">/mo</span></p>
                <p className="text-xs text-slate-500 mt-2">{p.description}</p>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700 font-medium">
                  <p className="flex justify-between"><span>Max Users:</span> <span className="font-bold">{p.max_users}</span></p>
                  <p className="flex justify-between"><span>Departments:</span> <span className="font-bold">{p.max_departments}</span></p>
                  <p className="flex justify-between"><span>Faculty Accounts:</span> <span className="font-bold">{p.max_faculty}</span></p>
                  <p className="flex justify-between"><span>Storage Allowance:</span> <span className="font-bold">{p.storage_limit_gb} GB</span></p>
                  <p className="flex justify-between"><span>Monthly AI Quota:</span> <span className="font-bold">{p.ai_processing_limit} Jobs</span></p>
                  <p className="flex justify-between"><span>Monthly Reports:</span> <span className="font-bold">{p.max_reports_monthly} Reports</span></p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="sm" className="w-full">
                  Configure Plan Limits
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: FEATURE FLAGS */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tenant-Aware Feature Flags Matrix</h3>
              <p className="text-xs text-slate-500">Toggle modules and services per institution with backend enforcement</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Select College:</label>
              <select
                value={selectedCollegeForFlags}
                onChange={(e) => {
                  setSelectedCollegeForFlags(e.target.value);
                  fetchResolvedFlags(e.target.value);
                }}
                className="px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden font-bold"
              >
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'AI_PROCESSING', title: 'AI Document Intelligence', desc: 'OCR & automated field extraction' },
              { key: 'AI_SEARCH', title: 'AI Grounded Search', desc: 'Natural language search on evidence' },
              { key: 'AQAR_WORKSPACE', title: 'AQAR Compliance Suite', desc: 'Narrative drafts & checklists' },
              { key: 'SSR_WORKSPACE', title: 'SSR Self Study Suite', desc: 'Accreditation dossier preparation' },
              { key: 'ADVANCED_ANALYTICS', title: 'Executive Analytics', desc: 'Cross-cycle forecasting & AI insights' },
              { key: 'REPORT_GENERATION', title: 'Automated Reports Engine', desc: 'PDF, Word, and Excel generator' },
              { key: 'AUTOMATION', title: 'Workflow & Task Engine', desc: 'Proactive reminders & work queues' },
              { key: 'BULK_EXPORT', title: 'Institutional Bulk Export', desc: 'Full compliance data exporter' },
            ].map((f) => {
              const isEnabled = resolvedFlags[f.key] ?? true;
              return (
                <div key={f.key} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{f.title}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isEnabled ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{f.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      {isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <Button
                      onClick={() => handleToggleFeature(f.key, isEnabled)}
                      disabled={flagActionLoading}
                      variant={isEnabled ? 'danger' : 'primary'}
                      size="sm"
                      className="text-[10px] py-1 px-2.5 h-7 font-bold"
                    >
                      {isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM HEALTH */}
      {activeTab === 'health' && systemHealth && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">PostgreSQL DB</p>
                  <p className="text-base font-black text-emerald-600">{systemHealth.database.status}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Latency: {systemHealth.database.latency_ms} ms</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Disk Storage</p>
                  <p className="text-base font-black text-slate-900">{systemHealth.storage.used_pct}%</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{systemHealth.storage.free_gb} GB free of {systemHealth.storage.total_gb} GB</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">AI Provider</p>
                  <p className="text-base font-black text-purple-600">{systemHealth.ai_provider.status}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{systemHealth.ai_provider.provider}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Background Jobs</p>
                  <p className="text-base font-black text-amber-600">{systemHealth.workers.status}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">{systemHealth.workers.active_workers} Active Workers</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Platform-Level Administrative Actions</h3>
            <p className="text-xs text-slate-500">Immutable ledger of college provisioning, plan changes, and feature toggles</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Action</th>
                  <th className="p-4">Administrator</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{log.actor_email}</td>
                    <td className="p-4 font-mono text-slate-500">{log.model_name || log.object_repr || '—'}</td>
                    <td className="p-4 text-slate-600">{log.comment || 'Platform administrative operation'}</td>
                    <td className="p-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Modal */}
      <CollegeOnboardingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCompleted={() => {
          fetchAllData();
        }}
      />
    </div>
  );
};
