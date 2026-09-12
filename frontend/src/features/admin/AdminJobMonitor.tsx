import React, { useEffect, useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  FileText,
  UploadCloud,
  Mail,
  Webhook,
} from 'lucide-react';
import { supportApi, BackgroundJob } from '../../api/support';
import { Button } from '../../components/ui/Button';

export const AdminJobMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadJobs();
  }, [typeFilter, statusFilter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getBackgroundJobs({
        job_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setJobs(data);
    } catch (e) {
      console.error('Failed to load background jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (job: BackgroundJob) => {
    setRetryingId(job.id);
    setMessage('');
    try {
      const res = await supportApi.retryBackgroundJob(job.job_type, job.id);
      setMessage(res.message || 'Job safely re-queued for execution.');
      await loadJobs();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to retry job.');
    } finally {
      setRetryingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AI':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'REPORTS':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'IMPORTS':
        return <UploadCloud className="w-4 h-4 text-emerald-600" />;
      case 'NOTIFICATIONS':
        return <Mail className="w-4 h-4 text-amber-600" />;
      case 'WEBHOOKS':
        return <Webhook className="w-4 h-4 text-indigo-600" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> COMPLETED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <RotateCw className="w-3 h-3 animate-spin" /> RUNNING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <Clock className="w-3 h-3" /> QUEUED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center border border-slate-800">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
            Execution Telemetry
          </span>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <Cpu className="w-7 h-7 text-indigo-400" />
            Background Task Monitoring
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time pipeline monitoring for AI jobs, reports, bulk imports, and outbound notifications with safe retry controls.
          </p>
        </div>
        <Button
          onClick={loadJobs}
          variant="outline"
          size="md"
          className="text-white border-slate-700 hover:bg-slate-800 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Pipeline
        </Button>
      </div>

      {message && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-2xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          {message}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Job Type:</span>
          {['', 'AI', 'REPORTS', 'IMPORTS', 'NOTIFICATIONS', 'WEBHOOKS'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t || 'All Types'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Task Pipeline Telemetry</h3>
          <span className="text-xs text-slate-400 font-semibold">{jobs.length} jobs retrieved</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading task telemetry...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No background tasks found for current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">Type</th>
                  <th className="p-4">Job Title & Context</th>
                  <th className="p-4">Institution</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Queued At</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(job.job_type)}
                        <span className="font-bold text-slate-800">{job.job_type}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-sm">
                      <p className="font-semibold text-slate-900 truncate">{job.title}</p>
                      {job.error_message && (
                        <p className="text-[11px] text-rose-600 truncate mt-0.5" title={job.error_message}>
                          {job.error_message}
                        </p>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-600">{job.tenant_name}</td>
                    <td className="p-4 whitespace-nowrap">{getStatusBadge(job.status)}</td>
                    <td className="p-4 whitespace-nowrap text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      {job.is_retryable && (
                        <Button
                          onClick={() => handleRetry(job)}
                          disabled={retryingId === job.id}
                          variant="outline"
                          size="sm"
                          className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                        >
                          <RotateCw className={`w-3 h-3 mr-1 ${retryingId === job.id ? 'animate-spin' : ''}`} />
                          Safe Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
