import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../api/client';
import { PublicCollegeOption, FacultyRegisterPayload } from '../../types';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  BookOpen,
  User,
  Briefcase,
  BadgeCheck,
  UserPlus,
  LogIn,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, registerFaculty, switchDemoRole, isLoading } = useAuthStore();
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign In state - starts empty per requirement
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Faculty Self-Registration state
  const [colleges, setColleges] = useState<PublicCollegeOption[]>([]);
  const [isCollegesLoading, setIsCollegesLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState<FacultyRegisterPayload>({
    college: '',
    department: '',
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    designation: 'Assistant Professor',
    password: '',
    confirm_password: '',
  });

  // Fetch public colleges list for faculty registration
  useEffect(() => {
    let isMounted = true;
    const fetchColleges = async () => {
      setIsCollegesLoading(true);
      try {
        const res = await apiClient.get('/colleges/public/');
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        if (isMounted) {
          setColleges(list);
          if (list.length > 0 && !registerForm.college) {
            const first = list[0];
            setRegisterForm((prev) => ({
              ...prev,
              college: first.id,
              department: first.departments?.length > 0 ? first.departments[0].id : '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load public colleges directory:', err);
      } finally {
        if (isMounted) setIsCollegesLoading(false);
      }
    };

    fetchColleges();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCollege = colleges.find((c) => c.id === registerForm.college);
  const availableDepartments = selectedCollege?.departments || [];

  const handleCollegeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCollegeId = e.target.value;
    const col = colleges.find((c) => c.id === newCollegeId);
    const newDeptId = col?.departments && col.departments.length > 0 ? col.departments[0].id : '';
    setRegisterForm((prev) => ({
      ...prev,
      college: newCollegeId,
      department: newDeptId,
    }));
  };

  const handleRegisterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const demoRoles = [
    {
      title: 'Super Admin',
      desc: 'Multi-college & platform management',
      email: 'admin@iqac.local',
      role: 'SUPER_ADMIN',
      badge: 'bg-slate-800 text-white',
    },
    {
      title: 'College Management',
      desc: 'Institutional analytics & monitoring',
      email: 'management@demo.edu',
      role: 'COLLEGE_MANAGEMENT',
      badge: 'bg-amber-100 text-amber-900',
    },
    {
      title: 'IQAC Coordinator',
      desc: 'Final verification, criteria & quality records',
      email: 'iqac@demo.edu',
      role: 'IQAC',
      badge: 'bg-brand-100 text-brand-900',
    },
    {
      title: 'HOD (CSE)',
      desc: 'Department-level approvals & oversight',
      email: 'hod.cse@demo.edu',
      role: 'HOD',
      badge: 'bg-purple-100 text-purple-900',
    },
    {
      title: 'Dept In-charge (CSE)',
      desc: '1st level certificate & data verification',
      email: 'incharge.cse@demo.edu',
      role: 'DEPARTMENT_INCHARGE',
      badge: 'bg-blue-100 text-blue-900',
    },
    {
      title: 'Faculty (Prof. Smith)',
      desc: 'Data entry, profile & certificate upload',
      email: 'faculty.smith@demo.edu',
      role: 'FACULTY',
      badge: 'bg-emerald-100 text-emerald-900',
    },
  ];

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Client validation
    if (!registerForm.college) {
      setError('Please select your college from the directory.');
      return;
    }
    if (!registerForm.department) {
      setError('Please select your department.');
      return;
    }
    if (!registerForm.first_name.trim() || !registerForm.last_name.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (!registerForm.email.trim()) {
      setError('Institutional email address is required.');
      return;
    }
    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (registerForm.password !== registerForm.confirm_password) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setSuccessMessage('Creating your faculty account and logging in...');
      await registerFaculty(registerForm);
    } catch (err: any) {
      setSuccessMessage(null);
      setError(err.message);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await switchDemoRole(demoEmail);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          IQAC Management System
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Enter Data Once <span className="text-brand-400 font-bold">→</span> Verify Once <span className="text-brand-400 font-bold">→</span> Reuse Everywhere
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {/* Left: Sign In or Faculty Self-Registration Form */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-900/90 border border-slate-700/70 rounded-2xl mb-6">
                <button
                  type="button"
                  id="tab-signin-btn"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                    authMode === 'signin'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-register-btn"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                    authMode === 'register'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Faculty Self-Registration
                </button>
              </div>

              {/* Status alerts */}
              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* VIEW 1: Sign In Form */}
              {authMode === 'signin' ? (
                <div>
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-white mb-1">Sign In to Your Account</h3>
                    <p className="text-xs text-slate-400">
                      Access your role-specific dashboard and institutional workflows.
                    </p>
                  </div>

                  <form onSubmit={handleSignInSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Institutional Email
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
                          placeholder="name@college.edu"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
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
                        className="w-full text-sm font-semibold shadow-lg shadow-brand-600/20"
                      >
                        Sign In to Portal
                      </Button>
                    </div>

                    <div className="pt-3 text-center">
                      <button
                        type="button"
                        id="switch-to-register-link"
                        onClick={() => {
                          setAuthMode('register');
                          setError(null);
                        }}
                        className="text-xs text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1.5 transition group"
                      >
                        <span>New Faculty Member? Create your account by selecting your College</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* VIEW 2: Faculty Self-Registration Form */
                <div>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">Faculty Self-Registration</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Faculty Role
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Select your college and department to automatically create your faculty workspace.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {/* College Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Select Your College <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 className="w-4 h-4 text-brand-400" />
                        </div>
                        <select
                          id="faculty-register-college-select"
                          name="college"
                          value={registerForm.college}
                          onChange={handleCollegeChange}
                          required
                          disabled={isCollegesLoading}
                          className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition appearance-none cursor-pointer"
                        >
                          {isCollegesLoading && <option value="">Loading college directory...</option>}
                          {!isCollegesLoading && colleges.length === 0 && (
                            <option value="">No active colleges available</option>
                          )}
                          {colleges.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                              {c.name} {c.city ? `(${c.city}${c.state ? `, ${c.state}` : ''})` : `[${c.code}]`}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Department Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Department <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <BookOpen className="w-4 h-4 text-brand-400" />
                        </div>
                        <select
                          id="faculty-register-department-select"
                          name="department"
                          value={registerForm.department}
                          onChange={handleRegisterChange}
                          required
                          disabled={availableDepartments.length === 0}
                          className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition appearance-none cursor-pointer"
                        >
                          {availableDepartments.length === 0 && (
                            <option value="">No departments available for this college</option>
                          )}
                          {availableDepartments.map((d) => (
                            <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          First Name <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                          <input
                            id="faculty-register-firstname-input"
                            type="text"
                            name="first_name"
                            value={registerForm.first_name}
                            onChange={handleRegisterChange}
                            required
                            placeholder="e.g. Priya"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Last Name <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                          <input
                            id="faculty-register-lastname-input"
                            type="text"
                            name="last_name"
                            value={registerForm.last_name}
                            onChange={handleRegisterChange}
                            required
                            placeholder="e.g. Sharma"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email & Designation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Institutional Email <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            id="faculty-register-email-input"
                            type="email"
                            name="email"
                            value={registerForm.email}
                            onChange={handleRegisterChange}
                            required
                            placeholder="priya.s@college.edu"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Designation
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <select
                            id="faculty-register-designation-select"
                            name="designation"
                            value={registerForm.designation}
                            onChange={handleRegisterChange}
                            className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition appearance-none cursor-pointer"
                          >
                            <option value="Assistant Professor" className="bg-slate-900 text-white">Assistant Professor</option>
                            <option value="Associate Professor" className="bg-slate-900 text-white">Associate Professor</option>
                            <option value="Professor" className="bg-slate-900 text-white">Professor</option>
                            <option value="Senior Lecturer" className="bg-slate-900 text-white">Senior Lecturer</option>
                            <option value="Lecturer" className="bg-slate-900 text-white">Lecturer</option>
                            <option value="Adjunct Faculty" className="bg-slate-900 text-white">Adjunct Faculty</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            ▼
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee ID (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Employee ID <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <BadgeCheck className="w-4 h-4" />
                        </div>
                        <input
                          id="faculty-register-empid-input"
                          type="text"
                          name="employee_id"
                          value={registerForm.employee_id}
                          onChange={handleRegisterChange}
                          placeholder="e.g. EMP-2026"
                          className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Password <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="faculty-register-password-input"
                            type="password"
                            name="password"
                            value={registerForm.password}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Min 8 characters"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Confirm Password <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="faculty-register-confirmpass-input"
                            type="password"
                            name="confirm_password"
                            value={registerForm.confirm_password}
                            onChange={handleRegisterChange}
                            required
                            placeholder="Re-enter password"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        id="faculty-register-submit-btn"
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        className="w-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Create Faculty Account & Log In
                      </Button>
                    </div>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        id="switch-to-signin-link"
                        onClick={() => {
                          setAuthMode('signin');
                          setError(null);
                        }}
                        className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition"
                      >
                        <span>Already registered? Sign In to Portal →</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-tenant encrypted database. Faculty accounts strictly isolate to selected college and department.</span>
            </div>
          </div>

          {/* Right: Instant 1-Click Role Switcher */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Instant Role Access (Testing)
                </h4>
                <span className="text-[10px] bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">
                  6 Core Roles
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Select any of the 6 institutional roles to immediately explore its dedicated dashboard and permissions:
              </p>

              <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
                {demoRoles.map((r) => (
                  <button
                    key={r.email}
                    type="button"
                    onClick={() => handleQuickLogin(r.email)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-brand-600/15 border border-slate-700/50 hover:border-brand-500/40 transition group flex items-center justify-between"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-brand-300">
                            {r.title}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${r.badge}`}>
                            {r.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{r.desc}</p>
                        <span className="text-[9px] text-slate-500 font-mono">{r.email}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>IQAC Multi-Tenant Platform</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Live Cloud Mode
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
