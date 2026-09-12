import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { FacultyProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { UserCircle, Mail, Phone, Building2, Calendar, Award, CheckCircle2, Shield } from 'lucide-react';

export const FacultyProfileView: React.FC = () => {
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form editable fields
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/auth/faculty/profile/');
      setProfile(res.data);
      setPhone(res.data.phone || '');
      setQualification(res.data.qualification || '');
      setBio(res.data.bio || '');
    } catch (e: any) {
      console.error(e);
      setError('Failed to load faculty profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiClient.patch('/auth/faculty/profile/', {
        phone,
        qualification,
        bio,
      });
      setProfile(res.data);
      setIsEditing(false);
      setMessage('Profile updated successfully.');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading faculty profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Faculty Academic Profile</h2>
          <p className="text-xs text-slate-500">
            Institutional faculty record utilized for accreditation, AQAR, and research reporting
          </p>
        </div>
        {!isEditing && (
          <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
            Edit Permitted Fields
          </Button>
        )}
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

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 text-brand-300 border-2 border-brand-400/40 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
            {profile?.user_name?.[0]}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black">{profile?.user_name}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {profile?.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {profile?.designation || 'Assistant Professor'} • Employee ID: {profile?.employee_id || 'Not assigned'}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              {profile?.department_name} • {profile?.college_name}
            </p>
          </div>
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Institutional Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.user_email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Contact Phone
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                  isEditing
                    ? 'bg-white border-brand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                Highest Academic Qualification
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. Ph.D. in Computer Science"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                  isEditing
                    ? 'bg-white border-brand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date of Joining (Institutional)
              </label>
              <input
                type="text"
                disabled
                value={profile?.joining_date || 'June 15, 2018'}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Research Interests & Academic Bio
            </label>
            <textarea
              rows={3}
              disabled={!isEditing}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Research domains, funded projects, patents, or teaching specializations..."
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                isEditing
                  ? 'bg-white border-brand-300 focus:ring-2 focus:ring-brand-500 focus:outline-none'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            />
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setPhone(profile?.phone || '');
                  setQualification(profile?.qualification || '');
                  setBio(profile?.bio || '');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                Save Changes
              </Button>
            </div>
          )}
        </form>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Department and employee ID changes require authorization from HOD or IQAC.</span>
        </div>
      </div>
    </div>
  );
};
