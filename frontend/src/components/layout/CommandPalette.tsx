import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import {
  Search,
  FileCheck,
  Award,
  Layers,
  Users,
  FileText,
  CheckSquare,
  Building,
  Cpu,
  ArrowRight,
  Sparkles,
  Command,
  X,
  UploadCloud,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpload?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenUpload,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // Static role-based quick commands
  const getStaticCommands = () => {
    const role = user?.role;
    const base: { id: string; title: string; category: string; icon: any; action: () => void }[] = [
      {
        id: 'ask-copilot',
        title: 'Ask IQAC AI Copilot (Institutional Intelligence)',
        category: 'AI Assistant',
        icon: Sparkles,
        action: () => navigate('/ai/copilot'),
      },
    ];

    if (role === 'FACULTY') {
      base.push(
        {
          id: 'upload-cert',
          title: 'Upload Certificate & Extract Data (AI)',
          category: 'Quick Action',
          icon: Sparkles,
          action: () => (onOpenUpload ? onOpenUpload() : navigate('/faculty/activities/new')),
        },
        {
          id: 'my-activities',
          title: 'My Activities & Submissions',
          category: 'Navigation',
          icon: Layers,
          action: () => navigate('/faculty/activities'),
        },
        {
          id: 'my-evidence',
          title: 'My Evidence Repository',
          category: 'Navigation',
          icon: Award,
          action: () => navigate('/faculty/my-evidence'),
        },
        {
          id: 'my-tasks',
          title: 'My Tasks & Deadlines',
          category: 'Navigation',
          icon: CheckSquare,
          action: () => navigate('/tasks'),
        }
      );
    } else if (role === 'IQAC') {
      base.push(
        {
          id: 'iqac-verify',
          title: 'Verification Queue (Audit Pipeline)',
          category: 'Quick Action',
          icon: FileCheck,
          action: () => navigate('/iqac/verification'),
        },
        {
          id: 'iqac-aqar',
          title: 'AQAR Workspace & Criterion Fill',
          category: 'Navigation',
          icon: Layers,
          action: () => navigate('/iqac/aqar'),
        },
        {
          id: 'iqac-ssr',
          title: 'SSR Institutional Self-Study',
          category: 'Navigation',
          icon: Award,
          action: () => navigate('/iqac/ssr'),
        },
        {
          id: 'iqac-reports',
          title: 'Accreditation Report Generator',
          category: 'Navigation',
          icon: FileText,
          action: () => navigate('/iqac/reports'),
        }
      );
    } else if (role === 'HOD' || role === 'DEPARTMENT_INCHARGE') {
      const qPath = role === 'HOD' ? '/hod/work-queue' : '/department/work-queue';
      const vPath = role === 'HOD' ? '/hod/verification' : '/incharge/verification';
      base.push(
        {
          id: 'dept-queue',
          title: 'Department Review Queue',
          category: 'Quick Action',
          icon: FileCheck,
          action: () => navigate(qPath),
        },
        {
          id: 'dept-verify',
          title: 'Pending Department Verifications',
          category: 'Navigation',
          icon: Award,
          action: () => navigate(vPath),
        },
        {
          id: 'dept-tasks',
          title: 'Department Deliverables & Tasks',
          category: 'Navigation',
          icon: CheckSquare,
          action: () => navigate('/tasks'),
        }
      );
    } else if (role === 'COLLEGE_MANAGEMENT') {
      base.push(
        {
          id: 'mgmt-analytics',
          title: 'Executive Accreditation Analytics',
          category: 'Quick Action',
          icon: Cpu,
          action: () => navigate('/management/analytics'),
        },
        {
          id: 'mgmt-overview',
          title: 'Institutional Overview & Faculty Roster',
          category: 'Navigation',
          icon: Building,
          action: () => navigate('/management/college-overview'),
        },
        {
          id: 'mgmt-reports',
          title: 'Accreditation Dossiers & Exports',
          category: 'Navigation',
          icon: FileText,
          action: () => navigate('/management/reports'),
        }
      );
    } else if (role === 'SUPER_ADMIN') {
      base.push(
        {
          id: 'admin-saas',
          title: 'SaaS Control Center & Health',
          category: 'Quick Action',
          icon: Cpu,
          action: () => navigate('/admin/control-center'),
        },
        {
          id: 'admin-colleges',
          title: 'Tenants & College Subscriptions',
          category: 'Navigation',
          icon: Building,
          action: () => navigate('/admin/colleges'),
        },
        {
          id: 'admin-users',
          title: 'Global User Directory',
          category: 'Navigation',
          icon: Users,
          action: () => navigate('/admin/users'),
        }
      );
    }

    if (role && ['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC', 'HOD', 'DEPARTMENT_INCHARGE'].includes(role)) {
      base.push(
        {
          id: 'import-data',
          title: 'Import Spreadsheet Data (.xlsx / .csv)',
          category: 'Data Migration',
          icon: UploadCloud,
          action: () => navigate('/imports'),
        },
        {
          id: 'import-history',
          title: 'Import History & Error Reports',
          category: 'Data Migration',
          icon: FileSpreadsheet,
          action: () => navigate('/imports/history'),
        },
        {
          id: 'import-migration',
          title: 'Data Migration Wizard (College Onboarding)',
          category: 'Data Migration',
          icon: UploadCloud,
          action: () => navigate('/imports/migration'),
        },
        {
          id: 'settings-integrations',
          title: 'API Keys & Webhooks Management',
          category: 'Integrations',
          icon: Globe,
          action: () => navigate('/settings/integrations'),
        }
      );
    }

    return base;
  };

  // Perform debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await apiClient.get(`/activities/?search=${encodeURIComponent(query)}&page_size=6`);
        const items = resp.data?.results || resp.data || [];
        setSearchResults(
          items.map((it: any) => ({
            id: it.id,
            title: it.title,
            category: 'Activity / Evidence',
            subtitle: `${it.category_name || 'General'} • ${it.faculty_name || ''}`,
            icon: Award,
            action: () => {
              if (user?.role === 'FACULTY') {
                navigate(`/faculty/submissions/${it.id}`);
              } else if (user?.role === 'DEPARTMENT_INCHARGE') {
                navigate(`/incharge/verification/${it.id}`);
              } else if (user?.role === 'HOD') {
                navigate(`/hod/verification/${it.id}`);
              } else {
                navigate(`/iqac/verification/${it.id}`);
              }
            },
          }))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user?.role]);

  const displayedItems = query.trim()
    ? searchResults.length > 0
      ? searchResults
      : getStaticCommands().filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : getStaticCommands();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, displayedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayedItems.length) % Math.max(1, displayedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedItems[selectedIndex]) {
        displayedItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette and search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search activities, evidence, metrics..."
            className="w-full py-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 ml-2">
            ESC
          </span>
        </div>

        {/* Results / Commands list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {isSearching ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching records...</span>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands or activities found for "{query}".
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-50/80 text-brand-950' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.subtitle || item.category}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-opacity ${
                      isSelected ? 'text-brand-600 opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3 text-slate-400" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
