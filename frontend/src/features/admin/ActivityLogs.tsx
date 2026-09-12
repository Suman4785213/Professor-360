import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { AuditLog } from '../../types';
import { Button } from '../../components/ui/Button';
import { History, Search, RefreshCw, ShieldAlert } from 'lucide-react';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/audit-logs/');
      setLogs(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.comment && l.comment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Platform Audit & Activity Logs</h2>
          <p className="text-xs text-slate-500">
            Immutable system-wide ledger of authentication, user provisioning, and institutional configuration
          </p>
        </div>
        <Button onClick={fetchLogs} variant="secondary" size="sm">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Logs
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by action, email, or details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No activity logs recorded yet</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor & Role</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Target Entity</th>
                  <th className="px-6 py-3.5">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 text-slate-500 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <div className="font-bold text-slate-900">{log.actor_email}</div>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-sans">
                      {log.model_name || 'System'} {log.object_repr ? `(${log.object_repr})` : ''}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-sans">
                      {log.comment || '—'}
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
