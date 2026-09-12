import React from 'react';
import { Check, Clock, AlertTriangle, XCircle, FileText, UserCheck, ShieldCheck, Award } from 'lucide-react';

export interface VerificationTimelineProps {
  status: string;
  isVerified?: boolean;
  rejectionReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  inchargeRemarks?: string;
  hodRemarks?: string;
  iqacRemarks?: string;
}

export const VerificationTimeline: React.FC<VerificationTimelineProps> = ({
  status,
  isVerified = false,
  rejectionReason,
  submittedAt,
  verifiedAt,
  inchargeRemarks,
  hodRemarks,
  iqacRemarks,
}) => {
  // Normalize step statuses
  const isDraft = status === 'DRAFT';
  const isReturnedFaculty = status === 'RETURNED_TO_FACULTY';
  const isReturnedIncharge = status === 'RETURNED_TO_INCHARGE';
  const isRejected = status === 'REJECTED_IQAC';

  const steps = [
    {
      id: 1,
      name: 'Faculty Submission',
      roleDesc: 'Document drafted and submitted',
      icon: FileText,
      isDone: !isDraft,
      isCurrent: isDraft || isReturnedFaculty,
      isWarning: isReturnedFaculty,
      remark: isReturnedFaculty ? rejectionReason || 'Returned to faculty for corrections.' : null,
      date: submittedAt ? new Date(submittedAt).toLocaleDateString() : 'Draft stage',
    },
    {
      id: 2,
      name: 'In-charge Verification',
      roleDesc: 'Department preliminary audit',
      icon: UserCheck,
      isDone: ['PENDING_HOD', 'RETURNED_TO_INCHARGE', 'PENDING_IQAC', 'VERIFIED_EVIDENCE'].includes(status) || isVerified,
      isCurrent: status === 'PENDING_INCHARGE',
      isWarning: isReturnedIncharge,
      remark: inchargeRemarks || (isReturnedIncharge ? rejectionReason : null),
      date: ['PENDING_HOD', 'PENDING_IQAC', 'VERIFIED_EVIDENCE'].includes(status) ? 'Verified' : 'Pending',
    },
    {
      id: 3,
      name: 'HOD Endorsement',
      roleDesc: 'Department head approval',
      icon: ShieldCheck,
      isDone: ['PENDING_IQAC', 'VERIFIED_EVIDENCE'].includes(status) || isVerified,
      isCurrent: status === 'PENDING_HOD',
      isWarning: false,
      remark: hodRemarks,
      date: ['PENDING_IQAC', 'VERIFIED_EVIDENCE'].includes(status) ? 'Approved' : 'Pending',
    },
    {
      id: 4,
      name: 'IQAC Final Accreditation',
      roleDesc: 'Institutional accreditation lock',
      icon: Award,
      isDone: status === 'VERIFIED_EVIDENCE' || isVerified,
      isCurrent: status === 'PENDING_IQAC',
      isWarning: isRejected,
      remark: isRejected ? rejectionReason || 'Rejected by IQAC coordinator.' : iqacRemarks,
      date: isVerified && verifiedAt ? new Date(verifiedAt).toLocaleDateString() : 'Pending',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Verification Progress Timeline</h3>
          <p className="text-xs text-slate-500">Multi-stage institutional accreditation pathway</p>
        </div>
        <div>
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>Verified Evidence</span>
            </span>
          ) : isReturnedFaculty || isReturnedIncharge ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Action Required: Returned</span>
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 border border-brand-200">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>In Audit Pipeline</span>
            </span>
          )}
        </div>
      </div>

      {/* Responsive layout: vertical timeline */}
      <ol className="relative border-l-2 border-slate-200 ml-4 sm:ml-6 space-y-6 sm:space-y-8">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <li key={step.id} className="ml-6 sm:ml-8 relative">
              {/* Node indicator */}
              <span
                className={`absolute -left-[35px] sm:-left-[43px] flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-4 ring-white shadow-xs transition-colors ${
                  step.isDone
                    ? 'bg-emerald-600 text-white'
                    : step.isWarning
                    ? 'bg-amber-500 text-white animate-bounce'
                    : step.isCurrent
                    ? 'bg-brand-600 text-white ring-brand-200'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step.isDone ? (
                  <Check className="w-4 h-4" />
                ) : step.isWarning ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5" />
                )}
              </span>

              {/* Step info */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{step.name}</span>
                  {step.isCurrent && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                      Active Stage
                    </span>
                  )}
                </h4>
                <span className="text-[11px] font-medium text-slate-400">{step.date}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.roleDesc}</p>

              {/* Remarks box if any */}
              {step.remark && (
                <div
                  className={`mt-2.5 p-3 rounded-xl text-xs ${
                    step.isWarning
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <strong className="block text-[10px] uppercase font-black tracking-wider mb-0.5">
                    {step.isWarning ? 'Return Reason & Deficiency:' : 'Reviewer Note:'}
                  </strong>
                  <span>{step.remark}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
