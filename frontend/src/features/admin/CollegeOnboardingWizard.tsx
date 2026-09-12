import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Plan } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Building,
  Building2,
  GraduationCap,
  Calendar,
  UserCheck,
  CreditCard,
  Layers,
  Palette,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  ShieldCheck,
  Info
} from 'lucide-react';

interface CollegeOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  initialCollegeId?: string;
}

export const CollegeOnboardingWizard: React.FC<CollegeOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onCompleted,
  initialCollegeId
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    name: '',
    short_name: '',
    code: '',
    institution_code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    accreditation_type: 'NAAC',
    naac_grade: 'A',
    established_year: 2010,

    // Step 2: Departments
    departments: [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Information Technology', code: 'IT' },
    ],

    // Step 3: Programs
    programs: [
      { name: 'Bachelor of Technology in CSE', code: 'BTECH-CSE', degree: 'B.Tech', duration: 4 },
    ],

    // Step 4: Academic Years
    academic_year_name: '2024-25',
    start_date: '2024-06-01',
    end_date: '2025-05-31',

    // Step 5: Initial Administrator
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_password: '',
    admin_role: 'IQAC',

    // Step 6: SaaS Plan
    selected_plan_code: 'professional',

    // Step 7: Framework
    framework: 'NAAC_RAF_2024',

    // Step 8: Branding & Config
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    report_header: '',
    report_footer: '',
    timezone: 'Asia/Kolkata',
    date_format: 'YYYY-MM-DD',
  });

  const [createdCollegeId, setCreatedCollegeId] = useState<string | null>(initialCollegeId || null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/plans/');
      setPlans(res.data.results || res.data || []);
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
  };

  const steps = [
    { number: 1, title: 'Identity', icon: Building, desc: 'Institutional profile' },
    { number: 2, title: 'Departments', icon: Building2, desc: 'Academic units' },
    { number: 3, title: 'Programs', icon: GraduationCap, desc: 'Degrees & courses' },
    { number: 4, title: 'Sessions', icon: Calendar, desc: 'Academic years' },
    { number: 5, title: 'Admin Account', icon: UserCheck, desc: 'Initial coordinator' },
    { number: 6, title: 'SaaS Plan', icon: CreditCard, desc: 'Tier & quotas' },
    { number: 7, title: 'Framework', icon: Layers, desc: 'Accreditation' },
    { number: 8, title: 'Branding', icon: Palette, desc: 'Reports & theme' },
    { number: 9, title: 'Activation', icon: CheckCircle2, desc: 'Verify & launch' },
  ];

  const handleNext = async () => {
    setError(null);

    // If moving from Step 1 to 2 and college not yet created, create college draft
    if (currentStep === 1) {
      if (!formData.name || !formData.code || !formData.email) {
        setError('College name, code, and official email are required.');
        return;
      }
    }

    if (currentStep === 5) {
      if (!formData.admin_email || !formData.admin_first_name || !formData.admin_password) {
        setError('Administrator name, email, and secure password are required.');
        return;
      }
    }

    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    } else {
      // Step 9: Finalize creation
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Submit full payload to /api/colleges/
      const payload = {
        name: formData.name,
        short_name: formData.short_name || formData.name,
        code: formData.code.toUpperCase(),
        institution_code: formData.institution_code,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        accreditation_type: formData.accreditation_type,
        naac_grade: formData.naac_grade,
        established_year: formData.established_year,
        admin_email: formData.admin_email,
        admin_first_name: formData.admin_first_name,
        admin_last_name: formData.admin_last_name || 'Admin',
        admin_password: formData.admin_password,
        admin_role: formData.admin_role,
        plan_code: formData.selected_plan_code,
        branding_config: {
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          report_header: formData.report_header || `${formData.name} — Internal Quality Assurance Cell`,
          report_footer: formData.report_footer || `${formData.name}, ${formData.city || ''}`,
        },
        timezone: formData.timezone,
        date_format: formData.date_format,
      };

      const res = await apiClient.post('/colleges/', payload);
      const newCollege = res.data;
      setCreatedCollegeId(newCollege.id);

      // Advance to complete setup
      await apiClient.post(`/colleges/${newCollege.id}/complete-setup/`);

      onCompleted();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.detail || e.response?.data?.error || JSON.stringify(e.response?.data) || 'Failed to onboard college.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-brand-400 bg-brand-500/20 px-2.5 py-0.5 rounded-full border border-brand-500/30 uppercase">
                Tenant Provisioning Wizard
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Step {currentStep} of 9
              </span>
            </div>
            <h2 className="text-xl font-black mt-1">Multi-College Institutional Onboarding</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = s.number === currentStep;
              const isDone = s.number < currentStep;

              return (
                <button
                  key={s.number}
                  onClick={() => setCurrentStep(s.number)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.number}. {s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium flex items-center gap-3">
              <Info className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 1: Institutional Identity & Accreditation</h3>
                <p className="text-xs text-slate-500">Provide legal name, code, contact details, and accreditation tier.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">College Legal Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Apex Institute of Technology"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Short Name / Alias</label>
                  <input
                    type="text"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    placeholder="e.g. Apex Institute"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Tenant Code (Unique ID) *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. AIT"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm uppercase font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">AISHE / Institution Code</label>
                  <input
                    type="text"
                    value={formData.institution_code}
                    onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                    placeholder="e.g. AISHE-C-19482"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Official Contact Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="iqac@institution.edu.in"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 20 2566 1234"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Website URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://institution.edu.in"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Accreditation Grade</label>
                  <select
                    value={formData.naac_grade}
                    onChange={(e) => setFormData({ ...formData, naac_grade: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  >
                    <option value="A++">NAAC A++</option>
                    <option value="A+">NAAC A+</option>
                    <option value="A">NAAC A</option>
                    <option value="B++">NAAC B++</option>
                    <option value="B+">NAAC B+</option>
                    <option value="B">NAAC B</option>
                    <option value="C">NAAC C</option>
                    <option value="APPLYING">Fresh Applicant</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DEPARTMENTS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 2: Initial Academic Departments</h3>
                <p className="text-xs text-slate-500">Configure core departments for evidence assignment and HOD triage.</p>
              </div>

              <div className="space-y-3">
                {formData.departments.map((dept, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Building2 className="w-5 h-5 text-brand-600 shrink-0" />
                    <input
                      type="text"
                      value={dept.name}
                      onChange={(e) => {
                        const updated = [...formData.departments];
                        updated[index].name = e.target.value;
                        setFormData({ ...formData, departments: updated });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                      placeholder="Department Name"
                    />
                    <input
                      type="text"
                      value={dept.code}
                      onChange={(e) => {
                        const updated = [...formData.departments];
                        updated[index].code = e.target.value.toUpperCase();
                        setFormData({ ...formData, departments: updated });
                      }}
                      className="w-24 px-3 py-1.5 text-sm font-mono uppercase border border-slate-200 rounded-lg bg-white"
                      placeholder="CODE"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          departments: formData.departments.filter((_, i) => i !== index),
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      departments: [...formData.departments, { name: 'Mechanical Engineering', code: 'MECH' }],
                    })
                  }
                >
                  + Add Another Department
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PROGRAMS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 3: Degree Programs</h3>
                <p className="text-xs text-slate-500">Add degree programs offered across departments.</p>
              </div>

              <div className="space-y-3">
                {formData.programs.map((prog, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
                    <input
                      type="text"
                      value={prog.name}
                      onChange={(e) => {
                        const updated = [...formData.programs];
                        updated[index].name = e.target.value;
                        setFormData({ ...formData, programs: updated });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                      placeholder="Program Name"
                    />
                    <input
                      type="text"
                      value={prog.degree}
                      onChange={(e) => {
                        const updated = [...formData.programs];
                        updated[index].degree = e.target.value;
                        setFormData({ ...formData, programs: updated });
                      }}
                      className="w-28 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                      placeholder="Degree"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          programs: formData.programs.filter((_, i) => i !== index),
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      programs: [
                        ...formData.programs,
                        { name: 'Master of Technology in AI', code: 'MTECH-AI', degree: 'M.Tech', duration: 2 },
                      ],
                    })
                  }
                >
                  + Add Degree Program
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: ACADEMIC YEARS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 4: Active Academic Cycle</h3>
                <p className="text-xs text-slate-500">Configure the primary academic session context for quality metrics.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Academic Year Label</label>
                  <input
                    type="text"
                    value={formData.academic_year_name}
                    onChange={(e) => setFormData({ ...formData, academic_year_name: e.target.value })}
                    placeholder="2024-25"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Session Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Session End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: INITIAL ADMINISTRATOR */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 5: Institutional Administrator Account</h3>
                <p className="text-xs text-slate-500">Provision initial IQAC Coordinator or College Management account.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">First Name *</label>
                  <input
                    type="text"
                    value={formData.admin_first_name}
                    onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                    placeholder="e.g. Ramesh"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.admin_last_name}
                    onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                    placeholder="e.g. Kulkarni"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Administrator Email *</label>
                  <input
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    placeholder="coordinator@institution.edu.in"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Initial Password *</label>
                  <input
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Role Assignment</label>
                  <select
                    value={formData.admin_role}
                    onChange={(e) => setFormData({ ...formData, admin_role: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="IQAC">IQAC Coordinator (Full Quality Management)</option>
                    <option value="COLLEGE_MANAGEMENT">College Management (Institutional Oversight)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: SAAS PLAN */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 6: SaaS Subscription Plan</h3>
                <p className="text-xs text-slate-500">Select institutional quota allocation and feature capabilities.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isSelected = formData.selected_plan_code === p.code;
                  return (
                    <div
                      key={p.code}
                      onClick={() => setFormData({ ...formData, selected_plan_code: p.code })}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-brand-600">{p.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                      </div>
                      <p className="text-2xl font-black text-slate-900 mt-2">${p.price_monthly}<span className="text-xs font-normal text-slate-500">/mo</span></p>
                      <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs space-y-1 text-slate-600">
                        <p>• {p.max_users} Total Users</p>
                        <p>• {p.max_departments} Departments</p>
                        <p>• {p.storage_limit_gb} GB Storage</p>
                        <p>• {p.ai_processing_limit} AI Jobs/mo</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 7: FRAMEWORK */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 7: Accreditation Framework Selection</h3>
                <p className="text-xs text-slate-500">Choose the standard accreditation template to attach to this college.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData({ ...formData, framework: 'NAAC_RAF_2024' })}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    formData.framework === 'NAAC_RAF_2024'
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black text-brand-700 uppercase">Standard Model</span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">NAAC Revised Accreditation Framework (2024)</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    7 Criteria, Key Indicators, Qualitative narratives, and Quantitative data templates.
                  </p>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, framework: 'NIRF_2025' })}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    formData.framework === 'NIRF_2025'
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black text-purple-700 uppercase">National Ranking</span>
                  <h4 className="text-base font-bold text-slate-900 mt-1">NIRF Institutional Ranking Model</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Teaching, Learning, Research & Professional Practice, Graduation Outcome metrics.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: BRANDING */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 8: Institutional Branding & Formatting</h3>
                <p className="text-xs text-slate-500">Configure report headers, footers, and brand palette.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Primary Brand Color</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-32 px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Report Header Title</label>
                  <input
                    type="text"
                    value={formData.report_header}
                    onChange={(e) => setFormData({ ...formData, report_header: e.target.value })}
                    placeholder={`e.g. ${formData.name || 'Institution'} — Internal Quality Assurance Cell`}
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Report Footer Address Line</label>
                  <input
                    type="text"
                    value={formData.report_footer}
                    onChange={(e) => setFormData({ ...formData, report_footer: e.target.value })}
                    placeholder="e.g. Innovation Campus, Bengaluru, Karnataka - 560100"
                    className="w-full mt-1.5 px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: ACTIVATION */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Step 9: Complete Setup & Tenant Activation</h3>
                <p className="text-xs text-slate-500">Review institutional parameters before provisioning the tenant environment.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-500">Institution:</span>
                  <span className="font-bold text-slate-900">{formData.name} ({formData.code})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-500">Initial Administrator:</span>
                  <span className="font-bold text-slate-900">{formData.admin_email} ({formData.admin_role})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-500">Plan Tier:</span>
                  <span className="font-bold text-brand-600 uppercase">{formData.selected_plan_code}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-500">Framework:</span>
                  <span className="font-bold text-slate-900">{formData.framework}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-500">Tenant Status upon Launch:</span>
                  <span className="font-black text-emerald-600">ACTIVE & READY</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  All institutional data will be isolated in strict multi-tenant boundaries. Cross-tenant access will be automatically blocked.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={currentStep === 1 || loading}
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold"
            >
              {loading ? (
                'Provisioning...'
              ) : currentStep === 9 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Provision & Launch College
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
