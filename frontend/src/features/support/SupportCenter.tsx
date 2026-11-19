import { SecureLink } from '../../api/privateMedia';
import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Send,
  BookOpen,
  ArrowRight,
  Eye,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  supportApi,
  SupportTicket,
  KBArticle,
  KBCategory,
} from '../../api/support';
import { Button } from '../../components/ui/Button';

export const SupportCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'kb'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [kbCategories, setKbCategories] = useState<KBCategory[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New ticket modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('BUG');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newDescription, setNewDescription] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Ticket reply state
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, categoriesData, articlesData] = await Promise.all([
        supportApi.getTickets(statusFilter ? { status: statusFilter } : {}),
        supportApi.getKBCategories(),
        supportApi.getKBArticles(),
      ]);
      setTickets(ticketsData);
      setKbCategories(categoriesData);
      setKbArticles(articlesData);
    } catch (err) {
      console.error('Error loading support data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      setErrorMsg('Please enter both subject and description.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await supportApi.createTicket({
        category: newCategory,
        priority: newPriority,
        subject: newSubject,
        description: newDescription,
        attachment: newFile || undefined,
      });
      setShowNewModal(false);
      setNewSubject('');
      setNewDescription('');
      setNewFile(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setSendingReply(true);
    try {
      await supportApi.addComment(selectedTicket.id, replyMessage.trim(), false);
      const updated = await supportApi.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
      setReplyMessage('');
      loadData();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleOpenArticle = async (article: KBArticle) => {
    setSelectedArticle(article);
    try {
      await supportApi.recordKBArticleView(article.id);
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-black bg-rose-100 text-rose-700 rounded-full border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">LOW</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPEN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><AlertCircle className="w-3 h-3" /> Open</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'WAITING_FOR_USER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"><Clock className="w-3 h-3" /> Action Required</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Resolved</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"><XCircle className="w-3 h-3" /> Closed</span>;
    }
  };

  const getSlaBadge = (sla: string) => {
    if (sla === 'BREACHED') {
      return <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"><AlertTriangle className="w-3 h-3" /> SLA Breached</span>;
    }
    if (sla === 'AT_RISK') {
      return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"><Clock className="w-3 h-3" /> SLA At Risk</span>;
    }
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> On Track</span>;
  };

  const filteredTickets = tickets.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.ticket_number.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
  });

  const filteredArticles = kbArticles.filter(a => {
    const q = searchQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.category_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              Institutional Help Desk
            </span>
            <span className="text-xs text-slate-400">Strict SLA Tracking & Support</span>
          </div>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-indigo-400" />
            Support & Knowledge Center
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Submit support inquiries, track response SLAs, and browse institutional IQAC knowledge base articles.
          </p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          variant="primary"
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg font-bold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Submit Support Ticket
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tickets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            My Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'kb'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base ({kbArticles.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-72 mb-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === 'tickets' ? 'Search tickets...' : 'Search articles...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tab 1: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Status filter chips */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Filter Status:</span>
            {['', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st ? st.replace('_', ' ') : 'All Tickets'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Support Tickets Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                You haven't submitted any tickets yet. Need help? Click "Submit Support Ticket" above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {ticket.ticket_number}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {ticket.category}
                      </span>
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                      {getSlaBadge(ticket.sla_status)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Submitted: {new Date(ticket.created_at).toLocaleString()}</span>
                      {ticket.assigned_to_name && (
                        <span>Assigned: <strong className="text-slate-700">{ticket.assigned_to_name}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1 font-semibold">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      {ticket.comments_count} replies
                    </span>
                    {ticket.attachments_count > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-indigo-600">
                        <Paperclip className="w-3.5 h-3.5" />
                        {ticket.attachments_count} file(s)
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Knowledge Base */}
      {activeTab === 'kb' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map(article => (
              <div
                key={article.id}
                onClick={() => handleOpenArticle(article)}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                    {article.category_name}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                    {article.content}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {article.view_count} views
                  </span>
                  <span className="text-indigo-600 font-semibold flex items-center gap-1">
                    Read guide <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Detail Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded">
                    {selectedTicket.ticket_number}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedTicket.subject}</h2>
                <p className="text-xs text-slate-500">
                  Created by {selectedTicket.created_by_name} ({selectedTicket.created_by_email}) on{' '}
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body — Chat & Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Description */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Original Issue Description</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                    {selectedTicket.attachments.map(att => (
                      <SecureLink
                        key={att.id}
                        href={att.file_url || att.file}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 font-medium"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                        {att.file_name} ({Math.round(att.file_size / 1024)} KB)
                      </SecureLink>
                    ))}
                  </div>
                )}
              </div>

              {/* SLA Telemetry */}
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">SLA Resolution Window:</span>
                  <span className="ml-2 font-bold text-slate-800">
                    {selectedTicket.resolution_due_at
                      ? new Date(selectedTicket.resolution_due_at).toLocaleString()
                      : 'Standard 48h'}
                  </span>
                </div>
                {getSlaBadge(selectedTicket.sla_status)}
              </div>

              {/* Conversation Messages */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity & Communication</h4>
                {selectedTicket.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No replies yet. Our support engineering team will respond shortly.</p>
                ) : (
                  selectedTicket.comments.map(c => {
                    const isAdmin = c.author_role === 'SUPER_ADMIN';
                    return (
                      <div
                        key={c.id}
                        className={`rounded-2xl p-4 text-xs space-y-1 ${
                          isAdmin
                            ? 'bg-indigo-50/70 border border-indigo-100 text-slate-800 ml-4'
                            : 'bg-white border border-slate-200 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={isAdmin ? 'text-indigo-900 font-bold' : 'text-slate-700'}>
                            {c.author_name} {isAdmin && '• Support Team'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(c.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Drawer Footer — Reply Box */}
            <div className="p-4 border-t border-slate-200 bg-white">
              {selectedTicket.status === 'CLOSED' ? (
                <p className="text-xs text-slate-500 text-center italic py-2">
                  This support ticket is closed. Submit a new ticket if you need further help.
                </p>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Type a response to the support team..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleSendReply}
                      variant="primary"
                      size="sm"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                Submit Support Ticket
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOGIN">Login / SSO</option>
                    <option value="BILLING">Billing & Plans</option>
                    <option value="DATA">Data & Verification</option>
                    <option value="REPORTS">Report Engine</option>
                    <option value="EVIDENCE">Evidence Repository</option>
                    <option value="AI">AI Certificate Intelligence</option>
                    <option value="INTEGRATIONS">Integrations & API</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="BUG">System Bug</option>
                    <option value="OTHER">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low (General)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="HIGH">High (Urgent Issue)</option>
                    <option value="CRITICAL">Critical (System Down)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Summary of your question or issue..."
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  placeholder="Explain what happened, steps to reproduce, or details of your request..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Optional Screenshot / Attachment</label>
                <input
                  type="file"
                  onChange={e => setNewFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                  {selectedArticle.category_name}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedArticle.title}</h3>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedArticle.content}
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedArticle(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
