import React from 'react';
import { ShieldCheck, AlertOctagon, AlertTriangle, Info, CheckCircle2, Wrench } from 'lucide-react';
import { DataQualityReport } from '../../types';

interface DataQualityCardProps {
  qualityReport: DataQualityReport | null;
  loading?: boolean;
}

export const DataQualityCard: React.FC<DataQualityCardProps> = ({
  qualityReport,
  loading,
}) => {
  if (loading || !qualityReport) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 animate-pulse h-48" />
    );
  }

  const { quality_score, total_issues, high_severity_count, medium_severity_count, low_severity_count, issues } = qualityReport;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 75) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'HIGH':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">High</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">Medium</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">Low</span>;
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>Data Hygiene & Repository Health Scanner</span>
          </h3>
          <p className="text-xs text-slate-400">
            Automated detection of incomplete records, missing metadata, and unmapped artifacts
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 ${getScoreColor(quality_score)}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Hygiene Score</span>
            <span className="text-xl font-extrabold">{quality_score.toFixed(1)}%</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
              {high_severity_count} High
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
              {medium_severity_count} Medium
            </span>
            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
              {low_severity_count} Low
            </span>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      {issues.length === 0 ? (
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold">Clean Data Repository</p>
            <p className="text-slate-400">Zero metadata deficiencies, orphaned documents, or missing records detected.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">Issue Description</th>
                <th className="pb-3 pr-4">Department / Faculty</th>
                <th className="pb-3">Recommended Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {issues.slice(0, 6).map((issue, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-4 align-top">{getSeverityBadge(issue.severity)}</td>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium text-slate-200">{issue.description}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{issue.issue_type}</span>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <p className="font-medium text-slate-300">{issue.department_name}</p>
                    {issue.faculty_name && <p className="text-[11px] text-slate-500">{issue.faculty_name}</p>}
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex items-start gap-1.5 text-brand-300">
                      <Wrench className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-400" />
                      <span>{issue.suggested_fix}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length > 6 && (
            <div className="text-center pt-3 text-[11px] text-slate-500">
              Showing 6 of {issues.length} detected hygiene issues
            </div>
          )}
        </div>
      )}
    </div>
  );
};
