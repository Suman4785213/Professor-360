import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  is403?: boolean;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  is403 = false,
  title,
  message,
  onRetry,
  onGoBack,
  className = '',
}) => {
  const displayTitle =
    title || (is403 ? '403 — Access Denied' : 'Something went wrong');
  const displayMessage =
    message ||
    (is403
      ? 'You do not have administrative permission to view this institutional section. Access is strictly controlled via role-based access policies.'
      : 'We encountered an error while communicating with the backend API. Please try again or contact support.');

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8 shadow-xs ${className}`}
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          is403
            ? 'bg-rose-50 text-rose-600 border border-rose-100'
            : 'bg-amber-50 text-amber-600 border border-amber-100'
        }`}
      >
        {is403 ? <ShieldAlert className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{displayTitle}</h3>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">{displayMessage}</p>
      <div className="flex gap-3">
        {onGoBack && (
          <Button variant="outline" size="sm" onClick={onGoBack}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Go to Dashboard
          </Button>
        )}
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
