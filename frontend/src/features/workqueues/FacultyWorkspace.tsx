import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { OperationalWorkQueueData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Briefcase,
  FileText,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckSquare,
  Upload,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Award,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const FacultyWorkspace: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<OperationalWorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/work-queue/faculty/');
      setData(res.data);
    } catch (e) {
      console.error('Error fetching Faculty Workspace:', e);
    } finally {
      setLoading(false);
    }
  };

  const counts = data?.counts || {};
  const drafts = data?.drafts || [];
  const submissions = data?.submissions || [];
  const returned = data?.returned || [];
  const verified = data?.verified || [];
  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Faculty Workspace</h2>
            <p className="text-xs text-slate-500">
              Personal quality portfolio: Submissions, verification status, assigned tasks, and returned records
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faculty/submissions')}
            className="text-xs"
          >
            Verification Status
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/faculty/activities')}
            className="text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Evidence
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('RETURNED')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'RETURNED'
              ? 'ring-2 ring-rose-500 bg-rose-50/80 border-rose-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Returned Records</span>
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{counts.returned || 0}</div>
          <span className="text-[10px] text-rose-600 font-semibold">Requires correction</span>
        </div>

        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'ring-2 ring-amber-500 bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.submissions || 0}</div>
          <span className="text-[10px] text-slate-500">Tier-1/2/3 Verification</span>
        </div>

        <div
          onClick={() => setActiveTab('VERIFIED')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'VERIFIED'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Evidence</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{counts.verified || 0}</div>
          <span className="text-[10px] text-slate-500">Approved for AQAR/SSR</span>
        </div>

        <div
          onClick={() => setActiveTab('TASKS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'TASKS'
              ? 'ring-2 ring-indigo-500 bg-indigo-50/80 border-indigo-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Tasks</span>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.tasks || 0}</div>
          <span className="text-[10px] text-slate-500">Action deliverables</span>
        </div>

        <div
          onClick={() => setActiveTab('DRAFTS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'DRAFTS'
              ? 'ring-2 ring-slate-400 bg-slate-50 border-slate-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Drafts</span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.drafts || 0}</div>
          <span className="text-[10px] text-slate-500">Unsubmitted records</span>
        </div>
      </div>

      {/* Main Content List */}
      <Card className="overflow-hidden border-slate-200">
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Portfolio Items ({activeTab})
          </span>
          <div className="flex flex-wrap gap-1">
            {['ALL', 'RETURNED', 'PENDING', 'VERIFIED', 'TASKS', 'DRAFTS'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading workspace data...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* 1. Returned Submissions (Highest Priority) */}
            {(activeTab === 'ALL' || activeTab === 'RETURNED') &&
              returned.map((r: any) => (
                <div
                  key={`r-${r.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors bg-rose-50/25 border-l-4 border-l-rose-500"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{r.title}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                          ACTION REQUIRED
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium mb-1">
                        Feedback: {r.last_rejection_reason || 'Please provide supplementary proof or update certificates.'}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Category: {r.category_name} • Returned by {r.last_rejected_by_role || 'Reviewer'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/faculty/submissions/${r.id}`)}
                    className="text-xs font-semibold shrink-0 bg-rose-600 hover:bg-rose-700"
                  >
                    Fix & Resubmit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* 2. Pending Submissions */}
            {(activeTab === 'ALL' || activeTab === 'PENDING') &&
              submissions.map((s: any) => (
                <div
                  key={`s-${s.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{s.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Category: {s.category_name} • Submitted for quality verification
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/faculty/submissions/${s.id}`)}
                    className="text-xs shrink-0"
                  >
                    View Status <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* 3. Verified Evidence */}
            {(activeTab === 'ALL' || activeTab === 'VERIFIED') &&
              verified.map((v: any) => (
                <div
                  key={`v-${v.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{v.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          VERIFIED EVIDENCE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Category: {v.category_name} • Successfully validated and accredited
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/faculty/submissions/${v.id}`)}
                    className="text-xs shrink-0 text-emerald-700"
                  >
                    View Record <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* 4. Tasks */}
            {(activeTab === 'ALL' || activeTab === 'TASKS') &&
              tasks.map((t: any) => (
                <div
                  key={`t-${t.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{t.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Target Due Date: <strong className="text-slate-700">{t.due_date}</strong>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/tasks')}
                    className="text-xs shrink-0"
                  >
                    View Task <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
};
