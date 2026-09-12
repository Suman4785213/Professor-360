import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Sparkles,
  Shield,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Zap,
  HardDrive,
  Users,
  FileText,
  Layers,
  ArrowLeft,
  Info
} from 'lucide-react';
import { billingApi } from '../../api/billing';
import { Plan, BillingCycleType, TenantBillingInfo } from '../../types';

export const PlanComparison: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanCode, setCurrentPlanCode] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null);
  const [cycle, setCycle] = useState<BillingCycleType>('YEARLY');
  const [actionLoading, setActionLoading] = useState(false);

  // Safe Downgrade Warning Modal
  const [selectedPlanForDowngrade, setSelectedPlanForDowngrade] = useState<Plan | null>(null);
  const [downgradeWarnings, setDowngradeWarnings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [plansRes, subRes] = await Promise.all([
          billingApi.getPlans(),
          billingApi.getSubscription().catch(() => null),
        ]);
        setPlans(plansRes.plans);
        setCurrentPlanCode(plansRes.current_plan_code);
        if (subRes) {
          setBillingInfo(subRes);
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectPlan = async (targetPlan: Plan) => {
    if (targetPlan.code === currentPlanCode) {
      return;
    }

    // Check if potential safe downgrade with quota overages
    if (billingInfo?.usage) {
      const u = billingInfo.usage;
      const warnings = [];

      if (u.faculty.used > targetPlan.max_faculty) {
        warnings.push({
          resource: 'Faculty Members',
          used: u.faculty.used,
          limit: targetPlan.max_faculty,
          diff: u.faculty.used - targetPlan.max_faculty,
        });
      }
      if (u.storage.used_gb > targetPlan.storage_limit_gb) {
        warnings.push({
          resource: 'Cloud Storage',
          used: `${u.storage.used_gb} GB`,
          limit: `${targetPlan.storage_limit_gb} GB`,
          diff: `${(u.storage.used_gb - targetPlan.storage_limit_gb).toFixed(2)} GB`,
        });
      }
      if (u.departments.used > targetPlan.max_departments) {
        warnings.push({
          resource: 'Departments',
          used: u.departments.used,
          limit: targetPlan.max_departments,
          diff: u.departments.used - targetPlan.max_departments,
        });
      }

      if (warnings.length > 0) {
        setDowngradeWarnings(warnings);
        setSelectedPlanForDowngrade(targetPlan);
        return;
      }
    }

    executePlanChange(targetPlan);
  };

  const executePlanChange = async (targetPlan: Plan) => {
    setActionLoading(true);
    try {
      // If payment integration checkout is configured, initiate checkout session
      const checkoutRes = await billingApi.createCheckout({
        plan_id: targetPlan.id,
        billing_cycle: cycle,
      });

      // In mock/direct mode, also trigger plan update
      await billingApi.changePlan({ plan_id: targetPlan.id });

      alert(`Successfully updated subscription to ${targetPlan.name}!`);
      navigate('/billing');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update subscription plan.');
    } finally {
      setActionLoading(false);
      setSelectedPlanForDowngrade(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading Institutional Plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/billing')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Billing Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Institutional Plans & Commercial Tiers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Choose the right tier for your college. Pricing and quotas scale to your institution's size.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start">
          <button
            onClick={() => setCycle('MONTHLY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              cycle === 'MONTHLY'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setCycle('YEARLY')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              cycle === 'YEARLY'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly Billing
            <span className="bg-yellow-300 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isPro = plan.code === 'pro' || plan.code.includes('professional');
          const price = cycle === 'YEARLY' ? plan.price_yearly : plan.price_monthly;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between relative ${
                isCurrent
                  ? 'border-brand-600 ring-2 ring-brand-500/20 shadow-md'
                  : isPro
                  ? 'border-indigo-400 shadow-md'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                  Active Institutional Plan
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  {isPro && (
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Popular
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 min-h-[32px]">{plan.description || 'Comprehensive IQAC quality compliance and evidence management.'}</p>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {plan.currency} {price.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-xs font-medium">
                      / {cycle === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Excludes applicable GST</span>
                </div>

                {/* Resource Limits List */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Faculty Limit
                    </span>
                    <span className="font-semibold text-slate-900">{plan.max_faculty} faculty</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Cloud Storage
                    </span>
                    <span className="font-semibold text-slate-900">{plan.storage_limit_gb} GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Zap className="w-3.5 h-3.5 text-slate-400" /> AI Document Extraction
                    </span>
                    <span className="font-semibold text-slate-900">{plan.ai_processing_limit} jobs/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Report Generation
                    </span>
                    <span className="font-semibold text-slate-900">{plan.max_reports_monthly} reports/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Academic Departments
                    </span>
                    <span className="font-semibold text-slate-900">{plan.max_departments} depts</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <span className="font-semibold text-slate-900 block mb-1">Included Capabilities:</span>
                  {[
                    { key: 'AQAR_WORKSPACE', label: 'AQAR Compliance Workspace' },
                    { key: 'SSR_WORKSPACE', label: 'SSR Preparation Workspace' },
                    { key: 'ADVANCED_ANALYTICS', label: 'Executive Analytics & Intelligence' },
                    { key: 'AUTOMATION', label: 'Workflow & Task Automation' },
                    { key: 'BULK_EXPORT', label: 'Institutional Bulk Data Exporter' },
                  ].map((feat) => {
                    const hasFeat = plan.features ? Boolean(plan.features[feat.key]) : true;
                    return (
                      <div key={feat.key} className="flex items-center gap-2">
                        {hasFeat ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={hasFeat ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          {feat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-4 border-t border-slate-100">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs cursor-default"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    id={`btn-select-plan-${plan.code}`}
                    disabled={actionLoading}
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-2.5 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isPro
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    Select {plan.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Safe Downgrade Warning Modal */}
      {selectedPlanForDowngrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Current Usage Exceeds Plan Limits</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are switching to <strong>{selectedPlanForDowngrade.name}</strong>, which has lower limits than your current resource usage:
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-xs text-amber-900">
              {downgradeWarnings.map((w, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{w.resource}:</span>
                  <span className="font-semibold">
                    Current: {w.used} • Limit: {w.limit}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Data Preservation Guarantee:</p>
              <p>
                Under no circumstances will excess records be deleted. All existing data remains fully accessible, but adding new resources in exceeded categories will be paused until within quota.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPlanForDowngrade(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => executePlanChange(selectedPlanForDowngrade)}
                className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm"
              >
                {actionLoading ? 'Updating...' : 'Acknowledge & Switch Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
