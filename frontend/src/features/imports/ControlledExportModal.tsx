import React, { useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { importsApi } from '../../api/imports';
import { useAuthStore } from '../../stores/authStore';

interface ControlledExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataType?: 'FACULTY' | 'ACTIVITIES' | 'EVIDENCE';
}

export const ControlledExportModal: React.FC<ControlledExportModalProps> = ({
  isOpen,
  onClose,
  defaultDataType = 'ACTIVITIES',
}) => {
  const { user } = useAuthStore();
  const [dataType, setDataType] = useState<string>(defaultDataType);
  const [format, setFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      const blob = await importsApi.exportData(dataType, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType.toLowerCase()}_export_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Export failed. You may lack authorization for this dataset.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Controlled Institutional Data Export" maxWidth="md">
      <div className="space-y-4 py-2 text-xs">
        <p className="text-slate-600">
          Exports are strictly scoped to your active institutional role permissions ({user?.role?.replace('_', ' ')}).
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">Dataset to Export</label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs"
          >
            <option value="ACTIVITIES">Faculty Activities & Submissions</option>
            <option value="EVIDENCE">Digital Evidence Records (Verified)</option>
            <option value="FACULTY">Faculty Roster & Profiles</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">File Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('XLSX')}
              className={`p-3 rounded-xl border text-center font-bold transition-all ${
                format === 'XLSX'
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => setFormat('CSV')}
              className={`p-3 rounded-xl border text-center font-bold transition-all ${
                format === 'CSV'
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              CSV (.csv)
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Audit Logging Enabled
          </div>
          <p className="text-[11px] text-slate-500">
            All export requests are logged with actor identity, timestamp, and query parameters.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Export
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
