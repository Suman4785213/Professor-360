import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { VerificationRecord } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import {
  FileCheck,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface VerificationQueueProps {
  initialTab?: 'pending' | 'forwarded' | 'returned' | 'all';
  selectedRecord?: VerificationRecord | null;
  onClearSelected?: () => void;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = ({
  initialTab = 'pending',
  selectedRecord,
  onClearSelected,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'forwarded' | 'returned' | 'all'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const role = user?.role;
  const rolePrefix =
    role === 'HOD' ? '/hod' : role === 'DEPARTMENT_INCHARGE' ? '/incharge' : '/iqac';

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/verifications/');
      setRecords(res.data.results || res.data || []);
    } catch (e) {
      console.error('Failed to load verification queue:', e);
    } finally {
      setLoading(false);
    }
  };

  // Determine which records belong in which tab based on user's role
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const act = rec.activity_details;

      // 1. Tab filter
      if (activeTab === 'pending') {
        if (role === 'DEPARTMENT_INCHARGE' && rec.current_status !== 'PENDING_INCHARGE') return false;
        if (role === 'HOD' && rec.current_status !== 'PENDING_HOD') return false;
        if (role === 'IQAC' && rec.current_status !== 'PENDING_IQAC') return false;
      } else if (activeTab === 'forwarded') {
        if (role === 'DEPARTMENT_INCHARGE' && !rec.incharge_verified_at) return false;
        if (role === 'HOD' && !rec.hod_approved_at) return false;
        if (role === 'IQAC' && !rec.iqac_verified_at && rec.current_status !== 'VERIFIED_EVIDENCE') return false;
      } else if (activeTab === 'returned') {
        const isReturned =
          rec.current_status.includes('RETURNED') ||
          rec.current_status.includes('REJECTED');
        if (!isReturned) return false;
      }

      // 2. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = act?.title?.toLowerCase().includes(query);
        const matchesFaculty = act?.faculty_name?.toLowerCase().includes(query);
        const matchesDept = act?.department_name?.toLowerCase().includes(query);
        const matchesCert = act?.certificate_number?.toLowerCase().includes(query);
        const matchesCategory = (act?.category_name || act?.activity_type || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesFaculty && !matchesDept && !matchesCert && !matchesCategory) {
          return false;
        }
      }

      // 3. Category filter
      if (selectedCategory !== 'ALL') {
        const cat = act?.category_code || act?.activity_type;
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [records, activeTab, searchTerm, selectedCategory, role]);

  // Summary counts for tabs
  const tabCounts = useMemo(() => {
    let pending = 0;
    let forwarded = 0;
    let returned = 0;

    records.forEach((rec) => {
      if (
        (role === 'DEPARTMENT_INCHARGE' && rec.current_status === 'PENDING_INCHARGE') ||
        (role === 'HOD' && rec.current_status === 'PENDING_HOD') ||
        (role === 'IQAC' && rec.current_status === 'PENDING_IQAC')
      ) {
        pending++;
      }

      if (
        (role === 'DEPARTMENT_INCHARGE' && rec.incharge_verified_at) ||
        (role === 'HOD' && rec.hod_approved_at) ||
        (role === 'IQAC' && (rec.iqac_verified_at || rec.current_status === 'VERIFIED_EVIDENCE'))
      ) {
        forwarded++;
      }

      if (rec.current_status.includes('RETURNED') || rec.current_status.includes('REJECTED')) {
        returned++;
      }
    });

    return { pending, forwarded, returned, all: records.length };
  }, [records, role]);

  const handleOpenDetail = (record: VerificationRecord) => {
    navigate(`${rolePrefix}/verification/${record.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {role === 'DEPARTMENT_INCHARGE'
              ? 'Department In-charge Verification'
              : role === 'HOD'
              ? 'HOD Approval Queue'
              : 'IQAC Final Institutional Verification'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical audit trail: Faculty → In-charge (Level 1) → HOD (Level 2) → IQAC (Level 3) → Verified Evidence
          </p>
        </div>
        <Button onClick={fetchRecords} variant="secondary" size="sm" className="shrink-0">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Queue
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === 'pending'
              ? 'border-brand-600 text-brand-700 bg-brand-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending My Review</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              tabCounts.pending > 0
                ? 'bg-amber-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {tabCounts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('forwarded')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === 'forwarded'
              ? 'border-brand-600 text-brand-700 bg-brand-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved & Forwarded</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
            {tabCounts.forwarded}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('returned')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === 'returned'
              ? 'border-brand-600 text-brand-700 bg-brand-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Returned / Deficiencies</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
            {tabCounts.returned}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === 'all'
              ? 'border-brand-600 text-brand-700 bg-brand-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>All Visible Records</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
            {tabCounts.all}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by faculty name, title, certificate ID, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-2xl text-xs text-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          <option value="FDP">Faculty Development Program (FDP)</option>
          <option value="WORKSHOP">Workshop</option>
          <option value="SEMINAR">Seminar</option>
          <option value="CONFERENCE">Conference</option>
          <option value="CERTIFICATION">Certification</option>
          <option value="PUBLICATION">Publication</option>
          <option value="RESEARCH">Research</option>
          <option value="TRAINING">Training</option>
          <option value="AWARD">Award & Recognition</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Verification table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500" />
            <p className="text-xs font-semibold">Loading verification records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No records found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {activeTab === 'pending'
                ? 'Great job! There are no pending submissions awaiting your review in this queue.'
                : 'No records matching the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Faculty & Department</th>
                  <th className="px-6 py-3.5">Activity Dossier</th>
                  <th className="px-6 py-3.5">Current Status</th>
                  <th className="px-6 py-3.5">Verification Progress</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const act = rec.activity_details;
                  const canAct =
                    (role === 'DEPARTMENT_INCHARGE' && rec.current_status === 'PENDING_INCHARGE') ||
                    (role === 'HOD' && rec.current_status === 'PENDING_HOD') ||
                    (role === 'IQAC' && rec.current_status === 'PENDING_IQAC');

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{act?.faculty_name}</div>
                        <div className="text-xs text-slate-500">{act?.department_name}</div>
                        {act?.faculty_employee_id && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {act.faculty_employee_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{act?.title}</div>
                        <div className="text-xs text-slate-500">
                          {act?.category_name || act?.activity_type} • {act?.organizer || 'N/A'}
                        </div>
                        {act?.certificate_number && (
                          <div className="text-[10px] text-brand-700 font-mono mt-0.5">
                            Cert #: {act.certificate_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={rec.current_status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5">
                            {rec.incharge_verified_at ? (
                              <span className="text-emerald-700 font-medium">✓ In-charge Verified</span>
                            ) : rec.current_status === 'RETURNED_TO_FACULTY' ? (
                              <span className="text-rose-600 font-medium">✕ Returned to Faculty</span>
                            ) : (
                              <span className="text-amber-600 font-medium">Level 1: Pending</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {rec.hod_approved_at ? (
                              <span className="text-purple-700 font-medium">✓ HOD Approved</span>
                            ) : rec.current_status === 'RETURNED_TO_INCHARGE' ? (
                              <span className="text-rose-600 font-medium">✕ Returned to In-charge</span>
                            ) : rec.incharge_verified_at ? (
                              <span className="text-amber-600 font-medium">Level 2: Pending</span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {rec.iqac_verified_at || rec.current_status === 'VERIFIED_EVIDENCE' ? (
                              <span className="text-brand-700 font-bold">★ Final IQAC Sealed</span>
                            ) : rec.current_status === 'REJECTED_IQAC' ? (
                              <span className="text-rose-600 font-medium">✕ Rejected by IQAC</span>
                            ) : rec.hod_approved_at ? (
                              <span className="text-amber-600 font-medium">Level 3: Pending</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant={canAct ? 'primary' : 'outline'}
                          onClick={() => handleOpenDetail(rec)}
                          className={canAct ? 'bg-brand-600 hover:bg-brand-700 font-bold' : 'text-xs'}
                        >
                          {canAct ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Audit & Decide
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Dossier
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
