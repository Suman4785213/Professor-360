import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence?: number;
  detected?: boolean;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence = 0,
  detected = true,
  size = 'sm',
}) => {
  if (!detected || confidence <= 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
        title="Field not automatically detected"
      >
        <HelpCircle className="w-3 h-3" />
        Not Detected
      </span>
    );
  }

  const percentage = Math.round(confidence * 100);

  if (confidence >= 0.85) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-800 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
        title={`High confidence extraction: ${percentage}%`}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{percentage}% Confidence</span>
      </span>
    );
  }

  if (confidence >= 0.60) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800 ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
        title={`Medium confidence extraction: ${percentage}%. Please review.`}
      >
        <Sparkles className="w-3 h-3 text-amber-600" />
        <span>{percentage}% Medium</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-medium border border-rose-200 dark:border-rose-800 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
      title={`Low confidence extraction: ${percentage}%. Human review strongly recommended.`}
    >
      <AlertCircle className="w-3 h-3 text-rose-600" />
      <span>{percentage}% Low</span>
    </span>
  );
};
