import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Send,
  Lock,
  Paperclip,
  Check,
  Building2,
  XCircle,
} from 'lucide-react';
import {
  supportApi,
  SupportTicket,
} from '../../api/support';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';

export const AdminSupportManagement: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Admins for assignment
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  useEffect(() => {
    loadData();
    loadAdmins();
  }, [statusFilter, priorityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await supportApi.getTickets(params);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await apiClient.get('/auth/users/', { params: { role: 'SUPER_ADMIN' } });
      setAdminUsers(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    try {
      const fresh = await supportApi.getTicket(ticket.id);
      setSelectedTicket(fresh);
    } catch (e) {
      setSelectedTicket(ticket);
    }
  };

  const handlePostReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await supportApi.addComment(selectedTicket.id, replyText.trim(), isInternalNote);
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      setReplyText('');
      setIsInternalNote(false);
      loadData();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!selectedTicket || !userId) return;
    try {
      await supportApi.assignTicket(selectedTicket.id, userId);
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetWaiting = async () => {
    if (!selectedTicket) return;
    try {
      await supportApi.setWaitingForUser(selectedTicket.id);
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await supportApi.resolveTicket(selectedTicket.id, resolutionNotes);
      setShowResolveModal(false);
      setResolutionNotes('');
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      await supportApi.closeTicket(selectedTicket.id);
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.college_name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center border border-slate-800">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
            Super Admin Desk
          </span>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-indigo-400" />
            Support Ticket Management
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Global queue across all tenant colleges with SLA enforcement, admin assignment, and internal notes.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-bold">Open Tickets</p>
          <p className="text-3xl font-black text-indigo-400">
            {tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search college, ticket #, subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          Showing {filteredTickets.length} ticket(s)
        </span>
      </div>

      {/* Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tickets Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">Loading queue...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 text-xs">
              No support tickets match the selected filters.
            </div>
          ) : (
            filteredTickets.map(t => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {t.ticket_number}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-600">
                        {t.priority}
                      </span>
                    </div>
                    {t.sla_status === 'BREACHED' && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        SLA BREACHED
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{t.subject}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {t.college_name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    <span className="font-semibold text-slate-600">{t.status.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Ticket Detail & Actions */}
        <div className="lg:col-span-7">
          {!selectedTicket ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs text-slate-400 text-xs">
              Select a support ticket from the list to view conversations and take action.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded">
                        {selectedTicket.ticket_number}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                        {selectedTicket.category}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.subject}</h2>
                    <p className="text-xs text-slate-500">
                      Institution: <strong className="text-slate-800">{selectedTicket.college_name}</strong> •{' '}
                      Submitted by {selectedTicket.created_by_name} ({selectedTicket.created_by_email})
                    </p>
                  </div>
                </div>

                {/* Quick Action Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
                  {/* Assign to Admin */}
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    <select
                      value={selectedTicket.assigned_to || ''}
                      onChange={e => handleAssign(e.target.value)}
                      className="p-1 border border-slate-200 rounded-lg bg-white text-xs"
                    >
                      <option value="">Unassigned</option>
                      {adminUsers.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.first_name} {a.last_name} ({a.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSetWaiting}
                    className="text-xs font-semibold"
                  >
                    Set Waiting for User
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowResolveModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Resolved
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClose}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Close Ticket
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                {/* Description */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1 text-xs">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">User Issue Description</p>
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                  {selectedTicket.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                      {selectedTicket.attachments.map(att => (
                        <a
                          key={att.id}
                          href={att.file_url || att.file}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-white px-2 py-1 rounded border border-slate-200 font-medium"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-500" />
                          {att.file_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Communication & Staff Notes</h4>
                  {selectedTicket.comments.map(c => {
                    const isStaff = c.author_role === 'SUPER_ADMIN';
                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl text-xs space-y-1 border ${
                          c.is_internal
                            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                            : isStaff
                            ? 'bg-indigo-50/80 border-indigo-100 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            {c.author_name} ({c.author_email})
                            {c.is_internal && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-black">
                                <Lock className="w-2.5 h-2.5" /> STAFF INTERNAL NOTE
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Reply to Ticket</label>
                  <label className="flex items-center gap-1.5 text-xs text-amber-800 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={e => setIsInternalNote(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <Lock className="w-3.5 h-3.5" /> Staff Internal Note (Hidden from Tenant)
                  </label>
                </div>
                <textarea
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? 'Write an internal note for admin team only...'
                      : 'Write a public response to the institutional user...'
                  }
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className={`w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-2 ${
                    isInternalNote
                      ? 'border-amber-300 bg-amber-50/50 focus:ring-amber-500'
                      : 'border-slate-200 bg-white focus:ring-indigo-500'
                  }`}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handlePostReply}
                    disabled={submittingReply || !replyText.trim()}
                    variant="primary"
                    size="sm"
                    className={`font-semibold text-xs flex items-center gap-1.5 ${
                      isInternalNote
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingReply ? 'Posting...' : isInternalNote ? 'Post Internal Note' : 'Send Public Reply'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Resolve Support Ticket
            </h3>
            <p className="text-xs text-slate-600">
              Provide resolution notes to explain how the issue was resolved for the institution.
            </p>
            <textarea
              rows={4}
              placeholder="Resolution summary (e.g., config updated, data corrected)..."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Confirm Resolution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
