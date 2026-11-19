import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Professor360Logo } from '../common/Professor360Logo';
import {
  LayoutDashboard,
  FileCheck,
  Layers,
  Award,
  Users,
  Building,
  Calendar,
  Settings,
  Activity as ActivityIcon,
  ShieldCheck,
  BarChart3,
  FileText,
  Bell,
  UserCheck,
  User,
  Building2,
  FileSpreadsheet,
  BookOpen,
  Cpu,
  CheckSquare,
  ListTodo,
  Briefcase,
  X,
  UploadCloud,
  Globe,
  Sparkles,
  Megaphone,
  CreditCard,
  LifeBuoy,
  AlertOctagon,
  Send,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;

  const getNavItems = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          { path: '/admin/dashboard', label: 'College Management', icon: Building },
          { path: '/admin/system-health', label: 'Database & System Health', icon: ActivityIcon },
          { path: '/admin/jobs', label: 'Database & Jobs Monitor', icon: Cpu },
          { path: '/admin/activity-logs', label: 'Security & Audit Trail', icon: ShieldCheck },
        ];
      case 'COLLEGE_MANAGEMENT':
        return [
          { path: '/management/dashboard', label: 'Department Monitoring', icon: LayoutDashboard },
          { path: '/management/purchasing', label: 'Purchasing Details', icon: CreditCard },
        ];
      case 'IQAC':
        return [
          { path: '/iqac/dashboard', label: 'Department & IQAC Reports', icon: LayoutDashboard },
        ];
      case 'HOD':
        return [
          { path: '/hod/downloads', label: 'Downloaded Reports', icon: FileCheck },
          { path: '/hod/submission', label: 'Report Submission', icon: Send },
        ];
      case 'DEPARTMENT_INCHARGE':
        return [
          { path: '/incharge/merge', label: 'Merge Report', icon: Layers },
          { path: '/incharge/downloads', label: 'Downloaded Reports', icon: FileCheck },
        ];
      case 'FACULTY':
        return [
          { path: '/faculty/profile', label: 'Faculty Profile', icon: User },
        ];
      default:
        return [{ path: '/login', label: 'Login', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItems();

  const handleItemClick = (path: string) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <>
      {/* Brand header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div
          onClick={() => {
            if (role === 'DEPARTMENT_INCHARGE') navigate('/incharge/dashboard');
            else if (role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
            else if (role === 'COLLEGE_MANAGEMENT') navigate('/management/dashboard');
            else if (role === 'IQAC') navigate('/iqac/dashboard');
            else if (role === 'HOD') navigate('/hod/downloads');
            else if (role === 'FACULTY') navigate('/faculty/profile');
            if (onCloseMobile) onCloseMobile();
          }}
          className="flex items-center gap-3 cursor-pointer select-none"
          title="Dashboard"
        >
          <Professor360Logo
            size="md"
            showText={true}
            textColor="text-white"
            subtitleColor="text-brand-400"
            subtitle={
              role === 'SUPER_ADMIN'
                ? 'Product Administration'
                : role === 'COLLEGE_MANAGEMENT'
                ? 'College Monitoring (Admin1)'
                : role === 'DEPARTMENT_INCHARGE'
                ? 'Dept In-charge'
                : role === 'HOD'
                ? 'Head of Department'
                : 'Quality Assurance'
            }
          />
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer focus-ring"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation menu */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleItemClick(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer focus-ring touch-target ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Verification principle badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 m-3 rounded-2xl border">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Core Principle</p>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">
          Enter Once <span className="text-brand-400">→</span> Verify Once <span className="text-brand-400">→</span> Reuse Everywhere
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay & slide-out panel */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
          className="fixed inset-0 z-50 md:hidden bg-slate-950/70 backdrop-blur-xs flex animate-in fade-in duration-200"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[80vw] bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
