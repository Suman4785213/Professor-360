import React, { useState } from 'react';
import { AICopilotPendingAction } from '../../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  FileSpreadsheet,
  CheckSquare,
} from 'lucide-react';

interface ActionProposalCardProps {
  messageId: string;
  pendingAction: AICopilotPendingAction;
  actionConfirmed?: boolean;
  onConfirm: (messageId: string, confirm: boolean) => Promise<void>;
}

export const ActionProposalCard: React.FC<ActionProposalCardProps> = ({
  messageId,
  pendingAction,
  actionConfirmed,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(
    actionConfirmed ? 'CONFIRMED' : null
  );

  const handleDecision = async (confirm: boolean) => {
    setIsSubmitting(true);
    try {
      await onConfirm(messageId, confirm);
      setLocalStatus(confirm ? 'CONFIRMED' : 'DISMISSED');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResolved = localStatus === 'CONFIRMED' || localStatus === 'DISMISSED' || actionConfirmed;

  return (
    <div className="mt-3 p-4 rounded-xl border border-amber-300/70 dark:border-amber-700/60 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-amber-100/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/20 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {pendingAction.type === 'CREATE_TASK' ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 tracking-wide uppercase">
            Human Confirmation Required
          </span>
        </div>

        {isResolved ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
              localStatus === 'CONFIRMED' || actionConfirmed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {localStatus === 'CONFIRMED' || actionConfirmed ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Action Executed
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-slate-500" />
                Proposal Dismissed
              </>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            AI Assists, Not Decides
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {pendingAction.prompt}
        </p>

        {/* Action Payload Preview */}
        <div className="mt-2.5 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1.5">
          {pendingAction.type === 'CREATE_TASK' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Task Title:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {pendingAction.payload.title || 'Untitled Task'}
                </span>
              </div>
              {pendingAction.payload.priority && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Priority:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {pendingAction.payload.priority}
                  </span>
                </div>
              )}
              {pendingAction.payload.due_days && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Due Within:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {pendingAction.payload.due_days} days
                  </span>
                </div>
              )}
            </>
          )}

          {pendingAction.type === 'GENERATE_REPORT' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Report Title:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {pendingAction.payload.title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Report Type:</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {pendingAction.payload.report_type}
                </span>
              </div>
              {pendingAction.payload.academic_year && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Academic Year:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {pendingAction.payload.academic_year}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Decision Buttons */}
      {!isResolved && (
        <div className="mt-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(false)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-300 dark:border-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-xs transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Execute
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
