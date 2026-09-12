import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Department } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Building, Plus, CheckCircle2, XCircle, Search, RefreshCw, Users } from 'lucide-react';

export const DepartmentList: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/departments/');
      setDepartments(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    const action = dept.is_active ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/departments/${dept.id}/${action}/`);
      fetchDepartments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient.post('/departments/', {
        name,
        code: code.toUpperCase().trim(),
        description,
        is_active: true,
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create department.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Academic Departments</h2>
          <p className="text-xs text-slate-500">
            Configure institutional departments, assign leadership, and track status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDepartments} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Department
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search departments by name or code (e.g. CSE, IT, MECH)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading departments...</div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No departments found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Create your first department to begin adding faculty.</p>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            Add Department
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between space-y-4 hover:border-brand-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                    {d.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      d.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{d.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{d.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">Head of Dept (HOD):</span>
                  <span className="font-semibold text-slate-800">
                    {d.hod_details ? `${d.hod_details.first_name} ${d.hod_details.last_name}` : 'Not assigned'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-400">IQAC In-charge:</span>
                  <span className="font-semibold text-slate-800">
                    {d.incharge_details ? `${d.incharge_details.first_name} ${d.incharge_details.last_name}` : 'Not assigned'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant={d.is_active ? 'outline' : 'secondary'}
                  onClick={() => handleToggleStatus(d)}
                  className="text-xs font-semibold"
                >
                  {d.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Academic Department">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Civil Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. CIVIL"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief description of department scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
