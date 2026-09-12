import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  User,
  Filter,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { importsApi } from '../../api/imports';
import { ImportJob, ImportDataType, ImportJobStatus } from '../../types';

export const ImportHistory: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail modal
  const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await importsApi.getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadErrors = async (jobId: string) => {
    try {
      const blob = await importsApi.downloadErrorReport(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_errors_${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Could not download error report.');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (typeFilter !== 'ALL' && job.data_type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    return true;
  });

  const totalMigrated = jobs.reduce((sum, j) => sum + (j.imported_count || 0), 0);
  const totalErrors = jobs.reduce((sum, j) => sum + (j.error_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/imports')} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-brand-600" />
              Import History & Audit Trail
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete historical record of institutional spreadsheet migrations and execution outcomes.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadJobs} className="flex items-center gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Import Jobs</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{jobs.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Records Migrated</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalMigrated}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Total Validation Errors</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{totalErrors}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">Successful Batches</span>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {jobs.filter((j) => j.status === 'COMPLETED').length}
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Data:
          </span>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Data Types</option>
            <option value="FACULTY">Faculty Profiles</option>
            <option value="ACTIVITIES">Activities</option>
            <option value="EVIDENCE_METADATA">Evidence Metadata</option>
            <option value="DEPARTMENTS">Departments</option>
            <option value="PROGRAMS">Programs</option>
            <option value="ACADEMIC_YEARS">Academic Years</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="COMPLETED_WITH_ERRORS">Completed with Errors</option>
            <option value="READY">Ready</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </span>
      </div>

      {/* Audit Table */}
      <Card title="Historical Audit Records">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading historical records...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-16 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No matching import records</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your filter selections.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date / User</th>
                  <th className="py-3 px-4">Spreadsheet File</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Imported / Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{new Date(job.created_at).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {job.user_name || 'Administrator'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate" title={job.original_filename}>
                      {job.original_filename}
                      <span className="ml-1 text-[10px] font-mono text-slate-400">({job.file_format})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{job.data_type_display || job.data_type}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {job.mode === 'INSERT_AND_UPDATE' ? (
                        <span className="text-sky-700 font-medium">Insert & Update</span>
                      ) : (
                        <span className="text-slate-600">Insert Only</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{job.imported_count}</span>
                      <span className="text-slate-400"> / {job.total_rows}</span>
                      {job.error_count > 0 && (
                        <span className="text-rose-500 text-[11px] ml-1.5 font-medium">({job.error_count} errs)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {job.status === 'COMPLETED' && (
                        <Badge variant="success" className="text-[10px]">
                          ✓ Completed
                        </Badge>
                      )}
                      {job.status === 'COMPLETED_WITH_ERRORS' && (
                        <Badge variant="warning" className="text-[10px]">
                          ⚠️ Partial Errors
                        </Badge>
                      )}
                      {job.status === 'READY' && (
                        <Badge variant="info" className="text-[10px]">
                          Validated
                        </Badge>
                      )}
                      {job.status === 'FAILED' && (
                        <Badge variant="danger" className="text-[10px]">
                          ✕ Failed
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                          className="text-[11px] py-1 px-2 border-slate-300"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {job.error_count > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadErrors(job.id)}
                            className="text-[11px] py-1 px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Errors
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* JOB DIAGNOSTIC DETAIL MODAL */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={`Import Job Diagnostics: ${selectedJob.original_filename}`}
          maxWidth="xl"
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[11px]">Job ID:</span>
                <p className="font-mono text-slate-800 text-[11px]">{selectedJob.id}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Data Type:</span>
                <p className="font-semibold text-slate-800">{selectedJob.data_type}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Import Mode:</span>
                <p className="font-semibold text-slate-800">{selectedJob.mode}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Completed At:</span>
                <p className="text-slate-800">
                  {selectedJob.completed_at ? new Date(selectedJob.completed_at).toLocaleString() : 'Incomplete'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Column Mapping Applied</h4>
              <div className="border border-slate-200 rounded-lg p-2.5 max-h-40 overflow-y-auto space-y-1">
                {Object.entries(selectedJob.column_mapping || {}).map(([src, tgt]) => (
                  <div key={src} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">{src}</span>
                    <span className="font-semibold text-brand-600 font-mono text-[11px]">{tgt || '— (skipped)'}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedJob.error_count > 0 && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadErrors(selectedJob.id)}
                  className="text-xs text-rose-600 border-rose-200"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download Full Error Report (.csv)
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
