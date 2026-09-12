import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={`relative inline-flex items-center align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label="Help information"
        aria-expanded={isOpen}
        className="text-slate-400 hover:text-slate-600 focus-ring rounded-full p-0.5 cursor-pointer inline-flex items-center justify-center transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-900 text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in-95 border border-slate-700 font-normal"
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
};
