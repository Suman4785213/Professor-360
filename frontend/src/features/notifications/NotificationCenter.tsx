import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { NotificationItem, NotificationPriority } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Flame,
  ShieldCheck,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FileQuestion,
  Sparkles,
  Inbox,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [activeCategory, priorityFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let url = '/notifications/';
      const params = new URLSearchParams();
      if (activeCategory === 'UNREAD') {
        params.append('is_read', 'false');
      } else if (activeCategory !== 'ALL') {
        params.append('category', activeCategory);
      }
      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await apiClient.get(url);
      setNotifications(res.data.results || res.data || []);
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionClick = (n: NotificationItem) => {
    handleMarkRead(n.id);
    if (n.action_url) {
      navigate(n.action_url);
    } else if (n.related_model === 'Activity' && n.related_id) {
      if (user?.role === 'FACULTY') {
        navigate(`/faculty/submissions/${n.related_id}`);
      } else if (user?.role === 'DEPARTMENT_INCHARGE') {
        navigate(`/incharge/verification/${n.related_id}`);
      } else if (user?.role === 'HOD') {
        navigate(`/hod/verification/${n.related_id}`);
      } else if (user?.role === 'IQAC') {
        navigate(`/iqac/verification/${n.related_id}`);
      }
    } else if (n.category === 'TASK' || n.related_model === 'IQACTask') {
      navigate('/tasks');
    }
  };

  const getPriorityBadge = (priority?: NotificationPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600 animate-pulse" /> URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200">
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
            NORMAL
          </span>
        );
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'VERIFICATION':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-indigo-600" />;
      case 'DEADLINE':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'DATA_REQUEST':
        return <FileQuestion className="w-4 h-4 text-blue-600" />;
      case 'AQAR':
      case 'SSR':
        return <FileSpreadsheet className="w-4 h-4 text-cyan-600" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-violet-600" />;
      case 'AI':
        return <Sparkles className="w-4 h-4 text-fuchsia-600" />;
      default:
        return <Bell className="w-4 h-4 text-brand-600" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      (n.action_label && n.action_label.toLowerCase().includes(q))
    );
  });

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                Central Notification Center
              </h2>
              <p className="text-xs text-slate-500">
                Actionable IQAC alerts, verifications, tasks, deadlines, and system events
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrefModalOpen(true)}
            className="text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            Preferences
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs"
            disabled={unreadTotal === 0}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="p-4 space-y-3 bg-white shadow-xs border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNREAD', label: `Unread (${unreadTotal})` },
              { id: 'VERIFICATION', label: 'Verifications' },
              { id: 'TASK', label: 'Tasks' },
              { id: 'DATA_REQUEST', label: 'Requests' },
              { id: 'DEADLINE', label: 'Deadlines' },
              { id: 'SYSTEM', label: 'System' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Priority:
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notifications by title, content, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
          />
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="overflow-hidden border-slate-200">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No items match your search query.'
                : 'You are completely caught up! No pending alerts or workflow notifications in this category.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-all hover:bg-slate-50/80 ${
                  !n.is_read ? 'bg-brand-50/25 border-l-4 border-l-brand-600' : ''
                }`}
              >
                {/* Notification Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      !n.is_read
                        ? 'bg-brand-100 text-brand-700 border-brand-200 shadow-xs'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-slate-900">{n.title}</span>
                      {getPriorityBadge(n.priority)}
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{n.body}</p>
                    
                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      {n.category && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {n.category}
                        </span>
                      )}
                      {n.sender_name && (
                        <span>From: {n.sender_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {(n.action_url || n.action_label || n.related_id) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleActionClick(n)}
                      className="text-xs font-semibold shadow-xs"
                    >
                      {n.action_label || 'View Item'}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        onSaved={fetchNotifications}
      />
    </div>
  );
};
