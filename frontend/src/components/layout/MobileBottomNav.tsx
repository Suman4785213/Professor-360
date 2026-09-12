import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard,
  PlusCircle,
  Award,
  CheckSquare,
  Bell,
  ShieldCheck,
  FileSpreadsheet,
  BarChart3,
  Building,
  ListTodo,
  Cpu,
  Layers,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenUpload?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenUpload }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;

  const getNavItems = () => {
    switch (role) {
      case 'FACULTY':
        return [
          { path: '/faculty/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/faculty/my-evidence', label: 'Evidence', icon: Award },
          {
            path: '#upload',
            label: 'Upload',
            icon: PlusCircle,
            isAction: true,
            onClick: onOpenUpload ? onOpenUpload : () => navigate('/faculty/activities/new'),
          },
          { path: '/tasks', label: 'Tasks', icon: CheckSquare },
          { path: '/notifications', label: 'Alerts', icon: Bell },
        ];
      case 'IQAC':
        return [
          { path: '/iqac/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/iqac/verification', label: 'Verify', icon: ShieldCheck },
          { path: '/iqac/evidence', label: 'Evidence', icon: Award },
          { path: '/iqac/aqar', label: 'AQAR', icon: FileSpreadsheet },
          { path: '/iqac/work-queue', label: 'Queue', icon: ListTodo },
        ];
      case 'HOD':
        return [
          { path: '/hod/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/hod/work-queue', label: 'Queue', icon: ListTodo },
          { path: '/hod/verification', label: 'Verify', icon: ShieldCheck },
          { path: '/tasks', label: 'Tasks', icon: CheckSquare },
          { path: '/notifications', label: 'Alerts', icon: Bell },
        ];
      case 'DEPARTMENT_INCHARGE':
        return [
          { path: '/incharge/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/department/work-queue', label: 'Queue', icon: ListTodo },
          { path: '/incharge/verification', label: 'Verify', icon: ShieldCheck },
          { path: '/tasks', label: 'Tasks', icon: CheckSquare },
          { path: '/notifications', label: 'Alerts', icon: Bell },
        ];
      case 'COLLEGE_MANAGEMENT':
        return [
          { path: '/management/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/management/college-overview', label: 'Overview', icon: Building },
          { path: '/management/criteria/dashboard', label: 'Criteria', icon: Layers },
          { path: '/management/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/notifications', label: 'Alerts', icon: Bell },
        ];
      case 'SUPER_ADMIN':
        return [
          { path: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
          { path: '/admin/control-center', label: 'SaaS Center', icon: Cpu },
          { path: '/admin/colleges', label: 'Tenants', icon: Building },
          { path: '/tasks', label: 'Tasks', icon: CheckSquare },
          { path: '/notifications', label: 'Alerts', icon: Bell },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  if (!navItems.length) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg flex items-center justify-around"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        if (item.isAction) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex flex-col items-center justify-center -mt-5 group cursor-pointer focus-ring rounded-full"
            >
              <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/40 group-active:scale-95 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-brand-700 mt-0.5">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer focus-ring touch-target ${
              isActive ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
