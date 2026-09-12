import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from './Modal';
import { MessageSquare, Send, Check, AlertCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const [category, setCategory] = useState<'SUGGESTION' | 'BUG' | 'QUESTION' | 'DATA_ISSUE'>('SUGGESTION');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    // Simulate recording feedback in storage/backend
    try {
      const existing = JSON.parse(localStorage.getItem('user_feedback_queue') || '[]');
      existing.push({
        id: Date.now().toString(),
        category,
        comment: comment.trim(),
        user_id: user?.id,
        user_email: user?.email,
        role: user?.role,
        college_id: user?.college,
        route: location.pathname,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('user_feedback_queue', JSON.stringify(existing));

      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setComment('');
        onClose();
      }, 1500);
    } catch {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Platform Feedback & Support" maxWidth="md">
      {submitted ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Thank you for your feedback!</h3>
          <p className="text-xs text-slate-500">
            Your note has been recorded and will help improve the quality assurance platform.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Found an issue, have a question, or have an idea to make accreditation workflows easier? We'd love to hear from you.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'SUGGESTION', label: 'Suggestion' },
                { key: 'BUG', label: 'Report a Bug' },
                { key: 'QUESTION', label: 'Question' },
                { key: 'DATA_ISSUE', label: 'Data Inquiry' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-left ${
                    category === c.key
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="feedback-comment" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="feedback-comment"
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what happened or what could be improved..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus-ring text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Context Attached:</span>
            </div>
            <p className="font-mono text-[10px] text-slate-600 pl-5">
              {user?.role} • {location.pathname}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer transition-colors focus-ring"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
