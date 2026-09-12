import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { AcademicYear } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Calendar, Plus, CheckCircle2, RefreshCw, Star } from 'lucide-react';

export const AcademicYearList: React.FC = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('2026-27');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2027-06-30');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/academic-years/');
      setAcademicYears(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (ay: AcademicYear) => {
    setMessage(null);
    try {
      const res = await apiClient.patch(`/academic-years/${ay.id}/set-current/`);
      setMessage(res.data.message || `Set ${ay.name} as active year.`);
      fetchAcademicYears();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to switch active academic year.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient.post('/academic-years/', {
        name,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        is_current: false,
      });
      setIsModalOpen(false);
      fetchAcademicYears();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create academic year.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Academic Year Calendars</h2>
          <p className="text-xs text-slate-500">
            Multi-year tracking with strict single active context enforcement. Historical records remain fully accessible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchAcademicYears} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Academic Year
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Academic Years Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading academic calendars...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {academicYears.map((ay) => (
            <div
              key={ay.id}
              className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between space-y-4 shadow-xs ${
                ay.is_current ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-lg text-slate-900">{ay.name}</span>
                  {ay.is_current ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      <Star className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
                      Active Context
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Historical Year
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-1 pt-2">
                  <p>
                    <span className="font-semibold text-slate-700">Start Date:</span> {ay.start_date}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">End Date:</span> {ay.end_date}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                {!ay.is_current && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetActive(ay)}
                    className="text-xs font-bold text-brand-700 border-brand-200 hover:bg-brand-50"
                  >
                    Set as Active Year
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Academic Year">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Year Label *</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-27"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating}>
              Create Calendar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
