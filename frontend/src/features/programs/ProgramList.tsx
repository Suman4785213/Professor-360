import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Program, Department } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { GraduationCap, Plus, Search, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ProgramList: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [degree, setDegree] = useState('B.Tech');
  const [departmentId, setDepartmentId] = useState('');
  const [durationYears, setDurationYears] = useState('4');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progRes, deptRes] = await Promise.all([
        apiClient.get('/programs/'),
        apiClient.get('/departments/'),
      ]);
      setPrograms(progRes.data.results || progRes.data || []);
      const depts = deptRes.data.results || deptRes.data || [];
      setDepartments(depts);
      if (depts.length > 0) setDepartmentId(depts[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient.post('/programs/', {
        name,
        code: code.toUpperCase().trim(),
        degree,
        department: departmentId,
        duration_years: parseInt(durationYears),
        status: 'ACTIVE',
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create program.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = programs.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.degree.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Academic Programs & Courses</h2>
          <p className="text-xs text-slate-500">
            Degrees and academic curricula registered across institutional departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Program
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search programs by name, code, or degree (e.g. B.Tech, M.Tech)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Programs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading programs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No programs found</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Register your department degree courses to link with curriculum.</p>
            <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
              Add Program
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Program Name & Code</th>
                  <th className="px-6 py-3.5">Degree</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <span className="text-xs font-mono font-bold text-brand-600">{p.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {p.degree}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      {p.department_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {p.duration_years} Years Full-Time
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Academic Program">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Program Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. B.Tech Computer Science and Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Program Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BTECH-CSE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Degree Type</label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="B.Tech">B.Tech</option>
                <option value="B.E.">B.E.</option>
                <option value="M.Tech">M.Tech</option>
                <option value="M.E.">M.E.</option>
                <option value="MCA">MCA</option>
                <option value="MBA">MBA</option>
                <option value="Ph.D">Ph.D</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Department *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Years)</label>
              <input
                type="number"
                min="1"
                max="6"
                value={durationYears}
                onChange={(e) => setDurationYears(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating}>
              Create Program
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
