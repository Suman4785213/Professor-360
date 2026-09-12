import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center text-xs text-slate-500 font-medium ${className}`} aria-label="Breadcrumb">
      <div className="flex items-center gap-1.5">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-bold text-slate-800">{item.label}</span>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
