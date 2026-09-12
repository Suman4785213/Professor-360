import React from 'react';
import { ActivityStatus } from '../../types';

interface StatusBadgeProps {
  status: ActivityStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeConfig = (s: ActivityStatus) => {
    switch (s) {
      case 'DRAFT':
        return {
          label: 'Draft',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'PENDING_INCHARGE':
        return {
          label: 'Pending In-charge',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'INCHARGE_VERIFIED':
        return {
          label: 'In-charge Verified',
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
        };
      case 'PENDING_HOD':
        return {
          label: 'Pending HOD',
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500 animate-pulse',
        };
      case 'HOD_APPROVED':
        return {
          label: 'HOD Approved',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500',
        };
      case 'PENDING_IQAC':
        return {
          label: 'Pending IQAC',
          bg: 'bg-orange-50 text-orange-800 border-orange-300',
          dot: 'bg-orange-500 animate-pulse',
        };
      case 'IQAC_VERIFIED':
      case 'VERIFIED_EVIDENCE':
        return {
          label: 'Verified Evidence',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm',
          dot: 'bg-emerald-500',
        };
      case 'REJECTED_INCHARGE':
        return {
          label: 'Rejected by In-charge',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'REJECTED_HOD':
        return {
          label: 'Rejected by HOD',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'REJECTED_IQAC':
        return {
          label: 'Rejected by IQAC',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: s,
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const { label, bg, dot } = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
