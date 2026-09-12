import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AICopilotSource } from '../../types';
import {
  Award,
  Layers,
  FileCheck,
  FileText,
  User,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface SourceCardProps {
  source: AICopilotSource;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (source.type?.toUpperCase()) {
      case 'EVIDENCE':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'METRIC':
        return <Layers className="w-4 h-4 text-brand-500" />;
      case 'ACTIVITY':
        return <FileCheck className="w-4 h-4 text-blue-500" />;
      case 'FACULTY':
        return <User className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNavigate = () => {
    if (source.url) {
      navigate(source.url);
    }
  };

  return (
    <div
      onClick={handleNavigate}
      className="group flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs hover:shadow-sm"
      title={`Click to view ${source.title}`}
    >
      <div className="mt-0.5 p-1.5 rounded-md bg-white dark:bg-slate-700 shadow-2xs">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {source.type}
          </span>
          {source.is_verified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
              <ShieldCheck className="w-2.5 h-2.5" />
              Verified
            </span>
          )}
          {source.academic_year && (
            <span className="text-[10px] text-slate-500 font-medium">
              AY {source.academic_year}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {source.title}
        </p>

        {source.department && (
          <p className="text-[11px] text-slate-500 truncate">
            Dept: {source.department}
          </p>
        )}
      </div>

      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 transition-colors mt-1 shrink-0" />
    </div>
  );
};
