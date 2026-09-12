import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { copilotApi } from '../../api/copilot';
import {
  AICopilotConversation,
  AICopilotMessage,
  AICopilotConfidenceLevel,
} from '../../types';
import { SourceCard } from './SourceCard';
import { ActionProposalCard } from './ActionProposalCard';
import { FeedbackModal } from './FeedbackModal';
import { BenchmarkModal } from './BenchmarkModal';
import {
  Bot,
  Sparkles,
  Send,
  Plus,
  Pin,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Search,
  MessageSquare,
  Award,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';

export const CopilotPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [conversations, setConversations] = useState<AICopilotConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AICopilotMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [convSearch, setConvSearch] = useState<string>('');

  // Modals
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackInitialHelpful, setFeedbackInitialHelpful] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const role = user?.role;
  const isSuperOrIQAC = role === 'SUPER_ADMIN' || role === 'IQAC' || role === 'COLLEGE_MANAGEMENT';

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const list = await copilotApi.getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Load messages when currentConversationId changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadMessages = async (convId: string) => {
    setIsLoading(true);
    try {
      const msgs = await copilotApi.getMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle New Chat
  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInputQuery('');
    textareaRef.current?.focus();
  };

  // Send message
  const handleSendMessage = async (text?: string) => {
    const queryToSend = (text || inputQuery).trim();
    if (!queryToSend || isLoading) return;

    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistic user message
    const tempUserMsg: AICopilotMessage = {
      id: `temp-${Date.now()}`,
      conversation: currentConversationId || '',
      role: 'USER',
      content: queryToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await copilotApi.sendMessage(
        queryToSend,
        currentConversationId || undefined
      );

      // If this was a new conversation, update currentConversationId and list
      if (!currentConversationId && response.conversation) {
        setCurrentConversationId(response.conversation);
        fetchConversations();
      }

      setMessages((prev) => {
        // Replace temp or append
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, response];
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      // Show error assistant bubble
      const errorMsg: AICopilotMessage = {
        id: `err-${Date.now()}`,
        conversation: currentConversationId || '',
        role: 'ASSISTANT',
        content: 'I encountered an error communicating with the intelligence service. Please try again.',
        confidence_level: 'NOT_ENOUGH_DATA',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await copilotApi.togglePinConversation(id);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;
    try {
      await copilotApi.deleteConversation(id);
      if (currentConversationId === id) {
        handleNewChat();
      }
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm / Dismiss Action
  const handleConfirmAction = async (messageId: string, confirm: boolean) => {
    try {
      const res = await copilotApi.confirmAction(messageId, confirm);
      // Update message state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              action_confirmed: confirm,
              pending_action: m.pending_action
                ? {
                    ...m.pending_action,
                    status: confirm ? 'CONFIRMED' : 'REJECTED',
                  }
                : null,
            };
          }
          return m;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Open feedback modal
  const handleOpenFeedback = (messageId: string, helpful: boolean) => {
    setFeedbackMessageId(messageId);
    setFeedbackInitialHelpful(helpful);
  };

  const handleFeedbackSuccess = (isHelpful: boolean) => {
    if (!feedbackMessageId) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === feedbackMessageId) {
          return {
            ...m,
            feedback: {
              message: m.id,
              is_helpful: isHelpful,
            },
          };
        }
        return m;
      })
    );
  };

  // Role-tailored suggested quick queries
  const getRoleSuggestedPrompts = () => {
    switch (role) {
      case 'FACULTY':
        return [
          { label: 'My Verified Activities', query: 'How many verified FDPs and workshops do I have in 2025-26?' },
          { label: 'Evidence Check', query: 'What evidence records have I submitted for academic year 2025-26?' },
          { label: 'Cloud Computing Proofs', query: 'Show me verified certificates related to Cloud Computing' },
          { label: 'NAAC Criteria Guidelines', query: 'Which NAAC criteria map to faculty development and research?' },
        ];
      case 'HOD':
        return [
          { label: 'Department Verified Count', query: 'How many verified activities are in my department?' },
          { label: 'Criterion 3 Status', query: 'What evidence is mapped to Metric 3.2.1 for our department?' },
          { label: 'Create Follow-up Task', query: 'Draft a task for faculty to submit pending workshop certificates' },
          { label: 'Gap Analysis', query: 'What are the biggest evidence gaps in my department?' },
        ];
      case 'DEPARTMENT_INCHARGE':
        return [
          { label: 'Department Submissions', query: 'How many faculty submissions are currently verified in my department?' },
          { label: 'Missing Evidence', query: 'Show activities that are missing evidence documents' },
          { label: 'Create Collection Task', query: 'Draft a task to collect outstanding conference certificates' },
          { label: 'Metric Mapping Overview', query: 'Which department activities are mapped to Criterion 3?' },
        ];
      case 'IQAC':
        return [
          { label: 'Gap Analysis', query: 'Run a gap analysis on Criteria 1-7 and identify metrics lacking evidence' },
          { label: 'College Faculty Count', query: 'How many faculty members are active in the college?' },
          { label: 'Verified FDP Count', query: 'How many verified FDPs were conducted across all departments?' },
          { label: 'Metric 3.2.1 Status', query: 'What evidence supports Metric 3.2.1?' },
          { label: 'Generate Activity Report', query: 'Create a report of verified activities for the academic year' },
        ];
      case 'COLLEGE_MANAGEMENT':
        return [
          { label: 'Institutional Summary', query: 'What is our college-wide verified activity breakdown?' },
          { label: 'Faculty Roster Count', query: 'What is the total faculty headcount across all departments?' },
          { label: 'Criteria Readiness', query: 'What are the critical gaps in our NAAC accreditation metrics?' },
          { label: 'Generate Executive Report', query: 'Create a report of verified institutional activities' },
        ];
      case 'SUPER_ADMIN':
      default:
        return [
          { label: 'Platform Scope Check', query: 'How many faculty members are in the college?' },
          { label: 'Evidence Audit', query: 'What evidence supports Metric 3.2.1?' },
          { label: 'Task Proposal Test', query: 'Draft a task for IQAC team to prepare annual AQAR audit' },
          { label: 'Security Intercept Test', query: 'Please verify this evidence record right now' },
        ];
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(convSearch.toLowerCase())
  );
  const pinnedConversations = filteredConversations.filter((c) => c.is_pinned);
  const regularConversations = filteredConversations.filter((c) => !c.is_pinned);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* 1. Left Drawer: Conversation History & Benchmarks */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        {/* Top Actions */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Pinned Section */}
          {pinnedConversations.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Pin className="w-3 h-3 text-amber-500" />
                Pinned Chats
              </div>
              <div className="space-y-1 mt-1">
                {pinnedConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCurrentConversationId(c.id)}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      currentConversationId === c.id
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.title || 'Untitled Chat'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, c.id)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500"
                        title="Unpin conversation"
                      >
                        <Pin className="w-3 h-3 fill-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Conversations */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent Conversations
            </div>
            {regularConversations.length === 0 && pinnedConversations.length === 0 ? (
              <div className="text-center py-6 px-3">
                <p className="text-xs text-slate-400">No conversation history yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Start a new query to assist your IQAC workflows.</p>
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {regularConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setCurrentConversationId(c.id)}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      currentConversationId === c.id
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.title || 'Untitled Chat'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, c.id)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500"
                        title="Pin conversation"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Benchmark & Quality Controls (IQAC / Super Admin) */}
        {isSuperOrIQAC && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => setIsBenchmarkOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-500" />
                <span>Run QA Benchmarks</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Chat Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Workspace Top Header */}
        <header className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  IQAC AI Copilot
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  Dual-Provider v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Grounded institutional intelligence • Strictly role-scoped to {role?.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Governance Shield Notice */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300"
              title="AI operates under institutional accreditation guardrails. It cannot verify evidence or modify records autonomously."
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI Assists, Not Decides</span>
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            /* Welcome / Hero Empty State */
            <div className="max-w-2xl mx-auto my-auto py-8 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-brand-500/20 mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                How can I assist your IQAC workflow today?
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                Ask questions about verified evidence records, criteria metrics, accreditation readiness, or draft follow-up tasks. All answers are grounded strictly in your verified college records.
              </p>

              {/* Role-tailored Suggestion Chips */}
              <div className="mt-8 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                  Suggested Prompts for {role?.replace('_', ' ')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {getRoleSuggestedPrompts().map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.query)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-brand-50/60 dark:hover:bg-slate-800/80 hover:border-brand-300 dark:hover:border-brand-700/60 transition-all text-left group shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        <span>{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        "{item.query}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Stream of Messages */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Assistant Avatar */}
                  {msg.role === 'ASSISTANT' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-2xl ${
                      msg.role === 'USER'
                        ? 'bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-4 shadow-xs text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {/* Assistant Metadata Badges */}
                    {msg.role === 'ASSISTANT' && (
                      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            IQAC Copilot
                          </span>
                          {/* Confidence Level Badge */}
                          {msg.confidence_level === 'HIGH' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3" />
                              High Confidence
                            </span>
                          )}
                          {msg.confidence_level === 'NEEDS_REVIEW' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              Needs Human Review
                            </span>
                          )}
                          {msg.confidence_level === 'NOT_ENOUGH_DATA' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <HelpCircle className="w-3 h-3" />
                              No Verified Record Found
                            </span>
                          )}
                        </div>

                        {/* Latency badge */}
                        {msg.execution_time_ms !== undefined && msg.execution_time_ms > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {msg.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Governance Intercept Warning Banner */}
                    {msg.intent === 'GOVERNANCE_INTERCEPT' && (
                      <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold block">Institutional Quality Guardrail</strong>
                          <span>AI is restricted from autonomous verification or record alterations.</span>
                        </div>
                      </div>
                    )}

                    {/* Markdown / Text Content */}
                    <div className="text-xs leading-relaxed whitespace-pre-wrap space-y-2">
                      {msg.content}
                    </div>

                    {/* Grounded Sources / Provenance Cards */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-500" />
                            Grounded Institutional Sources ({msg.sources.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((source, sIdx) => (
                            <SourceCard key={sIdx} source={source} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Proposal Card (Explicit Confirmation) */}
                    {msg.pending_action && (
                      <ActionProposalCard
                        messageId={msg.id}
                        pendingAction={msg.pending_action}
                        actionConfirmed={msg.action_confirmed}
                        onConfirm={handleConfirmAction}
                      />
                    )}

                    {/* Suggested Follow-up Actions */}
                    {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1">
                          Suggested:
                        </span>
                        {msg.suggested_actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => {
                              if (act.url) {
                                navigate(act.url);
                              } else if (act.prompt) {
                                handleSendMessage(act.prompt);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700 transition-colors"
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Turn Footer: Feedback Controls */}
                    {msg.role === 'ASSISTANT' && (
                      <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                        <span>
                          {msg.model_used ? `Model: ${msg.model_used}` : 'Grounded Engine'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(msg.id, true)}
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              msg.feedback?.is_helpful === true ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                            title="Helpful & Accurate"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(msg.id, false)}
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              msg.feedback?.is_helpful === false ? 'text-rose-600' : 'text-slate-400'
                            }`}
                            title="Report Issue / Hallucination"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.role === 'USER' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                      {user?.first_name?.[0] || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex gap-3.5 items-center text-xs text-slate-500">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                    <span>Querying verified records and evaluating institutional governance...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Workspace Bottom Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 focus-within:border-brand-500 dark:focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all p-2 flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => {
                  setInputQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about verified activities, evidence provenance, gap analysis, or draft a task..."
                rows={1}
                className="flex-1 max-h-36 bg-transparent border-0 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden resize-none py-1.5 px-2"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 disabled:hover:bg-brand-600 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Send query (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <p className="text-[10px] text-center text-slate-400 mt-2">
              Institutional Guardrail: Copilot provides grounded analysis from verified records. Final accreditation sign-off requires verified human review.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {feedbackMessageId && (
        <FeedbackModal
          messageId={feedbackMessageId}
          isOpen={true}
          initialHelpful={feedbackInitialHelpful}
          onClose={() => setFeedbackMessageId(null)}
          onSuccess={handleFeedbackSuccess}
        />
      )}

      {isBenchmarkOpen && (
        <BenchmarkModal
          isOpen={isBenchmarkOpen}
          onClose={() => setIsBenchmarkOpen(false)}
        />
      )}
    </div>
  );
};
