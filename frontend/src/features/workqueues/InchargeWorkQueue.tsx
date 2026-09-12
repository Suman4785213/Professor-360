import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { OperationalWorkQueueData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  FileCheck,
  RotateCcw,
  ListTodo,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const InchargeWorkQueue: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<OperationalWorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  useEffect(() => {
    fetchQueueData();
  }, []);

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/work-queue/incharge/');
      setData(res.data);
    } catch (e) {
      console.error('Error fetching In-charge Work Queue:', e);
    } finally {
      setLoading(false);
    }
  };

  const counts = data?.counts || {};
  const submissions = data?.submissions || [];
  const returned = data?.returned || [];
  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              Department In-charge Work Queue
            </h2>
            <p className="text-xs text-slate-500">
              Tier-1 preliminary verification: Faculty submissions, evidence checks, and workflow tasks
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => navigate('/incharge/verification')}
          className="text-xs font-semibold"
        >
          Open Tier-1 Verification Hub
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('SUBMISSIONS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'SUBMISSIONS'
              ? 'ring-2 ring-brand-500 bg-brand-50/80 border-brand-300'
              : 'bg-white border-slate-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-brand-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faculty Submissions</span>
            <FileCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.submissions || 0}</div>
          <span className="text-[10px] text-slate-500">Awaiting Tier-1 check</span>
        </div>

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
          <div className="text-2xl font-black text-slate-900">{counts.returned || 0}</div>
          <span className="text-[10px] text-slate-500">Returned from HOD/IQAC</span>
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
            <span className="text-[11px] font-bold uppercase tracking-wider">Assigned Tasks</span>
            <ListTodo className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.tasks || 0}</div>
          <span className="text-[10px] text-slate-500">Action items</span>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Department</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {user?.department_name || 'Assigned Department'}
          </div>
          <span className="text-[10px] text-slate-400">Restricted Scope</span>
        </div>
      </div>

      {/* Main List */}
      <Card className="overflow-hidden border-slate-200">
        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Operational Work List ({activeTab})
          </span>
          <div className="flex gap-1">
            {['ALL', 'SUBMISSIONS', 'RETURNED', 'TASKS'].map((t) => (
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
          <div className="p-16 text-center text-xs text-slate-400">Loading work queue...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Submissions */}
            {(activeTab === 'ALL' || activeTab === 'SUBMISSIONS') &&
              submissions.map((s: any) => (
                <div
                  key={`s-${s.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-200">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{s.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                          AWAITING INCHARGE VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Faculty: <strong className="text-slate-700">{s.faculty_name}</strong> • Category: {s.category_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/incharge/verification/${s.id}`)}
                    className="text-xs font-semibold shrink-0"
                  >
                    Verify & Forward <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* Returned */}
            {(activeTab === 'ALL' || activeTab === 'RETURNED') &&
              returned.map((r: any) => (
                <div
                  key={`r-${r.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors bg-rose-50/20"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{r.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          RETURNED
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Faculty: <strong className="text-slate-700">{r.faculty_name}</strong> • Feedback: {r.last_rejection_reason || 'Requires update'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/incharge/verification/${r.id}`)}
                    className="text-xs shrink-0"
                  >
                    View Record <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}

            {/* Tasks */}
            {(activeTab === 'ALL' || activeTab === 'TASKS') &&
              tasks.map((t: any) => (
                <div
                  key={`t-${t.id}`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                      <ListTodo className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900">{t.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Owner: {t.owner_name} • Due: {t.due_date}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/tasks')}
                    className="text-xs shrink-0"
                  >
                    Manage Task <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
};
