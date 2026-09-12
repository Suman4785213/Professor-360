import React, { useEffect, useState } from 'react';
import { Megaphone, X, AlertCircle, Info, Flame } from 'lucide-react';
import { Announcement } from '../../types';
import { integrationsApi } from '../../api/integrations';

export const AnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await integrationsApi.getAnnouncements({ is_active: true });
        setAnnouncements(data);
      } catch (err) {
        // Silently fail - announcement banner must not break page
        console.warn('Could not load announcements:', err);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleDismiss = (id: string) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    try {
      localStorage.setItem('dismissed_announcements', JSON.stringify(next));
    } catch {
      // ignore storage error
    }
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  // Display the top announcement with highest priority
  const top = visibleAnnouncements[0];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200',
          badge: 'bg-rose-600 text-white',
          icon: <Flame className="w-4 h-4 text-rose-600 animate-pulse" />,
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200',
          badge: 'bg-amber-600 text-white',
          icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
        };
      default:
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-200',
          badge: 'bg-indigo-600 text-white',
          icon: <Megaphone className="w-4 h-4 text-indigo-600" />,
        };
    }
  };

  const style = getPriorityStyle(top.priority);

  return (
    <div
      className={`border-b transition-all duration-200 ${style.bg} px-4 py-2.5 sm:px-6 shadow-sm flex items-center justify-between gap-3 text-xs`}
      role="alert"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
            {top.priority}
          </span>
          <span className="font-semibold">{top.title}:</span>
          <span className="truncate opacity-90">{top.message || top.content}</span>
        </div>
      </div>
      <button
        onClick={() => handleDismiss(top.id)}
        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex-shrink-0"
        title="Dismiss announcement"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
