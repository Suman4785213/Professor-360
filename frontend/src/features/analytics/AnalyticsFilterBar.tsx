import React from 'react';
import { RefreshCw, Filter, Calendar, Building2 } from 'lucide-react';
import { AcademicYear, Department } from '../../types';

interface AnalyticsFilterBarProps {
  academicYears: AcademicYear[];
  selectedYearId: string;
  onSelectYear: (yearId: string) => void;
  departments?: Department[];
  selectedDepartmentId?: string;
  onSelectDepartment?: (deptId: string) => void;
  loading?: boolean;
  onRefresh: () => void;
  lastUpdated?: string;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  academicYears,
  selectedYearId,
  onSelectYear,
  departments,
  selectedDepartmentId,
  onSelectDepartment,
  loading,
  onRefresh,
  lastUpdated,
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-400" />
          <span>Filters:</span>
        </div>

        {/* Academic Year Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <select
              id="analytics-year-filter"
              value={selectedYearId}
              onChange={(e) => onSelectYear(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:ring-0 focus:outline-none cursor-pointer pr-4"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id} className="bg-slate-900 text-slate-200">
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Department Filter (Optional) */}
        {departments && onSelectDepartment && (
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <select
                id="analytics-dept-filter"
                value={selectedDepartmentId || ''}
                onChange={(e) => onSelectDepartment(e.target.value)}
                className="bg-transparent border-none text-slate-200 focus:ring-0 focus:outline-none cursor-pointer pr-4"
              >
                <option value="" className="bg-slate-900 text-slate-200">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-slate-900 text-slate-200">
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Updated: {lastUpdated}
          </span>
        )}
        <button
          id="analytics-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium transition-all hover:shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>
    </div>
  );
};
