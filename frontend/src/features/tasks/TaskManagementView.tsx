import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IQACTask, TaskPriority, TaskStatus, TaskDeadlineSummary } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailModal } from './TaskDetailModal';

export const TaskManagementView: React.FC = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<IQACTask[]>([]);
  const [deadlines, setDeadlines] = useState<TaskDeadlineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeadlineCategory, setSelectedDeadlineCategory] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isManagement = user?.role === 'COLLEGE_MANAGEMENT';

  useEffect(() => {
    fetchTasksAndDeadlines();
  }, [statusFilter, priorityFilter]);

  const fetchTasksAndDeadlines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const [tasksRes, deadlinesRes] = await Promise.all([
        apiClient.get(`/tasks/?${params.toString()}`),
        apiClient.get('/tasks/deadlines/').catch(() => ({ data: null })),
      ]);

      setTasks(tasksRes.data.results || tasksRes.data || []);
      if (deadlinesRes.data) {
        setDeadlines(deadlinesRes.data);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
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

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            IN PROGRESS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3" /> BLOCKED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            TODO
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedDeadlineCategory && deadlines) {
      const list = (deadlines as any)[selectedDeadlineCategory] || [];
      if (!list.some((item: any) => item.id === t.id)) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.owner_name && t.owner_name.toLowerCase().includes(q)) ||
      (t.department_name && t.department_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shadow-xs">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">IQAC Task Management</h2>
            <p className="text-xs text-slate-500">
              Track quality assurance action items, evidence collection, and workflow milestones
            </p>
          </div>
        </div>

        {!isManagement && (
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Task
          </Button>
        )}
      </div>

      {/* Deadline Summary Metric Cards */}
      {deadlines && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              id: 'overdue',
              label: 'Overdue',
              count: deadlines.overdue?.length || 0,
              color: 'text-rose-700 bg-rose-50 border-rose-200',
              icon: AlertTriangle,
            },
            {
              id: 'due_today',
              label: 'Due Today',
              count: deadlines.due_today?.length || 0,
              color: 'text-amber-700 bg-amber-50 border-amber-200',
              icon: Clock,
            },
            {
              id: 'due_tomorrow',
              label: 'Due Tomorrow',
              count: deadlines.due_tomorrow?.length || 0,
              color: 'text-blue-700 bg-blue-50 border-blue-200',
              icon: Calendar,
            },
            {
              id: 'due_this_week',
              label: 'Due This Week',
              count: deadlines.due_this_week?.length || 0,
              color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
              icon: Calendar,
            },
            {
              id: 'upcoming',
              label: 'Upcoming',
              count: deadlines.upcoming?.length || 0,
              color: 'text-slate-700 bg-slate-50 border-slate-200',
              icon: CheckSquare,
            },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedDeadlineCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() =>
                  setSelectedDeadlineCategory(isSelected ? null : cat.id)
                }
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${cat.color} ${
                  isSelected ? 'ring-2 ring-brand-500 shadow-md scale-[1.02]' : 'hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {cat.label}
                  </span>
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div className="text-xl font-black">{cat.count}</div>
                {isSelected && (
                  <span className="text-[10px] font-bold block mt-1 underline">
                    Filtering active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-3 bg-white shadow-xs border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'All Statuses' },
              { id: 'TODO', label: 'Todo' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'BLOCKED', label: 'Blocked' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority filter */}
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
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title, description, owner, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
          />
        </div>
      </Card>

      {/* Tasks Table / Cards */}
      <Card className="overflow-hidden border-slate-200">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <CheckSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedDeadlineCategory
                ? 'No tasks match the active filters.'
                : 'No tasks currently assigned. Create a new task to track quality deliverables.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setIsDetailModalOpen(true);
                }}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/80 cursor-pointer ${
                  t.is_overdue && t.status !== 'COMPLETED' ? 'border-l-4 border-l-rose-500 bg-rose-50/20' : ''
                }`}
              >
                {/* Left Task Info */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-slate-900">{t.title}</span>
                      {getStatusBadge(t.status)}
                      {getPriorityBadge(t.priority)}
                      {t.is_overdue && t.status !== 'COMPLETED' && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mb-2">{t.description}</p>
                    
                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {t.department_name || 'College-Wide'}
                      </span>
                      <span>•</span>
                      <span>Assignee: <strong className="text-slate-700">{t.owner_name || t.owner_email}</strong></span>
                      {t.metric_code && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-semibold">Metric {t.metric_code}</span>
                        </>
                      )}
                      {t.comments_count && t.comments_count > 0 ? (
                        <>
                          <span>•</span>
                          <span className="text-brand-600 font-semibold">{t.comments_count} comment(s)</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right Due Date & Action */}
                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Target Due
                    </span>
                    <span
                      className={`text-xs font-bold block ${
                        t.is_overdue && t.status !== 'COMPLETED' ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {t.due_date}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={fetchTasksAndDeadlines}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchTasksAndDeadlines}
      />
    </div>
  );
};
