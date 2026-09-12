import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { GraduationCap, ShieldCheck, CheckCircle2, ArrowRight, Lock, Mail } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, switchDemoRole, isLoading } = useAuthStore();
  const [email, setEmail] = useState('iqac@sitrc.edu');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    try {
      await switchDemoRole(demoEmail);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          
          {/* Left: Login Form */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Sign In to Your Account</h3>
              <p className="text-xs text-slate-400 mb-6">
                Access your role-specific dashboard and verification workflows.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
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
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full text-sm font-semibold"
                  >
                    Sign In to Portal
                  </Button>
                </div>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-tenant encrypted database with role-isolated verification.</span>
            </div>
          </div>

          {/* Right: Instant 1-Click Role Switcher */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-700/60 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Instant Role Access (Testing)
              </h4>
              <span className="text-[10px] bg-brand-500/20 text-brand-300 font-semibold px-2 py-0.5 rounded-full border border-brand-500/30">
                Click any role to log in
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Select any of the 6 institutional roles to immediately explore its dedicated dashboard and permissions:
            </p>

            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {demoRoles.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => handleQuickLogin(r.email)}
                  className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-brand-600/15 border border-slate-700/50 hover:border-brand-500/40 transition group flex items-center justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform" />
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
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{r.email}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
