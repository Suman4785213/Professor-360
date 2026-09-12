import React, { useEffect, useState } from 'react';
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  Sparkles,
  Mail,
  CreditCard,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { supportApi, SystemHealthData } from '../../api/support';
import { Button } from '../../components/ui/Button';

export const AdminSystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setRefreshing(true);
    try {
      const data = await supportApi.getSystemHealthDetail();
      setHealthData(data);
    } catch (e) {
      console.error('Failed to load system health:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> DEGRADED
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> DOWN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            UNKNOWN
          </span>
        );
    }
  };

  const servicesConfig = [
    { key: 'backend', name: 'Backend API Server', icon: Server, description: 'Core Django REST application runtime' },
    { key: 'postgresql', name: 'PostgreSQL Database', icon: Database, description: 'Primary multi-tenant relational persistence' },
    { key: 'redis', name: 'Redis / Cache Layer', icon: Zap, description: 'In-memory caching and session state' },
    { key: 'worker', name: 'Background Workers', icon: Cpu, description: 'Asynchronous task execution pipeline' },
    { key: 'storage', name: 'Document Storage', icon: HardDrive, description: 'Evidence and dossier media store' },
    { key: 'ai', name: 'AI Intelligence Engine', icon: Sparkles, description: 'Certificate OCR & heuristic parsing' },
    { key: 'email', name: 'Outbound Email', icon: Mail, description: 'SMTP notification dispatch engine' },
    { key: 'payment', name: 'Payment Gateway', icon: CreditCard, description: 'Commercial subscription & billing processor' },
    { key: 'webhooks', name: 'Webhooks Subsystem', icon: Webhook, description: 'HMAC signature event dispatch & listener' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              Observability & Telemetry
            </span>
            <span className="text-xs text-slate-400">Zero Secrets Exposure</span>
          </div>
          <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-400" />
            System Health & Service Diagnostics
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Real-time status, latency measurements, and operational health across all 9 platform subsystems.
          </p>
        </div>
        <Button
          onClick={fetchHealth}
          variant="outline"
          size="md"
          disabled={refreshing}
          className="text-white border-slate-700 hover:bg-slate-800 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Diagnostics
        </Button>
      </div>

      {/* Overall Rollup Card */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Overall System Health</p>
              <div className="mt-1">{getStatusBadge(healthData.overall_status)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Active Tenants</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {healthData.platform_counts.active_colleges} / {healthData.platform_counts.total_colleges}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Server className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Open Support Tickets</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {healthData.platform_counts.open_support_tickets}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Failed Background Jobs</p>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {healthData.platform_counts.failed_jobs}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* 9 Services Health Matrix */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Subsystem Health Matrix</h2>
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Probing services...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {servicesConfig.map(srv => {
              const info = healthData?.services[srv.key] || { status: 'UNKNOWN' };
              const Icon = srv.icon;
              return (
                <div
                  key={srv.key}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      {getStatusBadge(info.status)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{srv.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{srv.description}</p>
                    </div>
                  </div>

                  {/* Telemetry details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                    {info.latency_ms !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Response Latency:</span>
                        <span className="font-semibold text-slate-800">{info.latency_ms} ms</span>
                      </div>
                    )}
                    {info.engine && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Engine:</span>
                        <span className="font-semibold text-slate-800">{info.engine}</span>
                      </div>
                    )}
                    {info.total_gb && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacity / Used:</span>
                        <span className="font-semibold text-slate-800">
                          {info.used_pct}% ({info.free_gb} GB free)
                        </span>
                      </div>
                    )}
                    {info.provider && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Provider:</span>
                        <span className="font-semibold text-slate-800">{info.provider}</span>
                      </div>
                    )}
                    {info.backend_type && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mode:</span>
                        <span className="font-semibold text-slate-800">{info.backend_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
