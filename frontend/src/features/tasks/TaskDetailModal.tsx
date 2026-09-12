import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IQACTask, TaskActivity, TaskComment, TaskStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  X,
  Clock,
  User,
  Building2,
  Calendar,
  Layers,
  AlertTriangle,
  Play,
  CheckCircle2,
  Ban,
  RotateCcw,
  MessageSquare,
  History,
  Send,
  Flame,
  Award
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { user } = useAuthStore();
  const [task, setTask] = useState<IQACTask | null>(null);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ACTIVITY' | 'COMMENTS'>('DETAILS');

  const isManagement = user?.role === 'COLLEGE_MANAGEMENT';

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskData();
    }
  }, [isOpen, taskId]);

  const fetchTaskData = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, actRes, commRes] = await Promise.all([
        apiClient.get(`/tasks/${taskId}/`),
        apiClient.get(`/tasks/${taskId}/activities/`),
        apiClient.get(`/tasks/${taskId}/comments/`),
      ]);
      setTask(taskRes.data);
      setActivities(actRes.data || []);
      setComments(commRes.data || []);
    } catch (e) {
      console.error('Error fetching task details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint: string, payload = {}) => {
    if (!taskId || isManagement) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/tasks/${taskId}/${endpoint}/`, payload);
      await fetchTaskData();
      onTaskUpdated();
    } catch (e) {
      console.error(`Error performing ${endpoint}:`, e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !newComment.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/tasks/${taskId}/comments/`, { comment: newComment.trim() });
      setNewComment('');
      const commRes = await apiClient.get(`/tasks/${taskId}/comments/`);
      setComments(commRes.data || []);
      const actRes = await apiClient.get(`/tasks/${taskId}/activities/`);
      setActivities(actRes.data || []);
      onTaskUpdated();
    } catch (e) {
      console.error('Error adding comment:', e);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !taskId) return null;

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">COMPLETED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">IN PROGRESS</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">BLOCKED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">TODO</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Task Details & Timeline</h3>
              <p className="text-xs text-slate-500">View progress, history, discussion and update workflow status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {loading || !task ? (
            <div className="py-16 text-center text-slate-400">Loading task details...</div>
          ) : (
            <>
              {/* Overdue Warning Banner */}
              {task.is_overdue && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Action Overdue</span>
                      <span className="text-[11px] text-rose-600">
                        This task passed its target deadline ({task.due_date}). Supervisor escalation active.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-900">
                    Overdue
                  </span>
                </div>
              )}

              {/* Title & Status Bar */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-1">{task.title}</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {getStatusBadge(task.status)}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Priority: <span className="text-slate-700">{task.priority}</span>
                  </span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Owner
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {task.owner_name || task.owner_email || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {task.department_name || 'College-Wide'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Due Date
                  </span>
                  <span className={`text-xs font-bold block ${task.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                    {task.due_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Academic Year
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {task.academic_year_code || '2024-25'}
                  </span>
                </div>
              </div>

              {/* Related Object Badges */}
              {(task.metric_code || task.evidence_title) && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-900">
                  {task.metric_code && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Metric {task.metric_code}: {task.metric_name}
                    </span>
                  )}
                  {task.evidence_title && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Evidence: {task.evidence_title}
                    </span>
                  )}
                </div>
              )}

              {/* Workflow Actions */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Workflow State Transitions
                </span>
                {isManagement ? (
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 text-[11px] italic">
                    College Management has monitoring-only oversight (Task status mutations disabled).
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {task.status === 'TODO' && (
                      <Button
                        size="sm"
                        onClick={() => handleAction('start')}
                        disabled={actionLoading}
                        className="text-xs"
                      >
                        <Play className="w-3.5 h-3.5 mr-1" /> Start Task
                      </Button>
                    )}

                    {['TODO', 'IN_PROGRESS', 'BLOCKED'].includes(task.status) && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAction('complete')}
                        disabled={actionLoading}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Complete
                      </Button>
                    )}

                    {['TODO', 'IN_PROGRESS'].includes(task.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('block')}
                        disabled={actionLoading}
                        className="text-xs text-rose-600 hover:bg-rose-50"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" /> Mark Blocked
                      </Button>
                    )}

                    {['COMPLETED', 'CANCELLED', 'BLOCKED'].includes(task.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('reopen')}
                        disabled={actionLoading}
                        className="text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen Task
                      </Button>
                    )}

                    {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction('cancel')}
                        disabled={actionLoading}
                        className="text-xs text-slate-600"
                      >
                        Cancel Task
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs: Activity Timeline vs Discussion */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex gap-2 border-b border-slate-100 pb-2 mb-3">
                  <button
                    onClick={() => setActiveTab('DETAILS')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'DETAILS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Information
                  </button>
                  <button
                    onClick={() => setActiveTab('ACTIVITY')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'ACTIVITY' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Activity Timeline ({activities.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('COMMENTS')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'COMMENTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Comments & Discussion ({comments.length})
                  </button>
                </div>

                {activeTab === 'ACTIVITY' && (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {activities.length === 0 ? (
                      <p className="text-slate-400 italic">No activity recorded yet.</p>
                    ) : (
                      activities.map((act) => (
                        <div key={act.id} className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                          <History className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{act.action}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(act.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              by {act.actor_name || act.actor_email}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'COMMENTS' && (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {comments.length === 0 ? (
                        <p className="text-slate-400 italic">No comments yet. Start the conversation!</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 text-[11px]">
                                {c.author_name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-700 text-xs">{c.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={handleAddComment} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment or follow-up note..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-xs bg-slate-50 text-slate-800"
                      />
                      <Button size="sm" type="submit" disabled={actionLoading || !newComment.trim()}>
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                )}

                {activeTab === 'DETAILS' && (
                  <div className="text-slate-600 space-y-2">
                    <p>
                      <strong className="text-slate-800">Creator:</strong> {task.creator_name}
                    </p>
                    <p>
                      <strong className="text-slate-800">Created on:</strong>{' '}
                      {new Date(task.created_at).toLocaleDateString()}
                    </p>
                    {task.completed_at && (
                      <p className="text-emerald-700 font-medium">
                        Completed on: {new Date(task.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
