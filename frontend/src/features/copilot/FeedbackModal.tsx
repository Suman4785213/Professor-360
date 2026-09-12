import React, { useState } from 'react';
import { copilotApi } from '../../api/copilot';
import {
  ThumbsUp,
  ThumbsDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface FeedbackModalProps {
  messageId: string;
  isOpen: boolean;
  initialHelpful: boolean;
  onClose: () => void;
  onSuccess: (isHelpful: boolean) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  messageId,
  isOpen,
  initialHelpful,
  onClose,
  onSuccess,
}) => {
  const [isHelpful, setIsHelpful] = useState<boolean>(initialHelpful);
  const [reason, setReason] = useState<
    'ACCURATE' | 'HALLUCINATION' | 'WRONG_ROLE_DATA' | 'POOR_EXPLANATION' | 'OTHER'
  >(initialHelpful ? 'ACCURATE' : 'HALLUCINATION');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await copilotApi.submitFeedback(messageId, isHelpful, reason, comment);
      onSuccess(isHelpful);
      onClose();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isHelpful ? (
              <ThumbsUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <ThumbsDown className="w-5 h-5 text-rose-500" />
            )}
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isHelpful ? 'Helpful Response' : 'Report AI Output Issue'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsHelpful(true);
                setReason('ACCURATE');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                isHelpful
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Accurate & Helpful
            </button>
            <button
              type="button"
              onClick={() => {
                setIsHelpful(false);
                setReason('HALLUCINATION');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                !isHelpful
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              Needs Improvement
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              {isHelpful ? (
                <>
                  <option value="ACCURATE">Accurate factual grounded data</option>
                  <option value="OTHER">Clear explanation & helpful actions</option>
                </>
              ) : (
                <>
                  <option value="HALLUCINATION">Hallucination or Unverified Information</option>
                  <option value="WRONG_ROLE_DATA">Accessed Outside Role Scope</option>
                  <option value="POOR_EXPLANATION">Incomplete or Unclear Explanation</option>
                  <option value="OTHER">Other Quality Defect</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What specifically could be improved or verified?"
              rows={3}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-2.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
