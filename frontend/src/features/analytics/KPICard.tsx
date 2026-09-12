import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  colorScheme?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'purple';
  badge?: string;
  onClick?: () => void;
}

const colorMap = {
  emerald: {
    bg: 'from-emerald-500/10 to-transparent border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  blue: {
    bg: 'from-blue-500/10 to-transparent border-blue-500/20 hover:border-blue-500/40',
    iconBg: 'bg-blue-500/20 text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  indigo: {
    bg: 'from-indigo-500/10 to-transparent border-indigo-500/20 hover:border-indigo-500/40',
    iconBg: 'bg-indigo-500/20 text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  amber: {
    bg: 'from-amber-500/10 to-transparent border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/20 text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  rose: {
    bg: 'from-rose-500/10 to-transparent border-rose-500/20 hover:border-rose-500/40',
    iconBg: 'bg-rose-500/20 text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  purple: {
    bg: 'from-purple-500/10 to-transparent border-purple-500/20 hover:border-purple-500/40',
    iconBg: 'bg-purple-500/20 text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'blue',
  badge,
  onClick,
}) => {
  const c = colorMap[colorScheme];

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/70 backdrop-blur-md bg-gradient-to-b ${c.bg} border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{value}</span>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 pt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${c.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span
            className={`font-semibold flex items-center gap-1 ${
              trend.isNeutral
                ? 'text-slate-400'
                : trend.isPositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-500 text-[11px]">vs previous cycle</span>
        </div>
      )}
    </div>
  );
};
