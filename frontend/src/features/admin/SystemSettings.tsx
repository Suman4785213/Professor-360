import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Database, ShieldCheck, Key, Server, Cpu } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Platform System Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Security parameters, multi-tenant isolation configuration, and database operational environment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Database & Storage Engine">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-600" /> Database Engine
              </span>
              <span className="font-bold text-slate-900">PostgreSQL 18</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-600" /> Database Name
              </span>
              <span className="font-mono font-bold text-slate-900">iqac_db</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand-600" /> Multi-Tenant Architecture
              </span>
              <Badge variant="success">Tenant-Scoped Foreign Keys</Badge>
            </div>
          </div>
        </Card>

        <Card title="Authentication & Role Security">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" /> Token Handling
              </span>
              <span className="font-bold text-slate-900">JWT (Access + Refresh)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Password Hashing
              </span>
              <span className="font-bold text-slate-900">PBKDF2 SHA-256</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Standard Roles
              </span>
              <Badge variant="brand">6 Strict System Roles</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
