import { openPrivateFile } from '../../api/privateMedia';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { NotificationItem } from '../../types';
import { Professor360Logo } from '../common/Professor360Logo';
import {
  LogOut,
  Bell,
  Building2,
  Menu,
  Search,
  Command,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  User,
  ChevronDown,
  Download,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onToggleMobileSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenFeedback?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenCommandPalette,
  onOpenFeedback,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isSuperAdminProfileOpen, setIsSuperAdminProfileOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu or notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsSuperAdminProfileOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isSuperAdminProfileOpen || isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSuperAdminProfileOpen, isNotifOpen]);

  const fetchUnreadNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        apiClient.get('/notifications/unread-count/').catch(() => ({ data: { unread_count: 0 } })),
        apiClient.get('/notifications/?limit=5').catch(() => ({ data: { results: [] } })),
      ]);
      setUnreadCount(countRes.data?.unread_count || 0);
      setNotifications(listRes.data?.results || listRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
    } catch {
      // Fallback
      notifications.forEach((n) => {
        if (!n.is_read) {
          apiClient.patch(`/notifications/${n.id}/read/`).catch(() => {});
        }
      });
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNavigateToRecord = (n: NotificationItem) => {
    handleMarkRead(n.id);
    setIsNotifOpen(false);
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
    } else {
      navigate('/notifications');
    }
  };

  // ==========================================
  // SUPER ADMIN SPECIALIZED CLEAN HEADER
  // ==========================================
  if (user?.role === 'SUPER_ADMIN') {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Top-Left: Logo & Application Name: Professor360 */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <Professor360Logo size="md" className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Professor360
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Product Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Central Platform Administration
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right: Notification Bell & Super Admin Profile Icon */}
        <div className="flex items-center gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              id="superadmin-notification-btn"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 z-50 animate-in fade-in-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Platform Notifications ({unreadCount} new)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate('/notifications');
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNavigateToRecord(n)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.is_read ? 'bg-brand-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-3 mt-0.5 whitespace-pre-line">{n.body}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-brand-600">{n.category || 'SYSTEM'}</span>
                          <span>
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              id="superadmin-profile-btn"
              onClick={() => setIsSuperAdminProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border ${
                isSuperAdminProfileOpen
                  ? 'bg-slate-100 border-slate-300 ring-2 ring-brand-500/20'
                  : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
              }`}
              aria-label="Super Admin Profile Menu"
              aria-expanded={isSuperAdminProfileOpen}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-700 text-white font-bold flex items-center justify-center shadow-xs text-xs sm:text-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Super Admin'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Super Administrator
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isSuperAdminProfileOpen ? 'rotate-180 text-brand-600' : ''
                }`}
              />
            </button>

          {/* Profile Area Open Popover */}
          {isSuperAdminProfileOpen && (
            <div
              id="superadmin-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 px-3 z-50 animate-in fade-in-50"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {user?.full_name || 'Super Administrator'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                  {user?.email || 'admin@iqac.local'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  Product Administrator
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="superadmin-logout-btn"
                  onClick={() => {
                    setIsSuperAdminProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // ADMIN1 (COLLEGE MANAGEMENT) CLEAN HEADER
  // ==========================================
  if (user?.role === 'COLLEGE_MANAGEMENT') {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Top-Left: Logo & Application Name: Professor360 */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <Professor360Logo size="md" className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Professor360
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Admin1 • College Management
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                {user?.college_name || 'Demo Engineering College'} • Institutional Monitoring
              </p>
            </div>
          </div>
        </div>

        {/* Top-Right: Notification Bell & Admin1 Profile Icon */}
        <div className="flex items-center gap-3">
          {/* Notification Button & Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              id="management-notif-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
              aria-label="Management Notifications"
            >
              <Bell className="w-5 h-5 text-amber-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                id="management-notif-dropdown"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.some((n) => !n.is_read) && (
                    <button
                      type="button"
                      onClick={() => handleMarkAllRead()}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 my-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications received yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isReportNotif =
                        n.category === 'REPORT' ||
                        n.notification_type === 'HOD_ADMIN_REPORT_SUBMISSION' ||
                        n.title?.includes('Report');
                      const reportId = n.metadata?.report_id || n.related_id;
                      const deptName = n.metadata?.department_name || n.metadata?.department_code;
                      const hodName = n.metadata?.hod_name;
                      const submittedAt = n.metadata?.submitted_at || n.created_at;
                      const reportStatus = n.metadata?.report_status || 'SUBMITTED';

                      return (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors rounded-xl ${
                            !n.is_read ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {deptName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                  {deptName}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {reportStatus}
                              </span>
                            </div>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="font-bold text-slate-900 mt-1.5 leading-snug">
                            {n.metadata?.report_title || n.title}
                          </p>

                          {hodName && (
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Submitted by HOD: <strong className="text-slate-800">{hodName}</strong>
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">
                              {new Date(submittedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isReportNotif && reportId && (
                              <button
                                type="button"
                                id={`mgmt-notif-download-${n.id}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleMarkRead(n.id);
                                  void openPrivateFile(`/api/v1/reports/${reportId}/download/`);
                                  setIsNotifOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>View / Download</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin1 Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              id="admin1-profile-btn"
              onClick={() => setIsSuperAdminProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border ${
                isSuperAdminProfileOpen
                  ? 'bg-slate-100 border-slate-300 ring-2 ring-brand-500/20'
                  : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
              }`}
              aria-label="Admin1 Profile Menu"
              aria-expanded={isSuperAdminProfileOpen}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-600 to-brand-600 text-white font-bold flex items-center justify-center shadow-xs text-xs sm:text-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Admin1'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Principal / Dean / Chairman
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isSuperAdminProfileOpen ? 'rotate-180 text-brand-600' : ''
                }`}
              />
            </button>

            {/* Profile Area Open Popover */}
            {isSuperAdminProfileOpen && (
              <div
                id="admin1-profile-dropdown"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">
                    {user?.full_name || 'Admin1 (Principal)'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {user?.email}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    Admin1 • College Management
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    id="admin1-logout-btn"
                    onClick={() => {
                      setIsSuperAdminProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // ADMIN2 (IQAC MEMBER) CLEAN HEADER
  // ==========================================
  if (user?.role === 'IQAC') {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Left Side: College Logo & Application Name */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <Professor360Logo size="md" className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Professor360
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Admin2 • IQAC Member
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                {user?.college_name || 'Demo Engineering College'} • Institutional Quality Assurance Cell
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Bell & Admin2 Profile Icon */}
        <div className="flex items-center gap-3">
          {/* Notification Button & Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              id="iqac-notif-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
              aria-label="IQAC Notifications"
            >
              <Bell className="w-5 h-5 text-teal-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                id="iqac-notif-dropdown"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-teal-100 text-teal-800 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.some((n) => !n.is_read) && (
                    <button
                      type="button"
                      onClick={() => handleMarkAllRead()}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 my-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications received yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isReportNotif =
                        n.category === 'REPORT' ||
                        n.notification_type === 'HOD_ADMIN_REPORT_SUBMISSION' ||
                        n.title?.includes('Report');
                      const reportId = n.metadata?.report_id || n.related_id;
                      const deptName = n.metadata?.department_name || n.metadata?.department_code;
                      const hodName = n.metadata?.hod_name;
                      const submittedAt = n.metadata?.submitted_at || n.created_at;
                      const reportStatus = n.metadata?.report_status || 'SUBMITTED';

                      return (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors rounded-xl ${
                            !n.is_read ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {deptName && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                  {deptName}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {reportStatus}
                              </span>
                            </div>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="font-bold text-slate-900 mt-1.5 leading-snug">
                            {n.metadata?.report_title || n.title}
                          </p>

                          {hodName && (
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Submitted by HOD: <strong className="text-slate-800">{hodName}</strong>
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">
                              {new Date(submittedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isReportNotif && reportId && (
                              <button
                                type="button"
                                id={`iqac-notif-download-${n.id}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleMarkRead(n.id);
                                  void openPrivateFile(`/api/v1/reports/${reportId}/download/`);
                                  setIsNotifOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>View / Download</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin2 Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              id="admin2-profile-btn"
              onClick={() => setIsSuperAdminProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border ${
                isSuperAdminProfileOpen
                  ? 'bg-slate-100 border-slate-300 ring-2 ring-teal-500/20'
                  : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
              }`}
              aria-label="Admin2 Profile Menu"
              aria-expanded={isSuperAdminProfileOpen}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-700 text-white font-bold flex items-center justify-center shadow-xs text-xs sm:text-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Admin2'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  IQAC Member / Coordinator
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isSuperAdminProfileOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </button>

            {/* Profile Area Open Popover */}
            {isSuperAdminProfileOpen && (
              <div
                id="admin2-profile-dropdown"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">
                    {user?.full_name || 'Dr. Suresh Sharma (IQAC)'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {user?.email}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                    <ShieldCheck className="w-3 h-3 text-teal-600" />
                    Admin2 • IQAC Member
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    id="admin2-logout-btn"
                    onClick={() => {
                      setIsSuperAdminProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // DEPARTMENT IN-CHARGE CLEAN HEADER
  // ==========================================
  if (user?.role === 'DEPARTMENT_INCHARGE') {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Left Side: Professor360 Logo & Application Name */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => navigate('/incharge/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
            title="Go to Main Dashboard"
          >
            <Professor360Logo size="md" className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Professor360
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Dept In-charge • {user?.department_name || 'CSE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                {user?.college_name || 'Demo Engineering College'} • Department Level Management
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Icon, In-charge Name & Logout Popover */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            id="incharge-profile-btn"
            onClick={() => setIsSuperAdminProfileOpen((prev) => !prev)}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border ${
              isSuperAdminProfileOpen
                ? 'bg-slate-100 border-slate-300 ring-2 ring-indigo-500/20'
                : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
            }`}
            aria-label="Department In-charge Profile Menu"
            aria-expanded={isSuperAdminProfileOpen}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-700 text-white font-bold flex items-center justify-center shadow-xs text-xs sm:text-sm">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {user?.full_name || 'Prof. Vikram Joshi'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Department In-charge
              </p>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isSuperAdminProfileOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </button>

          {/* Profile Area Open Popover */}
          {isSuperAdminProfileOpen && (
            <div
              id="incharge-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 px-3 z-50 animate-in fade-in-50"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {user?.full_name || 'Prof. Vikram Joshi'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                  {user?.email}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  Department In-charge • {user?.department_name || 'CSE'}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="incharge-logout-btn"
                  onClick={() => {
                    setIsSuperAdminProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // ==========================================
  // HEAD OF DEPARTMENT (HOD) CLEAN HEADER
  // ==========================================
  if (user?.role === 'HOD') {
    return (
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 shadow-xs">
        {/* Left Side: Professor360 Logo & Application Name */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => navigate('/hod/downloads')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
            title="Professor360 - HOD Portal"
          >
            <Professor360Logo size="md" className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Professor360
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  HOD • {user?.department_name || 'Department'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                {user?.college_name || 'Demo Engineering College'} • Head of Department
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Icon & HOD Profile Icon */}
        <div className="flex items-center gap-3">
          {/* Notification Button & Dropdown */}
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              id="hod-notif-btn"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-purple-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                id="hod-notif-dropdown"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-800 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      navigate('/hod/downloads');
                    }}
                    className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 my-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications received yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isReportNotif =
                        n.category === 'REPORT' ||
                        n.notification_type === 'HOD_REPORT_SUBMISSION' ||
                        n.title?.includes('Report');
                      const reportId = n.related_id || n.metadata?.report_id;
                      return (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors rounded-xl ${
                            !n.is_read ? 'bg-purple-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-900 leading-tight">
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {n.body}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1">
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {isReportNotif && reportId && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleMarkRead(n.id);
                                  try {
                                    await apiClient.post(`/reports/${reportId}/hod-download/`);
                                  } catch (err) {}
                                  void openPrivateFile(`/api/v1/reports/${reportId}/download/`);
                                  navigate('/hod/downloads');
                                  setIsNotifOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HOD Profile Section */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              id="hod-profile-btn"
              onClick={() => setIsSuperAdminProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border ${
                isSuperAdminProfileOpen
                  ? 'bg-slate-100 border-slate-300 ring-2 ring-purple-500/20'
                  : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
              }`}
              aria-label="HOD Profile Menu"
              aria-expanded={isSuperAdminProfileOpen}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-700 text-white font-bold flex items-center justify-center shadow-xs text-xs sm:text-sm">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.full_name || 'Head of Department'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  HOD Profile
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isSuperAdminProfileOpen ? 'rotate-180 text-purple-600' : ''
                }`}
              />
            </button>

            {/* Profile Area Open Popover */}
            {isSuperAdminProfileOpen && (
              <div
                id="hod-profile-dropdown"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 px-3 z-50 animate-in fade-in-50"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">
                    {user?.full_name || 'Head of Department'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                    {user?.email}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    HOD • {user?.department_name || 'Engineering'}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    id="hod-logout-btn"
                    onClick={() => {
                      setIsSuperAdminProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ==========================================
  // STANDARD HEADER FOR INSTITUTIONAL ROLES
  // ==========================================
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Left side: Hamburger (mobile) & College Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus-ring touch-target"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Professor360Logo size="md" className="shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black tracking-tight uppercase text-brand-600">
              Professor360 •
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {user?.college_name || 'IQAC Central Platform'}
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
            {user?.department_name ? `${user.department_name} • ` : ''}
            Academic Year 2024-25
          </p>
        </div>
      </div>

      {/* Center Search / Command Palette Shortcut */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs font-medium transition-all cursor-pointer focus-ring"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search or execute command...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500 shadow-xs">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      )}

      {/* Right side controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile search icon button */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="sm:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus-ring touch-target"
            aria-label="Open command search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* Feedback Button */}
        {onOpenFeedback && (
          <button
            type="button"
            onClick={onOpenFeedback}
            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer focus-ring"
            title="Feedback & Support"
            aria-label="Submit platform feedback"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Ask Copilot Button */}
        <button
          type="button"
          onClick={() => navigate('/ai/copilot')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl shadow-xs text-xs font-bold transition-all cursor-pointer"
          title="Ask IQAC AI Copilot"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="hidden md:inline">Ask Copilot</span>
        </button>

        {/* Active Authenticated Role & College Badge */}
        {user && (
          <div className="hidden lg:flex items-center gap-2 bg-slate-100/90 py-1.5 px-3 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {user.role ? user.role.replace(/_/g, ' ') : 'USER'}
            </span>
            {user.college_name && (
              <span className="text-[11px] text-slate-500 max-w-[150px] truncate border-l border-slate-300 pl-2 font-medium">
                {user.college_name}
              </span>
            )}
          </div>
        )}

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus-ring touch-target"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 z-50 animate-in fade-in-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNavigateToRecord(n)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-800">{n.title}</p>
                          {n.priority === 'URGENT' && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                              Urgent
                            </span>
                          )}
                          {n.priority === 'HIGH' && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
                              High
                            </span>
                          )}
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>{n.category || 'SYSTEM'}</span>
                        <span>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-50 text-brand-700 font-semibold border border-brand-200 flex items-center justify-center text-xs sm:text-sm shrink-0">
            {user?.first_name?.[0]}
            {user?.last_name?.[0]}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</p>
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer focus-ring touch-target"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};
