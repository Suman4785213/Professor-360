import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { OperationalWorkQueueData, IQACTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Briefcase,
  CheckSquare,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Inbox,
  Award,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const MyWorkWidget: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<OperationalWorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyWork();
  }, [user?.role]);

  const fetchMyWork = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/work-queue/my-work/');
      setData(res.data);
    } catch (e) {
      console.error('Error fetching My Work:', e);
    } finally {
      setLoading(false);
    }
  };

  const getWorkspaceRoute = () => {
    switch (user?.role) {
      case 'IQAC':
        return '/iqac/work-queue';
      case 'HOD':
        return '/hod/work-queue';
      case 'DEPARTMENT_INCHARGE':
        return '/department/work-queue';
      case 'FACULTY':
        return '/faculty/workspace';
      default:
        return '/tasks';
    }
  };

  if (loading) {
    return (
      <Card className="p-5 border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Loading your operational work items...
        </div>
      </Card>
    );
  }

  const counts = data?.counts || {};
  const tasks = data?.tasks || [];
  const totalActionable =
    (counts.pending_verifications || 0) +
    (counts.tasks || 0) +
    (counts.returned || 0) +
    (counts.evidence_gaps || 0) +
    (counts.data_requests || 0);

  return (
    <Card className="p-5 bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">My Work & Operational Queue</h3>
            <p className="text-[11px] text-slate-500">
              Role-aware priority deliverables requiring your immediate attention
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(getWorkspaceRoute())}
          className="text-xs font-semibold"
        >
          Open Work Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Action Items
          </span>
          <span className="text-lg font-black text-slate-900">{totalActionable}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Assigned Tasks
          </span>
          <span className="text-lg font-black text-indigo-700">{counts.tasks || 0}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Verifications
          </span>
          <span className="text-lg font-black text-emerald-700">
            {counts.pending_verifications || counts.submissions || 0}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Overdue Alerts
          </span>
          <span className="text-lg font-black text-rose-700">{counts.overdue_tasks || 0}</span>
        </div>
      </div>

      {/* Priority Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Upcoming Deliverables
          </span>
          {tasks.slice(0, 3).map((t) => (
            <div
              key={t.id}
              onClick={() => navigate('/tasks')}
              className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-brand-300 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckSquare className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 truncate">{t.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.is_overdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.due_date}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-center">
          <p className="text-xs font-bold text-slate-700">All caught up!</p>
          <p className="text-[11px] text-slate-400">No pending personal tasks assigned to you.</p>
        </div>
      )}
    </Card>
  );
};
