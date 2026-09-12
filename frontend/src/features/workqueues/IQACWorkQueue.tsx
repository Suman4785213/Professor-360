import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { OperationalWorkQueueData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ListTodo,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  BookOpen,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Layers,
  Award,
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IQACWorkQueue: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OperationalWorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('PRIORITY');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchQueueData();
  }, []);

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/work-queue/iqac/');
      setData(res.data);
    } catch (e) {
      console.error('Error fetching IQAC Work Queue:', e);
    } finally {
      setLoading(false);
    }
  };

  const counts = data?.counts || {};
  const verifications = data?.pending_verifications || [];
  const tasks = data?.tasks || [];
  const overdueTasks = data?.overdue_tasks || [];
  const gaps = data?.evidence_gaps || [];
  const requests = data?.data_requests || [];
  const narratives = data?.narrative_reviews || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">IQAC Master Work Queue</h2>
            <p className="text-xs text-slate-500">
              Central operational triage: Pending approvals, evidence gaps, overdue tasks, and narrative reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="text-xs"
          >
            Manage All Tasks
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/iqac/verification')}
            className="text-xs font-semibold"
          >
            Tier-3 Verification Hub
          </Button>
        </div>
      </div>

      {/* Metric Summary Triage Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab('VERIFICATION')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'VERIFICATION'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verifications</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.pending_verifications || 0}</div>
          <span className="text-[10px] text-slate-500">Awaiting IQAC sign-off</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Tasks</span>
            <ListTodo className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.tasks || 0}</div>
          <span className="text-[10px] text-slate-500">Institutional action items</span>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'OVERDUE'
              ? 'ring-2 ring-rose-500 bg-rose-50/80 border-rose-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Alerts</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{counts.overdue_tasks || 0}</div>
          <span className="text-[10px] text-rose-600 font-semibold">Supervisor escalation</span>
        </div>

        <div
          onClick={() => setActiveTab('GAPS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'GAPS'
              ? 'ring-2 ring-amber-500 bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Evidence Gaps</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.evidence_gaps || 0}</div>
          <span className="text-[10px] text-slate-500">Unmapped metrics</span>
        </div>

        <div
          onClick={() => setActiveTab('NARRATIVES')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'NARRATIVES'
              ? 'ring-2 ring-cyan-500 bg-cyan-50/80 border-cyan-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Narratives</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.narrative_reviews || 0}</div>
          <span className="text-[10px] text-slate-500">AQAR draft reviews</span>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="p-4 space-y-3 bg-white shadow-xs border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'VERIFICATION', label: `Verifications (${counts.pending_verifications || 0})` },
              { id: 'TASKS', label: `Tasks (${counts.tasks || 0})` },
              { id: 'OVERDUE', label: `Overdue (${counts.overdue_tasks || 0})` },
              { id: 'GAPS', label: `Gaps (${counts.evidence_gaps || 0})` },
              { id: 'NARRATIVES', label: `Narratives (${counts.narrative_reviews || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="PRIORITY">Priority</option>
              <option value="DUE_DATE">Due Date</option>
              <option value="AGE">Age / Creation</option>
              <option value="DEPARTMENT">Department</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search queue items by title, faculty, department, or metric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
          />
        </div>
      </Card>

      {/* Main Queue Items */}
      <Card className="overflow-hidden border-slate-200">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading work queue...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* 1. Pending Verifications */}
            {(activeTab === 'ALL' || activeTab === 'VERIFICATION') &&
              verifications.map((v: any) => (
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
                          PENDING IQAC VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Submitted by: <strong className="text-slate-700">{v.faculty_name}</strong> • Dept: {v.department_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/iqac/verification/${v.id}`)}
                    className="text-xs font-semibold shrink-0"
                  >
                    Verify Activity <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* 2. Tasks & Overdue */}
            {(activeTab === 'ALL' || activeTab === 'TASKS' || activeTab === 'OVERDUE') &&
              (activeTab === 'OVERDUE' ? overdueTasks : tasks).map((t: any) => (
                <div
                  key={`t-${t.id}`}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                    t.is_overdue ? 'bg-rose-50/25 border-l-4 border-l-rose-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                      <ListTodo className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{t.title}</span>
                        {t.is_overdue && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            OVERDUE
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Owner: <strong className="text-slate-700">{t.owner_name || t.owner_email}</strong> • Due: {t.due_date}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/tasks')}
                    className="text-xs shrink-0"
                  >
                    Review Task <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* 3. Evidence Gaps */}
            {(activeTab === 'ALL' || activeTab === 'GAPS') &&
              gaps.map((g: any) => (
                <div
                  key={`g-${g.metric_id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">
                          Metric {g.metric_number}: {g.metric_title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          GAP DETECTED
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Criterion: {g.criterion_number} • Current verified count: {g.verified_count || 0}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/iqac/criteria/${g.criterion_number}/metric/${g.metric_number}`)}
                    className="text-xs shrink-0"
                  >
                    Map Evidence <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
};
