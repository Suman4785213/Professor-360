import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import {
  EvidenceRecord,
  EvidenceStats,
  AcademicYear,
  Department,
  Document as DocumentType,
  Criterion,
  Metric,
} from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { DocumentPreviewViewer } from '../../components/ui/DocumentPreviewViewer';
import {
  Award,
  Search,
  Download,
  FileText,
  CheckCircle2,
  RefreshCw,
  Filter,
  Calendar,
  Building2,
  Layers,
  Archive,
  RotateCcw,
  Eye,
  FileSpreadsheet,
  FileArchive,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AISearchBar } from '../ai/AISearchBar';

export const EvidenceRepository: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI State
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentType | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Archive Modal State
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Phase 5: Bulk Mapping State
  const [isBulkMapOpen, setIsBulkMapOpen] = useState(false);
  const [bulkCriteria, setBulkCriteria] = useState<Criterion[]>([]);
  const [bulkMetrics, setBulkMetrics] = useState<Metric[]>([]);
  const [selectedBulkCritId, setSelectedBulkCritId] = useState('');
  const [selectedBulkMetricId, setSelectedBulkMetricId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const canArchive = user?.role === 'IQAC' || user?.role === 'SUPER_ADMIN';

  // Base path for dossier links based on role
  const getDetailPath = (id: string) => {
    if (user?.role === 'FACULTY') return `/faculty/my-evidence/${id}`;
    if (user?.role === 'HOD') return `/hod/evidence/${id}`;
    if (user?.role === 'DEPARTMENT_INCHARGE') return `/incharge/evidence/${id}`;
    return `/iqac/evidence/${id}`;
  };

  const openBulkMapModal = async () => {
    setIsBulkMapOpen(true);
    setBulkNotes('');
    try {
      const res = await apiClient.get('/criteria/');
      const critList: Criterion[] = res.data.results || res.data || [];
      setBulkCriteria(critList);
      if (critList.length > 0) {
        setSelectedBulkCritId(critList[0].id);
        fetchBulkMetrics(critList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBulkMetrics = async (critId: string) => {
    try {
      const res = await apiClient.get(`/metrics/?criterion=${critId}`);
      const mList: Metric[] = res.data.results || res.data || [];
      setBulkMetrics(mList);
      if (mList.length > 0) setSelectedBulkMetricId(mList[0].id);
      else setSelectedBulkMetricId('');
    } catch (e) {
      console.error(e);
      setBulkMetrics([]);
    }
  };

  const handleBulkMapConfirm = async () => {
    if (!selectedBulkMetricId || selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await apiClient.post('/evidence-mappings/bulk/', {
        metric: selectedBulkMetricId,
        evidence_ids: selectedIds,
        notes: bulkNotes.trim() || undefined,
      });
      alert(`Bulk mapping complete! ${res.data.mapped_count} evidence records mapped (${res.data.skipped_duplicates} duplicate mappings skipped).`);
      setIsBulkMapOpen(false);
      setSelectedIds([]);
      fetchEvidence();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to bulk map evidence.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchEvidence();
    fetchStats();
  }, [selectedYear, selectedDept, selectedCategory, selectedStatus, dateFrom, dateTo]);

  const fetchMetadata = async () => {
    try {
      const [ayRes, deptRes] = await Promise.all([
        apiClient.get('/academic-years/'),
        apiClient.get('/departments/'),
      ]);
      setAcademicYears(ayRes.data.results || ayRes.data || []);
      setDepartments(deptRes.data.results || deptRes.data || []);
    } catch (e) {
      console.error('Error loading filter metadata:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/evidence/stats/');
      setStats(res.data);
    } catch (e) {
      console.error('Error loading repository stats:', e);
    }
  };

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedYear) params.academic_year = selectedYear;
      if (selectedDept) params.department = selectedDept;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await apiClient.get('/evidence/', { params });
      setEvidenceList(res.data.results || res.data || []);
      setSelectedIds([]);
    } catch (e) {
      console.error('Error loading evidence records:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvidence();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedYear('');
    setSelectedDept('');
    setSelectedCategory('');
    setSelectedStatus('ACTIVE');
    setDateFrom('');
    setDateTo('');
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === evidenceList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(evidenceList.map((e) => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export handlers
  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const params = new URLSearchParams();
    params.set('format', exportFormat);
    if (selectedYear) params.set('academic_year', selectedYear);
    if (selectedDept) params.set('department', selectedDept);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedStatus) params.set('status', selectedStatus);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchTerm.trim()) params.set('search', searchTerm.trim());

    const token = localStorage.getItem('access_token');
    const exportUrl = `${apiClient.defaults.baseURL || ''}/evidence/export/?${params.toString()}`;

    // Download using fetch with auth header
    apiClient
      .get(`/evidence/export/?${params.toString()}`, { responseType: 'blob' })
      .then((res) => {
        const ext = exportFormat === 'excel' ? 'xlsx' : 'csv';
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `IQAC_Evidence_Repository_${Date.now()}.${ext}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((err) => {
        console.error('Export error:', err);
        alert('Failed to export repository data.');
      });
  };

  // Bulk ZIP download
  const handleBulkZip = async () => {
    try {
      const res = await apiClient.post(
        '/evidence/bulk-zip/',
        { ids: selectedIds },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IQAC_Evidence_Certificates_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Bulk ZIP error:', err);
      alert('Failed to download bulk ZIP archive.');
    }
  };

  // Archive / Restore handlers
  const openArchiveModal = (id: string) => {
    setArchiveTargetId(id);
    setArchiveReason('');
  };

  const handleConfirmArchive = async () => {
    if (!archiveTargetId || !archiveReason.trim()) {
      alert('Please specify a rationale for archiving this record.');
      return;
    }
    setArchiveLoading(true);
    try {
      await apiClient.post(`/evidence/${archiveTargetId}/archive/`, { reason: archiveReason });
      setArchiveTargetId(null);
      setArchiveReason('');
      fetchEvidence();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to archive evidence record.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this evidence back to the active repository?')) return;
    try {
      await apiClient.post(`/evidence/${id}/restore/`);
      fetchEvidence();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to restore evidence record.');
    }
  };

  const openPreview = (doc: DocumentType) => {
    setPreviewDoc(doc);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900">
              Institutional Evidence Repository
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Library
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single Source of Truth for NAAC, AQAR, SSR, NIRF, and Institutional Compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => { fetchEvidence(); fetchStats(); }} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => handleExport('csv')} variant="secondary" size="sm">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Export CSV
          </Button>
          <Button onClick={() => handleExport('excel')} variant="secondary" size="sm">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Export Excel
          </Button>
          <Button
            onClick={() => {
              const rolePrefix = user?.role === 'HOD' ? '/hod' : user?.role === 'DEPARTMENT_INCHARGE' ? '/incharge' : user?.role === 'FACULTY' ? '/faculty' : '/iqac';
              const params = new URLSearchParams();
              if (selectedYear) params.set('academic_year', selectedYear);
              if (selectedDept) params.set('department', selectedDept);
              if (selectedCategory) params.set('category', selectedCategory);
              if (dateFrom) params.set('date_from', dateFrom);
              if (dateTo) params.set('date_to', dateTo);
              navigate(`${rolePrefix}/reports?${params.toString()}`);
            }}
            variant="primary"
            size="sm"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Verified
              </span>
              <span className="text-xl font-black text-slate-900 block">{stats.total_verified}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Ready for SSR & AQAR</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Year (2024-25)
              </span>
              <span className="text-xl font-black text-slate-900 block">
                {stats.current_year_verified}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">Active Cycle Records</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Departments
              </span>
              <span className="text-xl font-black text-slate-900 block">
                {stats.total_departments}
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">Contributing Depts</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Categories
              </span>
              <span className="text-xl font-black text-slate-900 block">
                {stats.total_categories}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold">FDPs, Pubs, Workshops</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Breakdown Chips */}
      {stats && (stats.department_breakdown.length > 0 || stats.category_breakdown.length > 0) && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          {/* Department Breakdown Chips */}
          {stats.department_breakdown.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Depts:
              </span>
              <button
                type="button"
                onClick={() => setSelectedDept('')}
                className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all ${
                  selectedDept === ''
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Departments
              </button>
              {stats.department_breakdown.map((d) => {
                const isSelected = selectedDept === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDept(isSelected ? '' : d.id)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{d.code || d.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-700 font-bold'
                      }`}
                    >
                      {d.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Category Breakdown Chips */}
          {stats.category_breakdown.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Types:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all ${
                  selectedCategory === ''
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Categories
              </button>
              {stats.category_breakdown.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.category.toLowerCase();
                return (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? '' : cat.category)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.category}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-700 font-bold'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Phase 7 AI Natural Language Search */}
      <AISearchBar
        onResultsFound={(results, parsedFilters) => {
          if (parsedFilters.category_code) {
            setSelectedCategory(parsedFilters.category_code);
          }
          if (parsedFilters.keyword) {
            setSearchTerm(parsedFilters.keyword);
          }
          fetchEvidence();
        }}
        onClearSearch={handleClearFilters}
      />

      {/* Smart Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Natural search: 'AI workshop Dr. Smith', certificate no, employee ID, organizer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
          {(searchTerm || selectedYear || selectedDept || selectedCategory || selectedStatus !== 'ACTIVE' || dateFrom || dateTo) && (
            <Button type="button" onClick={handleClearFilters} variant="secondary" size="sm">
              <X className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </form>

        {/* Extended dropdown filter row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Academic Year */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              disabled={user?.role === 'FACULTY' || user?.role === 'HOD' || user?.role === 'DEPARTMENT_INCHARGE'}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-60"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="FDP">FDP</option>
              <option value="Workshop">Workshop</option>
              <option value="Conference">Conference</option>
              <option value="Certification">Certification</option>
              <option value="Publication">Publication</option>
              <option value="Research">Research Project</option>
              <option value="Patent">Patent</option>
              <option value="Award">Award</option>
            </select>
          </div>

          {/* Status (Active / Archived / All) */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="ACTIVE">Active Evidence</option>
              <option value="ARCHIVED">Archived Only</option>
              <option value="ALL">All (Including Archived)</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Action Controls & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            {selectedIds.length > 0 && selectedIds.length === evidenceList.length ? (
              <CheckSquare className="w-4 h-4 text-brand-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select All'}
            </span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button onClick={handleBulkZip} variant="secondary" size="sm">
                <FileArchive className="w-3.5 h-3.5 mr-1 text-brand-600" /> Download ZIP ({selectedIds.length})
              </Button>
              {canArchive && (
                <Button onClick={openBulkMapModal} variant="primary" size="sm">
                  <Layers className="w-3.5 h-3.5 mr-1" /> Map to Metric ({selectedIds.length})
                </Button>
              )}
            </div>
          )}

          <span className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-700">{evidenceList.length}</strong> verified records
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Table or Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Searching Institutional Evidence Repository...
            </p>
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No matching evidence found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Try modifying your search terms, changing academic years, or resetting active filters.
            </p>
            <Button onClick={handleClearFilters} variant="secondary" size="sm">
              Clear All Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === evidenceList.length && evidenceList.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3.5">Evidence Title</th>
                  <th className="px-4 py-3.5">Faculty & Department</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Year</th>
                  <th className="px-4 py-3.5">Proofs</th>
                  <th className="px-4 py-3.5">Verified Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidenceList.map((ev) => {
                  const isSelected = selectedIds.includes(ev.id);
                  const isArchived = ev.status === 'ARCHIVED';
                  const primaryDoc = ev.document_details;
                  return (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/30' : isArchived ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ev.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <button
                          onClick={() => navigate(getDetailPath(ev.id))}
                          className="text-xs font-bold text-slate-900 hover:text-brand-600 text-left block truncate transition-colors"
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isArchived ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              ARCHIVED
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Sealed Evidence
                            </span>
                          )}
                          {ev.activity_details?.organizer && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {ev.activity_details.organizer}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-800">{ev.faculty_name}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span className="font-mono text-brand-700">{ev.faculty_employee_id || 'Faculty'}</span>
                          <span>•</span>
                          <span>{ev.department_code || ev.department_name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
                          {ev.category || 'General'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                        {ev.academic_year_name}
                      </td>

                      <td className="px-4 py-3.5">
                        {primaryDoc ? (
                          <button
                            type="button"
                            onClick={() => openPreview(primaryDoc)}
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-semibold bg-brand-50 px-2 py-1 rounded-lg border border-brand-200 transition-colors"
                            title="Click to preview certificate"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No File</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {ev.verified_at ? new Date(ev.verified_at).toLocaleDateString() : 'Verified'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => navigate(getDetailPath(ev.id))}
                            variant="secondary"
                            size="sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Dossier
                          </Button>

                          {canArchive && (
                            <>
                              {!isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => openArchiveModal(ev.id)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                                  title="Archive Evidence Record"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(ev.id)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                                  title="Restore to Active Repository"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Cards View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidenceList.map((ev) => {
              const isSelected = selectedIds.includes(ev.id);
              const isArchived = ev.status === 'ARCHIVED';
              const primaryDoc = ev.document_details;
              return (
                <div
                  key={ev.id}
                  className={`rounded-3xl border p-5 transition-all flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-brand-50/40 border-brand-400 ring-2 ring-brand-500/20 shadow-xs'
                      : isArchived
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-white border-slate-200/80 hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {ev.category || 'Evidence'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isArchived ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            ARCHIVED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" /> Sealed
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ev.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 ml-1"
                        />
                      </div>
                    </div>

                    <div>
                      <h4
                        onClick={() => navigate(getDetailPath(ev.id))}
                        className="text-sm font-black text-slate-900 hover:text-brand-600 cursor-pointer line-clamp-2 transition-colors"
                        title={ev.title}
                      >
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Faculty</span>
                        <span className="font-semibold text-slate-800 truncate">{ev.faculty_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Dept / Year</span>
                        <span className="text-slate-600 font-medium">
                          {ev.department_code} • {ev.academic_year_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {primaryDoc ? (
                      <button
                        type="button"
                        onClick={() => openPreview(primaryDoc)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview Doc
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">No Document</span>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => navigate(getDetailPath(ev.id))}
                        variant="secondary"
                        size="sm"
                      >
                        Dossier <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Document Preview Modal */}
      {isPreviewModalOpen && previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl max-w-4xl w-full space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-brand-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {previewDoc.original_filename || previewDoc.file_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewDoc(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[500px]">
              <DocumentPreviewViewer document={previewDoc} showMetadata={true} />
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {archiveTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-amber-600" /> Archive Institutional Evidence
              </h3>
              <button
                onClick={() => setArchiveTargetId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Archiving removes this record from default accreditation search views while strictly maintaining its audit trail and cryptographic document hashes.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Archive Rationale / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Superseded by updated conference proceeding; archived per IQAC review meeting #14..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" onClick={() => setArchiveTargetId(null)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmArchive}
                variant="danger"
                size="sm"
                disabled={archiveLoading || !archiveReason.trim()}
              >
                {archiveLoading ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Map Modal */}
      {isBulkMapOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" /> Bulk Map Verified Evidence
              </h3>
              <button
                onClick={() => setIsBulkMapOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-brand-50/70 border border-brand-200/80 text-xs text-brand-900">
              Selected <strong>{selectedIds.length}</strong> verified institutional evidence records for batch mapping.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Criterion</label>
                <select
                  value={selectedBulkCritId}
                  onChange={(e) => {
                    setSelectedBulkCritId(e.target.value);
                    fetchBulkMetrics(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {bulkCriteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      Criterion {c.number}: {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Metric</label>
                <select
                  value={selectedBulkMetricId}
                  onChange={(e) => setSelectedBulkMetricId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {bulkMetrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      Metric {m.number}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Batch Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="e.g. Batch mapping accredited cohort records for Criterion 2..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" onClick={() => setIsBulkMapOpen(false)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBulkMapConfirm}
                variant="primary"
                size="sm"
                disabled={bulkSubmitting || !selectedBulkMetricId}
              >
                {bulkSubmitting ? 'Mapping...' : `Confirm Mapping (${selectedIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
