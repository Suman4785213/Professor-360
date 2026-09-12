import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { CheckCircle, Circle, ArrowRight, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export const OnboardingChecklist: React.FC<{ onOpenUpload?: () => void }> = ({ onOpenUpload }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;

  const storageKey = `iqac_onboarding_dismissed_${user?.id || 'anon'}`;
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    setIsDismissed(dismissed === 'true');
  }, [user?.id]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  const getChecklistSteps = () => {
    switch (role) {
      case 'FACULTY':
        return [
          { id: 'profile', title: 'Complete Faculty Profile & Designation', path: '/faculty/profile', done: true },
          { id: 'upload', title: 'Upload Your First Certificate with AI Scanning', action: onOpenUpload ? onOpenUpload : () => navigate('/faculty/activities/new'), done: false },
          { id: 'track', title: 'Track Verification Status & Review Timelines', path: '/faculty/submissions', done: false },
          { id: 'tasks', title: 'Review Institutional Tasks & Due Dates', path: '/tasks', done: false },
        ];
      case 'DEPARTMENT_INCHARGE':
        return [
          { id: 'queue', title: 'Audit Preliminary Department Submissions', path: '/department/work-queue', done: false },
          { id: 'verify', title: 'Verify Proof & Forward to HOD', path: '/incharge/verification', done: false },
          { id: 'tasks', title: 'Review Assigned Accreditation Tasks', path: '/tasks', done: false },
        ];
      case 'HOD':
        return [
          { id: 'queue', title: 'Review Department In-charge Endorsements', path: '/hod/work-queue', done: false },
          { id: 'approve', title: 'Sign off Submissions to IQAC Verification', path: '/hod/verification', done: false },
          { id: 'analytics', title: 'Review Department Progress Benchmarks', path: '/hod/analytics', done: false },
        ];
      case 'IQAC':
        return [
          { id: 'queue', title: 'Conduct Final Institutional Verification', path: '/iqac/verification', done: false },
          { id: 'aqar', title: 'Audit AQAR 7 Criteria Progress', path: '/iqac/aqar', done: false },
          { id: 'reports', title: 'Generate Consolidated NAAC Dossier', path: '/iqac/reports', done: false },
        ];
      case 'COLLEGE_MANAGEMENT':
        return [
          { id: 'overview', title: 'Explore Institutional Overview & Faculty Roster', path: '/management/college-overview', done: false },
          { id: 'compliance', title: 'Review Real-time NAAC/NBA Metrics', path: '/management/compliance', done: false },
          { id: 'analytics', title: 'Inspect Executive Analytics Dashboards', path: '/management/analytics', done: false },
        ];
      case 'SUPER_ADMIN':
        return [
          { id: 'colleges', title: 'Inspect Tenant Colleges & Subscriptions', path: '/admin/colleges', done: true },
          { id: 'control', title: 'Audit SaaS Platform Health & Feature Flags', path: '/admin/control-center', done: false },
          { id: 'users', title: 'Manage Global Institutional Roles', path: '/admin/users', done: false },
        ];
      default:
        return [];
    }
  };

  const steps = getChecklistSteps();
  if (isDismissed || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-4 sm:p-5 mb-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Quick-Start Checklist: {user?.role?.replace('_', ' ')}</span>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                {progressPercent}% Complete
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">Essential steps to get your workflow running smoothly</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            title={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-3 space-y-2">
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className="bg-brand-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                onClick={() => (step.action ? step.action() : step.path && navigate(step.path))}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-brand-300 bg-slate-50/60 hover:bg-brand-50/40 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {step.done ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                  )}
                  <span className={`text-xs truncate ${step.done ? 'line-through text-slate-400' : 'font-semibold text-slate-800'}`}>
                    {step.title}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
