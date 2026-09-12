import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { supportApi, SystemHealthData } from '../../api/support';
import { College, User } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Building,
  Users,
  Server,
  Plus,
  ShieldCheck,
  CheckCircle2,
  LifeBuoy,
  AlertTriangle,
  HardDrive,
  Activity,
  ArrowRight,
  ShieldAlert,
  AlertOctagon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuperAdminDashboardProps {
  setActiveTab?: (tab: string) => void;
  onOpenCreateCollege: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ setActiveTab, onOpenCreateCollege }) => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState<College[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colRes, usrRes, healthRes] = await Promise.all([
        apiClient.get('/colleges/'),
        apiClient.get('/auth/users/'),
        supportApi.getSystemHealthDetail().catch(() => null),
      ]);
      setColleges(colRes.data.results || colRes.data || []);
      setUsers(usrRes.data.results || usrRes.data || []);
      if (healthRes) setHealthData(healthRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = healthData?.platform_counts.active_colleges ?? colleges.filter((c: any) => c.status === 'ACTIVE').length;
  const trialCount = healthData?.platform_counts.trial_colleges ?? colleges.filter((c: any) => c.status === 'SETUP').length;
  const suspendedCount = healthData?.platform_counts.suspended_colleges ?? colleges.filter((c: any) => c.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
            SaaS Platform Administration — Phase 18
          </span>
          <h1 className="text-2xl font-black mt-2">Super Admin Control Center</h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time tenant status, SLA diagnostics, security events, background jobs, and global operations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/admin/system-health')}
            variant="outline"
            size="md"
            className="text-white border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            System Health
          </Button>
          <Button
            onClick={onOpenCreateCollege}
            variant="primary"
            size="md"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Provision College
          </Button>
        </div>
      </div>

      {/* Real Existing KPI Metrics Grid — Section 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Colleges & Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Institutions</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">{colleges.length}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-emerald-700 font-bold">{activeCount} Active</span>
              <span className="text-slate-300">•</span>
              <span className="text-blue-700 font-bold">{trialCount} Trial</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600 font-bold">{suspendedCount} Suspended</span>
            </div>
          </div>
        </div>

        {/* Total Platform Users */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Users</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-600">{users.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Across all 6 RBAC roles</p>
          </div>
        </div>

        {/* Open Support Tickets */}
        <div
          onClick={() => navigate('/admin/support')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Open Support Tickets</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-blue-600">
                {healthData?.platform_counts.open_support_tickets ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">SLA Tracked</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Failed Background Jobs */}
        <div
          onClick={() => navigate('/admin/jobs')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Failed Tasks / Jobs</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-rose-600">
                {healthData?.platform_counts.failed_jobs ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Safe Retry Available</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Operational Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/admin/system-health')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">System Health</h4>
            <p className="text-[11px] text-slate-500">9 Core Services Telemetry</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/support')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Support Desk</h4>
            <p className="text-[11px] text-slate-500">Tickets, Comments & SLA</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/security')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Security Events</h4>
            <p className="text-[11px] text-slate-500">Violations & Audit Trail</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/incidents')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Incidents Registry</h4>
            <p className="text-[11px] text-slate-500">Mitigation & Resolution</p>
          </div>
        </div>
      </div>

      {/* College Tenants Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Provisioned College Tenants</h3>
            <p className="text-xs text-slate-500">Manage tenant status, data exports, subscriptions, and isolation</p>
          </div>
          <Button onClick={onOpenCreateCollege} variant="secondary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add College
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading tenants...</div>
        ) : colleges.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No colleges provisioned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">College Name & Code</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Accreditation</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colleges.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{col.name}</div>
                      <span className="text-[11px] font-mono font-bold text-indigo-600">{col.code}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {col.city ? `${col.city}, ${col.state}` : 'India'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {col.accreditation_type} {col.naac_grade ? `(${col.naac_grade})` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 uppercase">
                        {col.subscription_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {col.status === 'SUSPENDED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Suspended
                        </span>
                      ) : col.status === 'ARCHIVED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Active Tenant
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
