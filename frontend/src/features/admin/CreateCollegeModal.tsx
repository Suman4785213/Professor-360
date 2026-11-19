import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  User,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CreateCollegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCollegeModal: React.FC<CreateCollegeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Mode: 'QUICK' or 'FULL_SAAS'
  const [onboardingMode, setOnboardingMode] = useState<'QUICK' | 'FULL_SAAS'>('FULL_SAAS');

  // Basic Information
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accreditationType, setAccreditationType] = useState('NAAC');
  const [naacGrade, setNaacGrade] = useState('A+');

  // Subscription & Commercial SaaS Details
  const [subscriptionPlan, setSubscriptionPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');

  // Administrator Account
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Welcome@2026');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planPricing = {
    starter: { name: 'Starter Tier', monthly: 49, yearly: 490, faculty: 50, depts: 5 },
    professional: { name: 'Professional Tier', monthly: 149, yearly: 1490, faculty: 200, depts: 15 },
    enterprise: { name: 'Enterprise Tier', monthly: 299, yearly: 2990, faculty: 1000, depts: 50 },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (onboardingMode === 'FULL_SAAS') {
        // Complete SaaS Onboarding with subscription & payment recording
        const payload = {
          name: name.trim(),
          code: code.toUpperCase().trim(),
          short_name: shortName.trim() || code.toUpperCase().trim(),
          city: city.trim(),
          state: state.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          accreditation_type: accreditationType,
          naac_grade: naacGrade.trim(),
          plan_code: subscriptionPlan,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          payment_reference: paymentReference.trim() || `SUPERADMIN-PROV-${Date.now()}`,
          admin_first_name: adminFirstName.trim() || 'College',
          admin_last_name: adminLastName.trim() || 'Dean',
          admin_email: adminEmail.trim() || `dean.${code.toLowerCase().trim()}@institution.edu`,
          admin_password: adminPassword,
          card_number: '4242424242424242',
          card_name: `${adminFirstName} ${adminLastName}`,
          card_expiry: '12/28',
          card_cvc: '123',
        };

        await apiClient.post('/colleges/register/', payload);
      } else {
        // Quick Provisioning
        const planCodeMap: Record<string, string> = {
          starter: 'FREE',
          professional: 'PRO',
          enterprise: 'ENTERPRISE',
        };

        await apiClient.post('/colleges/', {
          name: name.trim(),
          code: code.toUpperCase().trim(),
          city: city.trim(),
          state: state.trim(),
          admin_email: adminEmail.trim() || `admin.${code.toLowerCase().trim()}@institution.edu`,
          accreditation_type: accreditationType,
          naac_grade: naacGrade,
          subscription_plan: planCodeMap[subscriptionPlan] || 'PRO',
          plan_code: subscriptionPlan,
          is_active: true,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      let errorMsg = 'Failed to create college.';
      if (typeof data === 'string') {
        errorMsg = data;
      } else if (data?.error) {
        errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data?.detail) {
        errorMsg = data.detail;
      } else if (data && typeof data === 'object') {
        errorMsg = Object.entries(data)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Super Admin — Onboard New College Tenant" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode Selector */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setOnboardingMode('FULL_SAAS')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              onboardingMode === 'FULL_SAAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Full SaaS Onboarding (Subscription & Billing)</span>
          </button>
          <button
            type="button"
            onClick={() => setOnboardingMode('QUICK')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              onboardingMode === 'QUICK'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Quick Tenant Provisioning</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Institution Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Institutional Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                College / Institution Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sanjivani College of Engineering"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unique College Identifier (Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SITRC"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Short Name</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Sanjivani COE"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Nashik"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Accreditation</label>
              <select
                value={accreditationType}
                onChange={(e) => setAccreditationType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="NAAC">NAAC</option>
                <option value="NBA">NBA</option>
                <option value="NIRF">NIRF</option>
                <option value="OTHER">Other / Combined</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current NAAC Grade</label>
              <input
                type="text"
                value={naacGrade}
                onChange={(e) => setNaacGrade(e.target.value)}
                placeholder="e.g. A++ / A+"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Subscription & Payment Setup (Preserved within Super Admin) */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Subscription Plan & Commercial Billing
            </h4>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-2.5 py-1 rounded-md transition ${
                  billingCycle === 'MONTHLY' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-2.5 py-1 rounded-md transition ${
                  billingCycle === 'YEARLY' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['starter', 'professional', 'enterprise'] as const).map((tierKey) => {
              const tier = planPricing[tierKey];
              const isSelected = subscriptionPlan === tierKey;
              const price = billingCycle === 'YEARLY' ? tier.yearly : tier.monthly;
              return (
                <div
                  key={tierKey}
                  onClick={() => setSubscriptionPlan(tierKey)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-600'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{tier.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                    </div>
                    <div className="text-base font-black text-slate-900">
                      ₹ {price}
                      <span className="text-[10px] text-slate-400 font-normal">
                        /{billingCycle === 'YEARLY' ? 'yr' : 'mo'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Up to {tier.faculty} Faculty • {tier.depts} Depts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {onboardingMode === 'FULL_SAAS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Official Institutional Cheque</option>
                  <option value="UPI">UPI / Corporate QR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TXN-2026-98124"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: College Administrator Account */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            3. College Management Administrator Account
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                placeholder="Dean Rajesh"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                placeholder="Kulkarni"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Institutional Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder={`dean.${(code || 'college').toLowerCase()}@institution.edu`}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Temporary Admin Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Welcome@2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
            <span>Provision & Activate Tenant</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
