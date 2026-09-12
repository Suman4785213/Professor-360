import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ComingSoonProps {
  title: string;
  moduleName: string;
  description: string;
  onBack?: () => void;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  moduleName,
  description,
  onBack,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-2xl mx-auto my-8 shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
        <Sparkles className="w-8 h-8 text-brand-600 animate-pulse" />
      </div>
      <span className="text-xs font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-200 inline-block mb-3">
        Phase 3 Module
      </span>
      <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 mb-2 font-medium">{moduleName}</p>
      <p className="text-xs text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
        {description}
      </p>
      {onBack && (
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      )}
    </div>
  );
};
