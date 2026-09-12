import React, { useState } from 'react';
import { Grid, CheckCircle2, AlertTriangle, XCircle, Search, Filter } from 'lucide-react';
import { GapMatrixData } from '../../types';

interface EvidenceGapMatrixProps {
  gapData: GapMatrixData | null;
  loading?: boolean;
}

export const EvidenceGapMatrix: React.FC<EvidenceGapMatrixProps> = ({
  gapData,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  if (loading || !gapData) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 animate-pulse h-64" />
    );
  }

  const { departments, matrix, summary } = gapData;

  const filteredMatrix = matrix.filter((row) => {
    const matchesSearch =
      row.metric_number.toLowerCase().includes(search.toLowerCase()) ||
      row.metric_title.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;

    // Check if any department has this status
    return Object.values(row.departments).some((d) => d.status === filterStatus);
  });

  const getCellBadge = (status: string, count: number) => {
    switch (status) {
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {count}
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" />
            {count}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-2.5 h-2.5" />
            0
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Grid className="w-4 h-4 text-brand-400" />
            <span>Evidence Gap Cross-Tabulation Matrix</span>
          </h3>
          <p className="text-xs text-slate-400">
            Metric × Department evidence availability cross-analysis
          </p>
        </div>

        {/* Matrix Summary Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
            {summary.complete_cells} Complete
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
            {summary.partial_cells} Partial
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
            {summary.missing_cells} Missing
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search metric number or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent border-none text-slate-200 focus:ring-0 focus:outline-none cursor-pointer pr-3 text-xs"
          >
            <option value="ALL" className="bg-slate-900">All Statuses</option>
            <option value="COMPLETE" className="bg-slate-900">Has Complete</option>
            <option value="PARTIAL" className="bg-slate-900">Has Partial</option>
            <option value="MISSING" className="bg-slate-900">Has Missing</option>
          </select>
        </div>
      </div>

      {/* Cross-Tabulation Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700/80">
              <th className="p-3.5 sticky left-0 bg-slate-800/95 z-10 min-w-[200px]">Metric</th>
              {departments.map((dept) => (
                <th key={dept.id} className="p-3.5 text-center min-w-[100px]">
                  {dept.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filteredMatrix.length === 0 ? (
              <tr>
                <td colSpan={departments.length + 1} className="text-center py-6 text-slate-500">
                  No metrics matched the selected filter.
                </td>
              </tr>
            ) : (
              filteredMatrix.map((row) => (
                <tr key={row.metric_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 sticky left-0 bg-slate-900/95 z-10">
                    <span className="font-bold text-brand-300 block">{row.metric_number}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">{row.metric_title}</span>
                  </td>
                  {departments.map((dept) => {
                    const cell = row.departments[dept.id] || { status: 'MISSING', count: 0 };
                    return (
                      <td key={dept.id} className="p-3.5 text-center">
                        {getCellBadge(cell.status, cell.count)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
