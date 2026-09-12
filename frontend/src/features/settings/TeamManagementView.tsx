import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { User, UserRole, UserInvitation, Department } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  X,
  AlertCircle
} from 'lucide-react';

export const TeamManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('FACULTY');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const [usrRes, invRes, deptRes, useRes] = await Promise.all([
        apiClient.get('/auth/users/'),
        apiClient.get('/invitations/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/departments/').catch(() => ({ data: { results: [] } })),
        apiClient.get('/colleges/current/usage/').catch(() => ({ data: null })),
      ]);

      setUsers(usrRes.data.results || usrRes.data || []);
      setInvitations(invRes.data.results || invRes.data || []);
      setDepartments(deptRes.data.results || deptRes.data || []);
      setUsage(useRes.data);
    } catch (e) {
      console.error('Error fetching team data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await apiClient.post('/invitations/', {
        email: inviteEmail,
        role: inviteRole,
        department: inviteDept || null,
      });

      setInviteSuccess(`Invitation token generated and sent to ${inviteEmail}!`);
      setInviteEmail('');
      fetchTeamData();
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (e: any) {
      console.error(e);
      setInviteError(e.response?.data?.error || 'Failed to dispatch invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await apiClient.post(`/invitations/${id}/cancel/`);
      fetchTeamData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await apiClient.post(`/invitations/${id}/resend/`);
      fetchTeamData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserActive = async (u: User) => {
    const action = u.is_active ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/auth/users/${u.id}/${action}/`);
      fetchTeamData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            User Administration
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">Team Members & Invitations</h2>
          <p className="text-xs text-slate-500">
            Manage institutional users, role delegations, and tokenized onboarding invitations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchTeamData} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* User Quota Banner */}
      {usage && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Institutional Seat Allowance</p>
              <p className="text-xs text-slate-500">
                {usage.users.used} active accounts of {usage.users.limit} total plan seats ({usage.users.percentage}% allocated)
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  usage.users.percentage >= 80 ? 'bg-amber-500' : 'bg-brand-600'
                }`}
                style={{ width: `${Math.min(100, usage.users.percentage)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: ACTIVE TEAM MEMBERS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Active Faculty & Staff Directory</h3>
          <p className="text-xs text-slate-500">Authorized members with active platform login access</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[10px]">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-700">{u.department_name || '—'}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      onClick={() => handleToggleUserActive(u)}
                      variant={u.is_active ? 'danger' : 'secondary'}
                      size="sm"
                      className="text-[11px] py-1 px-2.5 h-7"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: PENDING INVITATIONS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pending Onboarding Invitations</h3>
            <p className="text-xs text-slate-500">Tokenized registration links waiting for user password setup</p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">{invitations.length} Invites</span>
        </div>

        {invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending invitations. Click "Invite Member" above to onboard colleagues.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Designated Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Token Expiration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{inv.email}</td>
                    <td className="p-4 font-mono font-bold text-indigo-700">{inv.role}</td>
                    <td className="p-4 text-slate-600">{inv.department_name || 'All-College'}</td>
                    <td className="p-4 text-slate-500">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          inv.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {inv.status === 'PENDING' && (
                        <>
                          <Button
                            onClick={() => handleResendInvite(inv.id)}
                            variant="secondary"
                            size="sm"
                            className="text-[10px] py-1 px-2.5 h-7"
                          >
                            Resend
                          </Button>
                          <Button
                            onClick={() => handleCancelInvite(inv.id)}
                            variant="danger"
                            size="sm"
                            className="text-[10px] py-1 px-2.5 h-7"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INVITE MEMBER MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Invite Team Member</h3>
                  <p className="text-xs text-slate-400">Dispatch secure self-registration token</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              {inviteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@institution.edu.in"
                  className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Role Designation</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="FACULTY">Faculty (Submissions & Evidence)</option>
                  <option value="DEPARTMENT_INCHARGE">Department In-charge (Tier 1 Review)</option>
                  <option value="HOD">Head of Department (Tier 2 Review)</option>
                  <option value="IQAC">IQAC Coordinator (Final Verification)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Academic Department</label>
                <select
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All-College / Institutional</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={inviteLoading}
                  className="bg-brand-600 hover:bg-brand-500 text-white font-bold"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {inviteLoading ? 'Dispatching...' : 'Dispatch Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
