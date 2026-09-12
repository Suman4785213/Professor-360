import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Check,
  Building,
  UserX,
  Lock,
} from 'lucide-react';
import { supportApi, SecurityEvent } from '../../api/support';
import { Button } from '../../components/ui/Button';

export const SecurityEventsExplorer: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    loadEvents();
  }, [severityFilter, typeFilter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.event_type = typeFilter;
      const data = await supportApi.getSecurityEvents(params);
      setEvents(data);
    } catch (e) {
      console.error('Failed to load security events:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await supportApi.resolveSecurityEvent(id);
      await loadEvents();
      if (selectedEvent?.id === id) {
        setSelectedEvent(prev => prev ? { ...prev, resolved: true } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-black bg-rose-100 text-rose-800 rounded-full border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full border border-slate-200">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center border border-slate-800">
        <div>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-500/30">
            Platform Security Monitoring
          </span>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Security Events & Threat Log
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time audit of authentication failures, permission violations, cross-tenant access attempts, and rate limit triggers.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-bold">Unresolved Threats</p>
          <p className="text-3xl font-black text-rose-400">
            {events.filter(e => !e.resolved).length}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Event Types</option>
            <option value="FAILED_LOGIN">Failed Login</option>
            <option value="PERMISSION_FAILURE">Permission Failure</option>
            <option value="CROSS_TENANT_ACCESS">Cross-Tenant Access Attempt</option>
            <option value="API_AUTH_FAILURE">API Authentication Failure</option>
            <option value="RATE_LIMIT_VIOLATION">Rate-Limit Violation</option>
            <option value="WEBHOOK_FAILURE">Webhook Failure</option>
            <option value="FILE_SECURITY_FAILURE">File Security Failure</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">{events.length} security events logged</span>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading security events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No security events recorded. All systems secure.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-4">Severity</th>
                  <th className="p-4">Event Type</th>
                  <th className="p-4">User / Actor</th>
                  <th className="p-4">Target Institution</th>
                  <th className="p-4">IP & Request Path</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 whitespace-nowrap">{getSeverityBadge(ev.severity)}</td>
                    <td className="p-4 font-mono font-bold text-slate-800 text-[11px]">{ev.event_type}</td>
                    <td className="p-4 text-slate-700 font-medium">{ev.user_email || 'Anonymous'}</td>
                    <td className="p-4 text-slate-600">{ev.college_name || 'Global Platform'}</td>
                    <td className="p-4 max-w-xs">
                      <p className="font-mono text-[10px] text-slate-500 truncate">{ev.path || 'N/A'}</p>
                      {ev.ip_address && <p className="text-[10px] text-slate-400">IP: {ev.ip_address}</p>}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      {ev.resolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
                        </span>
                      ) : (
                        <Button
                          onClick={() => handleResolve(ev.id)}
                          size="sm"
                          variant="outline"
                          className="text-xs text-indigo-600 hover:bg-indigo-50 font-bold"
                        >
                          Mark Resolved
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
