import React from 'react';
import { AlertTriangle, Copy, FileWarning, ExternalLink } from 'lucide-react';
import { AIDuplicateInfo } from '../../types';

interface DuplicateAlertProps {
  duplicateInfo?: AIDuplicateInfo | null;
  acknowledged: boolean;
  onToggleAcknowledge: (val: boolean) => void;
}

export const DuplicateAlert: React.FC<DuplicateAlertProps> = ({
  duplicateInfo,
  acknowledged,
  onToggleAcknowledge,
}) => {
  if (!duplicateInfo || !duplicateInfo.has_duplicate_warning) {
    return null;
  }

  const isExact = duplicateInfo.is_exact_duplicate;
  const matches = isExact
    ? duplicateInfo.exact_matches
    : duplicateInfo.fuzzy_matches;

  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        isExact
          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
          : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${
            isExact
              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300'
              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300'
          }`}
        >
          {isExact ? <FileWarning className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold ${
              isExact ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'
            }`}
          >
            {isExact ? 'Exact Duplicate File Detected' : 'Possible Duplicate Submission Detected'}
          </h4>
          <p
            className={`text-xs mt-1 leading-relaxed ${
              isExact ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {duplicateInfo.warning ||
              'Existing records share similar certificate metadata or checksum with this document.'}
          </p>

          {matches && matches.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Matching Institutional Records:
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {matches.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {m.activity_title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400 text-[11px]">
                        {m.certificate_number && <span>ID: {m.certificate_number}</span>}
                        {m.faculty_name && <span>• {m.faculty_name}</span>}
                      </div>
                    </div>
                    {m.status && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {m.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {m.type === 'EXACT_CHECKSUM' ? 'SHA-256 Match' : 'Metadata Match'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
            <input
              type="checkbox"
              id="ack_duplicate"
              checked={acknowledged}
              onChange={(e) => onToggleAcknowledge(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label
              htmlFor="ack_duplicate"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              I have reviewed the existing records and confirm this is a distinct activity.
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
