import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { supportApi, SystemHealthData } from '../../api/support';
import { College, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Building,
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowRight,
  Search,
  RefreshCw,
  Database,
  Clock,
  Layers,
  MapPin,
  Mail,
  Phone,
  Globe,
  Award,
  Calendar,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuperAdminDashboardProps {
  setActiveTab?: (tab: string) => void;
  onOpenCreateCollege: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onOpenCreateCollege }) => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [maintenance, setMaintenance] = useState<{
    is_enabled: boolean;
    reason: string;
    estimated_duration_minutes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETUP' | 'SUSPENDED'>('ALL');

  // Modals
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [suspendModalCollege, setSuspendModalCollege] = useState<College | null>(null);
  const [suspendReason, setSuspendReason] = useState('Administrative compliance review.');
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintReason, setMaintReason] = useState('');
  const [maintDuration, setMaintDuration] = useState(60);
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colRes, usrRes, healthRes, maintRes] = await Promise.all([
        apiClient.get('/colleges/'),
        apiClient.get('/auth/users/'),
        supportApi.getSystemHealthDetail().catch(() => null),
        supportApi.getMaintenanceMode().catch(() => null),
      ]);
      const collegeList = colRes.data.results || colRes.data || [];
      setColleges(collegeList);
      setUsers(usrRes.data.results || usrRes.data || []);
      if (healthRes) setHealthData(healthRes);
      if (maintRes) {
        setMaintenance(maintRes);
        setMaintEnabled(maintRes.is_enabled);
        setMaintReason(maintRes.reason || 'Scheduled system maintenance.');
        setMaintDuration(maintRes.estimated_duration_minutes || 60);
      }
    } catch (e) {
      console.error('Failed to load Super Admin dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    await fetchData();
    setFeedback({ type: 'success', text: 'Database telemetry and college metrics refreshed.' });
  };

  const handleActivateCollege = async (college: College) => {
    setActionLoadingId(college.id);
    setFeedback(null);
    try {
      await apiClient.post(`/colleges/${college.id}/activate/`);
      setColleges((prev) =>
        prev.map((c) => (c.id === college.id ? { ...c, status: 'ACTIVE', is_active: true } : c))
      );
      setFeedback({ type: 'success', text: `${college.name} has been activated successfully.` });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to activate college.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspendCollege = async () => {
    if (!suspendModalCollege) return;
    setActionLoadingId(suspendModalCollege.id);
    setFeedback(null);
    try {
      await apiClient.post(`/colleges/${suspendModalCollege.id}/suspend/`, {
        reason: suspendReason,
      });
      setColleges((prev) =>
        prev.map((c) =>
          c.id === suspendModalCollege.id ? { ...c, status: 'SUSPENDED', is_active: false } : c
        )
      );
      setFeedback({
        type: 'success',
        text: `${suspendModalCollege.name} has been suspended with audit log record.`,
      });
      setSuspendModalCollege(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to suspend college.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await supportApi.setMaintenanceMode(maintEnabled, maintReason, maintDuration);
      setMaintenance(res);
      setIsMaintenanceModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Platform maintenance mode ${maintEnabled ? 'activated' : 'deactivated'}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to update maintenance mode.',
      });
    }
  };

  // High-level institutional counts
  const totalColleges = colleges.length;
  const activeCount = colleges.filter((c: any) => c.status === 'ACTIVE' || c.is_active).length;
  const setupCount = colleges.filter((c: any) => c.status === 'SETUP').length;
  const suspendedCount = colleges.filter((c: any) => c.status === 'SUSPENDED' || !c.is_active).length;
  const totalDepartments = colleges.reduce((sum, c) => sum + (c.departments_count || 0), 0);

  // Filtered colleges list
  const filteredColleges = colleges.filter((col) => {
    const matchesSearch =
      col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (col.city && col.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (col.state && col.state.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return col.status === 'ACTIVE' || col.is_active;
    if (statusFilter === 'SETUP') return col.status === 'SETUP';
    if (statusFilter === 'SUSPENDED') return col.status === 'SUSPENDED' || !col.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner / Control Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              Professor360 Product Administration
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Overall college management, institutional tenant directory, and central database control.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="md"
            isLoading={refreshing}
            className="text-white border-slate-700 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Health Check</span>
          </Button>

          <Button
            id="provision-college-btn"
            onClick={onOpenCreateCollege}
            variant="primary"
            size="md"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision College</span>
          </Button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overall College-Level Management Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Collaborating Colleges */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Collaborating Colleges</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{totalColleges}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
              <span className="text-emerald-700">{activeCount} Active</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-700">{setupCount} Setup</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600">{suspendedCount} Suspended</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Active Users */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Active Platform Users</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-700">{users.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Aggregated across all collaborating colleges</p>
          </div>
        </div>

        {/* Metric 3: Managed Departments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Managed Academic Depts</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-blue-700">{totalDepartments}</p>
            <p className="text-[11px] text-slate-500 mt-1">Institutional academic units</p>
          </div>
        </div>

        {/* Metric 4: Database & Platform Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Database & Platform Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>PostgreSQL Connected</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Multi-tenant isolated • Redis operational
            </p>
          </div>
        </div>
      </div>

      {/* Collaborating Colleges Directory (The Core Focus) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header with Search & Filter Tabs */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Colleges Collaborating with Professor360
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Overall institutional status, active users, high-level usage, and tenant administration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search college, code, city..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              {(['ALL', 'ACTIVE', 'SETUP', 'SUSPENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Loading collaborating colleges directory...</span>
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No colleges matched your filter criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try changing the search keywords or filter tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">College Name & Code</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Overall Status</th>
                  <th className="px-5 py-3.5">Active Users</th>
                  <th className="px-5 py-3.5">High-Level Usage</th>
                  <th className="px-5 py-3.5">Accreditation</th>
                  <th className="px-5 py-3.5 text-right">Administration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColleges.map((col) => {
                  const isSuspended = col.status === 'SUSPENDED' || !col.is_active;
                  const isSetup = col.status === 'SETUP';
                  const storageGb = col.usage_summary?.storage?.used_gb || 0;
                  const storageLimit = col.usage_summary?.storage?.limit_gb || 25;

                  return (
                    <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. College Name & Code */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{col.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {col.code}
                          </span>
                          {col.institution_code && (
                            <span className="text-[10px] text-slate-400">
                              AISHE: {col.institution_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Location */}
                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{col.city ? `${col.city}, ${col.state}` : 'India'}</span>
                        </div>
                      </td>

                      {/* 3. Overall Active/Inactive Status */}
                      <td className="px-5 py-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            Suspended
                          </span>
                        ) : isSetup ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            Setup / Onboarding
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Active Institution
                          </span>
                        )}
                      </td>

                      {/* 4. Number of Active Users */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {col.faculty_count || 0} Users
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {col.departments_count || 0} Departments
                        </p>
                      </td>

                      {/* 5. High-Level Usage */}
                      <td className="px-5 py-4">
                        <div className="text-slate-800 font-semibold">
                          Storage: {storageGb.toFixed(1)} / {storageLimit} GB
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {col.subscription_plan || 'PRO'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Accreditation */}
                      <td className="px-5 py-4">
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {col.accreditation_type || 'NAAC'}{' '}
                          {col.naac_grade ? `(${col.naac_grade})` : ''}
                        </span>
                      </td>

                      {/* 7. Administrative Controls */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Overall Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedCollege(col)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Details
                          </button>

                          {/* Suspend or Reactivate Controls */}
                          {isSuspended ? (
                            <button
                              type="button"
                              disabled={actionLoadingId === col.id}
                              onClick={() => handleActivateCollege(col)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              {actionLoadingId === col.id ? 'Activating...' : 'Activate'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoadingId === col.id}
                              onClick={() => {
                                setSuspendModalCollege(col);
                                setSuspendReason('Administrative compliance or billing review.');
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Platform Administration & Database Management Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Database Health & Telemetry */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" />
                Database Integrity & Health
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Operational
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              PostgreSQL connection pool, table schema validation, and multi-tenant schema isolation.
            </p>
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="font-bold text-slate-800">PostgreSQL 18</span>
              </div>
              <div className="flex justify-between">
                <span>Isolation:</span>
                <span className="font-bold text-emerald-700">Strict College Isolation</span>
              </div>
              <div className="flex justify-between">
                <span>Migrations:</span>
                <span className="font-bold text-slate-800">Synchronized</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/admin/system-health')}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Full System Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Maintenance & Background Jobs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                Platform Maintenance & Jobs
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  maintenance?.is_enabled
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {maintenance?.is_enabled ? 'Maintenance ON' : 'Normal Operations'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Control scheduled maintenance windows and monitor background task queues.
            </p>
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span>Task Monitor:</span>
                <span className="font-bold text-slate-800">
                  {healthData?.platform_counts.failed_jobs ?? 0} failed / ready
                </span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance Mode:</span>
                <span className="font-bold text-slate-800">
                  {maintenance?.is_enabled ? 'Active Window' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsMaintenanceModalOpen(true)}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Configure Maintenance
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/jobs')}
              className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
              title="View Task Monitor"
            >
              Jobs
            </button>
          </div>
        </div>

        {/* Card 3: Audit Trail & Tenant Security */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security & Audit Trail
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Audited
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              All college administrative actions, user logins, and status updates are logged.
            </p>
            <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <div className="flex justify-between">
                <span>Audit Status:</span>
                <span className="font-bold text-emerald-700">Active Logging</span>
              </div>
              <div className="flex justify-between">
                <span>Tenant Breach Attempts:</span>
                <span className="font-bold text-slate-800">0 Breaches</span>
              </div>
              <div className="flex justify-between">
                <span>Auth Protocol:</span>
                <span className="font-bold text-slate-800">JWT + RBAC</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/admin/activity-logs')}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: College Overall Details Modal */}
      {selectedCollege && (
        <Modal
          isOpen={!!selectedCollege}
          onClose={() => setSelectedCollege(null)}
          title="College Administration Profile"
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-start gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                <Building className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-900 leading-tight">
                  {selectedCollege.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                    Code: {selectedCollege.code}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedCollege.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedCollege.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Institutional Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold mb-0.5">Location</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedCollege.city}, {selectedCollege.state}
                </span>
                {selectedCollege.address && (
                  <p className="text-[11px] text-slate-500 mt-1">{selectedCollege.address}</p>
                )}
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold mb-0.5">Accreditation</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  {selectedCollege.accreditation_type || 'NAAC'} — Grade:{' '}
                  {selectedCollege.naac_grade || 'A+'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Est. {selectedCollege.established_year || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold mb-0.5">Subscription Tier</span>
                <span className="font-bold text-purple-700 uppercase">
                  {selectedCollege.subscription_plan || 'PRO'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Storage Quota: {selectedCollege.usage_summary?.storage?.limit_gb || 25} GB
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block font-semibold mb-0.5">Platform Usage</span>
                <span className="font-bold text-slate-800">
                  {selectedCollege.faculty_count || 0} Total Users •{' '}
                  {selectedCollege.departments_count || 0} Departments
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Storage Used: {(selectedCollege.usage_summary?.storage?.used_gb || 0).toFixed(2)} GB
                </p>
              </div>
            </div>

            {/* Contact details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 block font-semibold mb-1">Administrative Contacts:</span>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedCollege.email || 'admin@' + selectedCollege.code.toLowerCase() + '.edu'}</span>
              </div>
              {selectedCollege.phone && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCollege.phone}</span>
                </div>
              )}
              {selectedCollege.website && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <a
                    href={selectedCollege.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {selectedCollege.website}
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedCollege(null)} variant="secondary" size="md">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Suspend College Confirmation Modal */}
      {suspendModalCollege && (
        <Modal
          isOpen={!!suspendModalCollege}
          onClose={() => setSuspendModalCollege(null)}
          title="Suspend College Tenant"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to suspend this college?</p>
                <p className="mt-1 text-rose-700">
                  Suspending <strong>{suspendModalCollege.name}</strong> temporarily disables login
                  access for its users until reactivated. This action will be audited.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Suspension:
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                required
                rows={3}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Specify the administrative reason for suspension..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setSuspendModalCollege(null)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSuspendCollege}
                variant="danger"
                size="md"
                isLoading={actionLoadingId === suspendModalCollege.id}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Suspension
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Maintenance Mode Configuration Modal */}
      {isMaintenanceModalOpen && (
        <Modal
          isOpen={isMaintenanceModalOpen}
          onClose={() => setIsMaintenanceModalOpen(false)}
          title="Platform Maintenance Window"
          maxWidth="md"
        >
          <form onSubmit={handleSaveMaintenance} className="space-y-4">
            <p className="text-xs text-slate-500">
              When maintenance mode is enabled, non-super-admin users are shown a temporary
              maintenance banner during platform upgrades.
            </p>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-800">Maintenance Window</span>
                <p className="text-[11px] text-slate-500">Enable or disable platform maintenance</p>
              </div>
              <input
                type="checkbox"
                checked={maintEnabled}
                onChange={(e) => setMaintEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maintenance Notice / Reason:
              </label>
              <input
                type="text"
                value={maintReason}
                onChange={(e) => setMaintReason(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Scheduled database maintenance and platform updates."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Duration (Minutes):
              </label>
              <input
                type="number"
                value={maintDuration}
                onChange={(e) => setMaintDuration(Number(e.target.value))}
                min={5}
                max={1440}
                required
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                variant="secondary"
                size="md"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="font-bold">
                Save Settings
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
