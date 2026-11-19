import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { PublicCollegeOption } from '../../types';
import { Professor360Logo } from '../../components/common/Professor360Logo';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  X,
} from 'lucide-react';

type InstitutionalRoleKey = 'IQAC' | 'HOD' | 'DEPARTMENT_INCHARGE' | 'FACULTY' | 'COLLEGE_MANAGEMENT';
type ViewMode = 'INSTITUTION_SELECTION' | 'SUPER_ADMIN_LOGIN' | 'COLLEGE_LOGIN';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuthStore();

  // Navigation / View state (Initial view is strictly INSTITUTION_SELECTION)
  const [viewMode, setViewMode] = useState<ViewMode>('INSTITUTION_SELECTION');
  const [selectedCollege, setSelectedCollege] = useState<PublicCollegeOption | null>(() => {
    try {
      const saved = localStorage.getItem('p360_selected_institution');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Selected institutional role within college login
  const [selectedRole, setSelectedRole] = useState<InstitutionalRoleKey>('IQAC');

  // Sign-In credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Institution Search State (Landing Page)
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
  const [institutionSuggestions, setInstitutionSuggestions] = useState<PublicCollegeOption[]>([]);
  const [isSearchingInstitutions, setIsSearchingInstitutions] = useState(false);
  const [hasSearchedInstitutions, setHasSearchedInstitutions] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Role metadata for Institutional roles (excludes Super Admin)
  const institutionalRoleConfig: Record<
    InstitutionalRoleKey,
    { label: string; shortLabel: string; badge: string; desc: string; demoEmail: string }
  > = {
    IQAC: {
      label: 'IQAC Coordinator',
      shortLabel: 'IQAC Coord.',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      desc: 'Quality assurance, criteria & compliance records',
      demoEmail: 'iqac@demo.edu',
    },
    HOD: {
      label: 'Head of Department (HOD)',
      shortLabel: 'HOD',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'Department-level approvals & oversight',
      demoEmail: 'hod.cse@demo.edu',
    },
    DEPARTMENT_INCHARGE: {
      label: 'Department In-charge',
      shortLabel: 'Dept. Incharge',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: '1st level certificate & data verification',
      demoEmail: 'incharge.cse@demo.edu',
    },
    FACULTY: {
      label: 'Faculty Member',
      shortLabel: 'Faculty',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'Academic profile, certifications & workload records',
      demoEmail: 'faculty.doe@demo.edu',
    },
    COLLEGE_MANAGEMENT: {
      label: 'College Management',
      shortLabel: 'Management',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: 'Institutional analytics & tenant management',
      demoEmail: 'management@demo.edu',
    },
  };

  // Switch institutional role
  const handleRoleChange = (role: InstitutionalRoleKey) => {
    setSelectedRole(role);
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  // Search institutions dynamically from backend database
  useEffect(() => {
    const query = institutionSearchQuery.trim();

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query) {
      setInstitutionSuggestions([]);
      setIsSearchingInstitutions(false);
      setHasSearchedInstitutions(false);
      return;
    }

    setIsSearchingInstitutions(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/colleges/public/', {
          params: { q: query },
        });
        const results = res.data?.results || [];
        setInstitutionSuggestions(results);
        setHasSearchedInstitutions(true);
      } catch (err) {
        console.error('Failed to search institutions:', err);
        setInstitutionSuggestions([]);
      } finally {
        setIsSearchingInstitutions(false);
      }
    }, 200);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [institutionSearchQuery]);

  // Handle selecting an institution
  const handleSelectInstitution = (college: PublicCollegeOption) => {
    setSelectedCollege(college);
    try {
      localStorage.setItem('p360_selected_institution', JSON.stringify(college));
    } catch (e) {
      console.warn('Could not save selected institution to localStorage:', e);
    }
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setViewMode('COLLEGE_LOGIN');
  };

  // Handle changing institution (go back to search)
  const handleChangeInstitution = () => {
    setSelectedCollege(null);
    try {
      localStorage.removeItem('p360_selected_institution');
    } catch (e) {
      console.warn('Could not clear selected institution from localStorage:', e);
    }
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
    setInstitutionSearchQuery('');
    setInstitutionSuggestions([]);
    setHasSearchedInstitutions(false);
    setViewMode('INSTITUTION_SELECTION');
  };

  // Handle College-Specific Login Submit
  const handleCollegeSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedCollege) {
      setError('Please select an institution before signing in.');
      setViewMode('INSTITUTION_SELECTION');
      return;
    }

    try {
      // Pass selected college id for tenant validation in backend
      await login(email, password, selectedCollege.id, false);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials and institution.');
    }
  };

  // Handle Super Admin Login Submit
  const handleSuperAdminSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      // Super admin signs in without collegeId and with isSuperAdmin=true
      await login(email, password, undefined, true);
    } catch (err: any) {
      setError(err.message || 'Super Admin authentication failed. Please verify your administrative credentials.');
    }
  };

  // Reusable Top Bar Component
  const renderTopBar = (showSuperAdminBtn = true, backAction?: () => void, backLabel?: string) => {
    return (
      <header className="w-full flex items-center justify-between py-6 px-6 sm:px-12 max-w-7xl mx-auto">
        <div>
          {backAction && (
            <button
              type="button"
              onClick={backAction}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>{backLabel || 'Back'}</span>
            </button>
          )}
        </div>

        {/* Top-Right Area: Small Super Admin Button & Professor360 Logo */}
        <div className="flex items-center gap-4">
          {showSuperAdminBtn && (
            <button
              id="super-admin-btn"
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMessage(null);
                setEmail('');
                setPassword('');
                setViewMode('SUPER_ADMIN_LOGIN');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:text-indigo-600 border border-slate-300 rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Super Admin Portal Sign-In"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Super Admin</span>
            </button>
          )}

          {/* Official Professor360 Metallic Emblem Logo positioned at the top right corner */}
          <Professor360Logo
            size="md"
            showText={true}
            subtitle="Accreditation Suite"
          />
        </div>
      </header>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* ==================================================================== */}
      {/* 1. INITIAL LANDING PAGE: INSTITUTION SELECTION SCREEN                */}
      {/* ==================================================================== */}
      {viewMode === 'INSTITUTION_SELECTION' && (
        <div className="min-h-screen flex flex-col justify-between">
          {renderTopBar(true)}

          {/* Centered Selection Panel */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-8 sm:p-12 w-full max-w-xl mx-auto text-center">
              {/* Heading */}
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-6">
                Select Your Institution
              </h1>

              {/* Institution Search Box */}
              <div className="relative text-left">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    id="institution-search-input"
                    type="text"
                    value={institutionSearchQuery}
                    onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                    placeholder="Type your institution name"
                    autoFocus
                    className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
                  />
                  {institutionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setInstitutionSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Short instruction below search box */}
                <p className="mt-3 text-xs sm:text-sm text-slate-500 text-center font-normal">
                  Please type your institution name to search. You can type the first 3 letters of your institution to see the list.
                </p>

                {/* Searching Loader */}
                {isSearchingInstitutions && (
                  <div className="mt-4 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Searching registered institutions...</span>
                  </div>
                )}

                {/* Suggestions Dropdown / Results List */}
                {!isSearchingInstitutions && institutionSuggestions.length > 0 && (
                  <div className="mt-4 max-h-64 overflow-y-auto space-y-2 text-left border border-slate-200 rounded-xl p-2 bg-slate-50/50 shadow-xs">
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Matching Registered Colleges ({institutionSuggestions.length})
                    </div>
                    {institutionSuggestions.map((col) => (
                      <div
                        key={col.id}
                        id={`institution-item-${col.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => handleSelectInstitution(col)}
                        className="p-3 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-lg cursor-pointer transition flex items-center justify-between group shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate transition">
                              {col.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {col.code}
                              </span>
                              {col.city && (
                                <span>
                                  • {col.city}
                                  {col.state ? `, ${col.state}` : ''}
                                </span>
                              )}
                              {col.accreditation_type && (
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[10px] font-medium border border-emerald-200">
                                  {col.accreditation_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State when typed query >= 3 and no match found */}
                {!isSearchingInstitutions &&
                  hasSearchedInstitutions &&
                  institutionSearchQuery.trim().length >= 3 &&
                  institutionSuggestions.length === 0 && (
                    <div className="mt-4 p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="font-semibold text-slate-700">
                        No active registered institution found matching "{institutionSearchQuery}".
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Please verify your spelling or contact your institutional coordinator.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="py-4 text-center text-xs text-slate-400">
            © 2026 Professor360 • Multi-Tenant Higher Education Accreditation Platform
          </footer>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. SUPER ADMIN LOGIN (PATH 1: SEPARATE FROM INSTITUTION AUTH)        */}
      {/* ==================================================================== */}
      {viewMode === 'SUPER_ADMIN_LOGIN' && (
        <div className="min-h-screen flex flex-col justify-between">
          {renderTopBar(false, () => setViewMode('INSTITUTION_SELECTION'), 'Back to Institution Selection')}

          <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10 w-full max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Platform Administration Only
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Login</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Platform administration, tenant provisioning & system governance
                </p>
              </div>

              {/* Alert messages */}
              {error && (
                <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Auto-fill demo credentials for Super Admin */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-5 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 font-medium">Demo Administrator:</span>
                <button
                  id="autofill-demo-superadmin"
                  type="button"
                  onClick={() => {
                    setEmail('admin@demo.edu');
                    setPassword('demo123');
                    setError(null);
                    setSuccessMessage('Demo Super Admin credentials loaded.');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Auto-fill credentials</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSuperAdminSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Super Admin Email / ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="super-admin-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@demo.edu"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="super-admin-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    id="super-admin-submit-btn"
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs"
                  >
                    Sign In as Super Admin
                  </Button>
                </div>
              <a href="/reset-password" className="block mt-3 text-center text-xs font-semibold text-indigo-600 hover:underline">Forgot password?</a>
              </form>
            </div>
          </main>

          <footer className="py-4 text-center text-xs text-slate-400">
            © 2026 Professor360 • System Governance
          </footer>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. COLLEGE-SPECIFIC LOGIN PAGE (PATH 2)                              */}
      {/* ==================================================================== */}
      {viewMode === 'COLLEGE_LOGIN' && (
        <div className="min-h-screen flex flex-col justify-between">
          {renderTopBar(false, handleChangeInstitution, 'Change Institution')}

          <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-2xl mx-auto">
              {/* Selected College Header Banner */}
              {selectedCollege && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                        {selectedCollege.name}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="font-mono font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded text-[10px]">
                          {selectedCollege.code}
                        </span>
                        {selectedCollege.city && (
                          <span>
                            • {selectedCollege.city}
                            {selectedCollege.state ? `, ${selectedCollege.state}` : ''}
                          </span>
                        )}
                        {selectedCollege.accreditation_type && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            {selectedCollege.accreditation_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangeInstitution}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Change Institution
                  </button>
                </div>
              )}

              {/* Alert messages */}
              {error && (
                <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Institutional Role Selection Tabs (Strictly 5 roles, NO Super Admin) */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Select Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(Object.keys(institutionalRoleConfig) as InstitutionalRoleKey[]).map((rKey) => {
                    const isSelected = selectedRole === rKey;
                    return (
                      <button
                        key={rKey}
                        id={`role-btn-${rKey.toLowerCase()}`}
                        type="button"
                        onClick={() => handleRoleChange(rKey)}
                        className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-xs leading-tight whitespace-nowrap">
                          {institutionalRoleConfig[rKey].shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Role Indicator & Demo Credential Auto-Fill */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Selected Portal:</span>
                  <span className="text-xs font-bold text-slate-900">
                    {institutionalRoleConfig[selectedRole].label}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${institutionalRoleConfig[selectedRole].badge}`}
                  >
                    {selectedRole}
                  </span>
                </div>
                <button
                  id={`autofill-demo-${selectedRole.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    setEmail(institutionalRoleConfig[selectedRole].demoEmail);
                    setPassword('demo123');
                    setError(null);
                    setSuccessMessage(
                      `Demo credentials loaded for ${institutionalRoleConfig[selectedRole].label}. Click "Sign In to Portal" below to enter.`
                    );
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium self-start sm:self-auto cursor-pointer underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Auto-fill demo credentials</span>
                </button>
              </div>

              {/* Role Login Form */}
              <form onSubmit={handleCollegeSignInSubmit} className="space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Login ID / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your registered institutional email"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    id="login-submit-btn"
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                  >
                    Sign In to Portal
                  </Button>
                </div>
              <a href="/reset-password" className="block mt-3 text-center text-xs font-semibold text-indigo-600 hover:underline">Forgot password?</a>
              </form>
            </div>
          </main>

          <footer className="py-4 text-center text-xs text-slate-400">
            © 2026 Professor360 • Institutional Authentication Portal
          </footer>
        </div>
      )}
    </div>
  );
};
