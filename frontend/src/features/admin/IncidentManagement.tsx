import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Edit2,
  Check,
} from 'lucide-react';
import { supportApi, Incident } from '../../api/support';
import { Button } from '../../components/ui/Button';

export const IncidentManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [affectsAllTenants, setAffectsAllTenants] = useState(true);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED' | 'CLOSED'>('OPEN');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getIncidents();
      setIncidents(data);
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supportApi.createIncident({
        title,
        severity,
        description,
        affects_all_tenants: affectsAllTenants,
        status: 'OPEN',
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      loadIncidents();
    } catch (e) {
      console.error('Failed to create incident:', e);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, newResolution?: string) => {
    try {
      await supportApi.updateIncident(id, {
        status: newStatus as any,
        resolution: newResolution,
      });
      setSelectedIncident(null);
      loadIncidents();
    } catch (e) {
      console.error('Failed to update incident:', e);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-full border border-rose-200">OPEN</span>;
      case 'INVESTIGATING':
        return <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">INVESTIGATING</span>;
      case 'MITIGATED':
        return <span className="px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200">MITIGATED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full border border-slate-200">CLOSED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center border border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
            Platform Operations
          </span>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-amber-400" />
            Incident Management
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Track active service disruptions, mitigation milestones, and post-incident resolution communications.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="md"
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Log Incident
        </Button>
      </div>

      {/* Incidents List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Incident Registry</h3>
          <span className="text-xs text-slate-400 font-semibold">{incidents.length} recorded</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading incident registry...</div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No incidents registered. All services operational.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {incidents.map(inc => (
              <div key={inc.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(inc.status)}
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {inc.severity}
                      </span>
                      <span className="text-xs text-slate-400">
                        Started: {new Date(inc.started_at).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{inc.title}</h3>
                    <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">{inc.description}</p>
                    {inc.resolution && (
                      <div className="mt-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                        <strong>Resolution:</strong> {inc.resolution}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {inc.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(inc.id, 'INVESTIGATING')}
                        className="text-xs text-amber-700 border-amber-200"
                      >
                        Investigate
                      </Button>
                    )}
                    {['OPEN', 'INVESTIGATING'].includes(inc.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(inc.id, 'MITIGATED')}
                        className="text-xs text-blue-700 border-blue-200"
                      >
                        Mark Mitigated
                      </Button>
                    )}
                    {inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const res = prompt('Enter resolution summary:');
                          if (res) handleUpdateStatus(inc.id, 'RESOLVED', res);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Scope: <strong>{inc.affects_all_tenants ? 'All Institutions' : inc.affected_tenants_names.join(', ')}</strong></span>
                  {inc.created_by_name && <span>Logged by: {inc.created_by_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-600" />
              Log System Incident
            </h3>
            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Title</label>
                <input
                  type="text"
                  placeholder="e.g. Storage latency degradation on uploads..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tenant Impact</label>
                  <select
                    value={affectsAllTenants ? 'ALL' : 'SPECIFIC'}
                    onChange={e => setAffectsAllTenants(e.target.value === 'ALL')}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Institutions</option>
                    <option value="SPECIFIC">Single Tenant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Impact</label>
                <textarea
                  rows={4}
                  placeholder="Describe observed impact, affected components, and initial remediation steps..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  Publish Incident
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
