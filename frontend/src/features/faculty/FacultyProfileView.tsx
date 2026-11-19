import { SecureLink, SecureImage } from '../../api/privateMedia';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { apiClient } from '../../api/client';
import { FacultyProfile, Activity } from '../../types';
import {
  User,
  Award,
  BookOpen,
  FileCheck,
  Plus,
  FileText,
  Download,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Building2,
  Phone,
  Mail,
  Clock,
  Briefcase,
  GraduationCap,
  X,
  Check,
  BarChart3,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export const FacultyProfileView: React.FC = () => {
  // State for profile & activities
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Personal Details Modal state
  const [isPersonalDetailsOpen, setIsPersonalDetailsOpen] = useState(false);
  const [editingPersonalDetails, setEditingPersonalDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [personalDetailsMessage, setPersonalDetailsMessage] = useState<string | null>(null);
  const [personalDetailsError, setPersonalDetailsError] = useState<string | null>(null);

  // Personal Details Form fields
  const [formQualification, setFormQualification] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formExperienceYears, setFormExperienceYears] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Add Certification Modal state
  const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
  const [certCategory, setCertCategory] = useState<
    'FDP' | 'PUBLICATION' | 'CERTIFICATION' | 'WORKSHOP' | 'SEMINAR' | 'TRAINING' | 'AWARD' | 'OTHER'
  >('FDP');
  const [certTitle, setCertTitle] = useState('');
  const [certOrganizer, setCertOrganizer] = useState('');
  const [certDate, setCertDate] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certDescription, setCertDescription] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certUploadError, setCertUploadError] = useState<string | null>(null);
  const [certSuccessMessage, setCertSuccessMessage] = useState<string | null>(null);

  // Category Filter Tab
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const [profileRes, activitiesRes] = await Promise.all([
        apiClient.get('/auth/faculty/profile/').catch(() => ({ data: null })),
        apiClient.get('/activities/').catch(() => ({ data: { results: [] } })),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setFormQualification(profileRes.data.qualification || '');
        setFormPhone(profileRes.data.phone || '');
        setFormBio(profileRes.data.bio || '');
        setFormExperienceYears(
          profileRes.data.experience_years ? String(profileRes.data.experience_years) : ''
        );
      }

      const acts: Activity[] = activitiesRes.data?.results || activitiesRes.data || [];
      setActivities(acts);
    } catch (e) {
      console.error('Error fetching faculty data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Counts calculated strictly from actual stored data
  const totalFDPs = useMemo(() => {
    return activities.filter((a) => a.activity_type === 'FDP').length;
  }, [activities]);

  const verifiedFDPs = useMemo(() => {
    return activities.filter((a) => a.activity_type === 'FDP' && a.is_verified).length;
  }, [activities]);

  const totalCertifications = useMemo(() => {
    return activities.filter((a) =>
      ['CERTIFICATION', 'WORKSHOP', 'SEMINAR', 'CONFERENCE', 'TRAINING', 'AWARD', 'OTHER'].includes(
        a.activity_type || ''
      )
    ).length;
  }, [activities]);

  const verifiedCertifications = useMemo(() => {
    return activities.filter(
      (a) =>
        ['CERTIFICATION', 'WORKSHOP', 'SEMINAR', 'CONFERENCE', 'TRAINING', 'AWARD', 'OTHER'].includes(
          a.activity_type || ''
        ) && a.is_verified
    ).length;
  }, [activities]);

  const totalPublications = useMemo(() => {
    return activities.filter(
      (a) => a.activity_type === 'PUBLICATION' || a.activity_type === 'RESEARCH'
    ).length;
  }, [activities]);

  const verifiedPublications = useMemo(() => {
    return activities.filter(
      (a) =>
        (a.activity_type === 'PUBLICATION' || a.activity_type === 'RESEARCH') && a.is_verified
    ).length;
  }, [activities]);

  // Filtered activities list organized by category
  const filteredActivities = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return activities;
    if (selectedCategoryTab === 'FDP') return activities.filter((a) => a.activity_type === 'FDP');
    if (selectedCategoryTab === 'PUBLICATION')
      return activities.filter((a) => a.activity_type === 'PUBLICATION' || a.activity_type === 'RESEARCH');
    if (selectedCategoryTab === 'CERTIFICATION')
      return activities.filter((a) => a.activity_type === 'CERTIFICATION');
    if (selectedCategoryTab === 'WORKSHOP_SEMINAR')
      return activities.filter((a) => ['WORKSHOP', 'SEMINAR', 'CONFERENCE'].includes(a.activity_type || ''));
    if (selectedCategoryTab === 'OTHER')
      return activities.filter((a) => ['TRAINING', 'AWARD', 'OTHER'].includes(a.activity_type || ''));
    return activities;
  }, [activities, selectedCategoryTab]);

  // Dynamic Chart Data
  const statsChartData = useMemo(() => {
    return [
      { name: 'Total FDPs', count: totalFDPs, color: '#6366f1' },
      { name: 'Other Certifications', count: totalCertifications, color: '#8b5cf6' },
      { name: 'Publications', count: totalPublications, color: '#06b6d4' },
    ];
  }, [totalFDPs, totalCertifications, totalPublications]);

  const totalTracked = totalFDPs + totalCertifications + totalPublications;

  // Handle Save Personal Details & Resume Upload
  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setPersonalDetailsMessage(null);
    setPersonalDetailsError(null);

    try {
      const formData = new FormData();
      formData.append('qualification', formQualification);
      formData.append('phone', formPhone);
      formData.append('bio', formBio);
      if (formExperienceYears) {
        formData.append('experience_years', formExperienceYears);
      }
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const res = await apiClient.patch('/auth/faculty/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfile(res.data);
      setPersonalDetailsMessage('Personal details and professional resume updated successfully.');
      setEditingPersonalDetails(false);
      setResumeFile(null);
    } catch (err: any) {
      console.error(err);
      setPersonalDetailsError(
        err.response?.data?.detail || err.response?.data?.error || 'Failed to update personal details.'
      );
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle Upload Certification (+ button)
  const handleUploadCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim()) {
      setCertUploadError('Please enter a certificate title.');
      return;
    }

    setUploadingCert(true);
    setCertUploadError(null);
    setCertSuccessMessage(null);

    try {
      // 1. Create activity of selected category
      const activityRes = await apiClient.post('/activities/', {
        title: certTitle,
        activity_type: certCategory,
        organizer: certOrganizer,
        start_date: certDate || null,
        certificate_number: certNumber,
        description: certDescription,
      });

      const activityId = activityRes.data.id;

      // 2. Upload certificate document file if provided
      if (certFile) {
        const docFormData = new FormData();
        docFormData.append('activity', activityId);
        docFormData.append('file', certFile);
        docFormData.append('file_name', certFile.name);
        docFormData.append('file_size', certFile.size.toString());
        docFormData.append('mime_type', certFile.type || 'application/pdf');
        docFormData.append('document_type', 'CERTIFICATE');
        docFormData.append('is_primary', 'true');

        await apiClient.post('/documents/', docFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Refresh data to immediately update counts and stats
      await fetchFacultyData();

      setCertSuccessMessage(`Record '${certTitle}' (${certCategory}) uploaded and recorded successfully!`);
      setIsAddCertModalOpen(false);

      // Reset form
      setCertTitle('');
      setCertOrganizer('');
      setCertDate('');
      setCertNumber('');
      setCertDescription('');
      setCertFile(null);
    } catch (err: any) {
      console.error('Upload certification error:', err);
      setCertUploadError(
        err.response?.data?.detail || err.response?.data?.error || 'Failed to upload certification.'
      );
    } finally {
      setUploadingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-slate-600">Loading Faculty Academic Profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Alert banner if certification was just uploaded */}
      {certSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{certSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setCertSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP SECTION: PROFILE SECTION (LEFT) & OVERVIEW SECTION (RIGHT)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Profile Section */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="space-y-5">
            {/* Faculty Photo & Identity */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                {profile?.profile_photo ? (
                  <SecureImage
                    src={profile.profile_photo}
                    alt={profile.user_name || 'Faculty Profile'}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-indigo-100 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-800 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-indigo-100">
                    {profile?.user_name
                      ? profile.user_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                      : 'Prof'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Active Faculty Status" />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {profile?.department_name || 'Academic Faculty'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 truncate">
                  {profile?.user_name || 'Faculty Member'}
                </h2>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">
                  {profile?.designation || 'Faculty'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 line-clamp-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{profile?.qualification || 'Degree Not Specified'}</span>
                </p>
              </div>
            </div>

            {/* Quick Details Chips */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee ID</span>
                <span className="font-bold text-slate-800 text-xs truncate block">{profile?.employee_id || 'FAC-001'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Experience</span>
                <span className="font-bold text-slate-800 text-xs truncate block">{profile?.experience_duration || '7 years'}</span>
              </div>
            </div>
          </div>

          {/* Personal Details Action Button */}
          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              type="button"
              id="faculty-personal-details-btn"
              onClick={() => {
                setEditingPersonalDetails(false);
                setPersonalDetailsMessage(null);
                setPersonalDetailsError(null);
                setIsPersonalDetailsOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Personal Details</span>
            </button>
          </div>
        </div>

        {/* Right Side: Overview Section with Exactly Three Circular/Stat Cards */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                Faculty Activity Overview
              </span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Academic & Professional Metrics
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {totalTracked} Recorded Total
            </span>
          </div>

          {/* Exactly Three Circular Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total FDPs */}
            <div className="bg-gradient-to-b from-indigo-50/70 to-white rounded-3xl p-5 border border-indigo-100/90 text-center flex flex-col items-center justify-center relative shadow-xs hover:shadow-md transition-all group">
              <div className="relative w-20 h-20 rounded-full border-4 border-indigo-500/25 bg-white flex flex-col items-center justify-center mb-3 shadow-inner group-hover:border-indigo-500/40 transition">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {totalFDPs}
                </span>
                <Award className="w-3.5 h-3.5 text-indigo-600 mt-0.5" />
              </div>
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                TOTAL FDPS
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Development Programs</p>
              <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {verifiedFDPs} Verified
              </span>
            </div>

            {/* Card 2: Other Certifications */}
            <div className="bg-gradient-to-b from-purple-50/70 to-white rounded-3xl p-5 border border-purple-100/90 text-center flex flex-col items-center justify-center relative shadow-xs hover:shadow-md transition-all group">
              <div className="relative w-20 h-20 rounded-full border-4 border-purple-500/25 bg-white flex flex-col items-center justify-center mb-3 shadow-inner group-hover:border-purple-500/40 transition">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {totalCertifications}
                </span>
                <FileCheck className="w-3.5 h-3.5 text-purple-600 mt-0.5" />
              </div>
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                OTHER CERTIFICATIONS
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Courses & Badges</p>
              <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {verifiedCertifications} Verified
              </span>
            </div>

            {/* Card 3: Publications */}
            <div className="bg-gradient-to-b from-cyan-50/70 to-white rounded-3xl p-5 border border-cyan-100/90 text-center flex flex-col items-center justify-center relative shadow-xs hover:shadow-md transition-all group">
              <div className="relative w-20 h-20 rounded-full border-4 border-cyan-500/25 bg-white flex flex-col items-center justify-center mb-3 shadow-inner group-hover:border-cyan-500/40 transition">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {totalPublications}
                </span>
                <BookOpen className="w-3.5 h-3.5 text-cyan-600 mt-0.5" />
              </div>
              <h4 className="text-xs font-black text-cyan-950 uppercase tracking-wider">
                PUBLICATIONS
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Research & Papers</p>
              <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                {verifiedPublications} Verified
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              All metrics dynamically calculated from your uploaded and verified records
            </span>
            <span className="font-bold text-slate-700">{profile?.college_name || 'Academic Institution'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CERTIFICATION & ACTIVITY SECTION: CATEGORIES, TABS & UPLOAD BUTTON     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        {/* Heading & + Upload Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Certifications & Academic Records
              </h3>
              <button
                type="button"
                id="faculty-add-cert-btn"
                onClick={() => {
                  setCertUploadError(null);
                  setCertSuccessMessage(null);
                  setIsAddCertModalOpen(true);
                }}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 transition cursor-pointer"
                title="Upload Certification / Activity Document"
                aria-label="Upload Certification / Activity Document"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Organized records for your FDPs, Publications, Certifications, and Workshops with verified documentation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          {[
            { id: 'ALL', label: 'All Records', count: activities.length },
            { id: 'FDP', label: 'FDPs', count: totalFDPs },
            { id: 'PUBLICATION', label: 'Publications', count: totalPublications },
            { id: 'CERTIFICATION', label: 'Other Certifications', count: activities.filter(a => a.activity_type === 'CERTIFICATION').length },
            { id: 'WORKSHOP_SEMINAR', label: 'Workshops & Seminars', count: activities.filter(a => ['WORKSHOP', 'SEMINAR', 'CONFERENCE'].includes(a.activity_type || '')).length },
            { id: 'OTHER', label: 'Other Activities', count: activities.filter(a => ['TRAINING', 'AWARD', 'OTHER'].includes(a.activity_type || '')).length },
          ].map((tab) => {
            const isActive = selectedCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategoryTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtered Records List Cards */}
        {filteredActivities.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Records in this Category Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click the <strong className="text-indigo-600">+</strong> button above to upload a new record and document under this category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActivities.map((act) => {
              const primaryDoc = act.documents && act.documents[0];
              const isFDP = act.activity_type === 'FDP';
              const isPub = act.activity_type === 'PUBLICATION' || act.activity_type === 'RESEARCH';
              const isCert = act.activity_type === 'CERTIFICATION';

              const categoryBadge = isFDP ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                  FDP
                </span>
              ) : isPub ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-cyan-100 text-cyan-800 border border-cyan-200">
                  Publication
                </span>
              ) : isCert ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                  Certification
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                  {act.activity_type}
                </span>
              );

              return (
                <div
                  key={act.id}
                  className="bg-slate-50/70 hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {categoryBadge}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {act.start_date
                          ? new Date(act.start_date).toLocaleDateString([], {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recorded'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-2" title={act.title}>
                      {act.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      Issuer / Organizer: <strong>{act.organizer || 'Academic Institution'}</strong>
                    </p>

                    {act.certificate_number && (
                      <p className="text-[11px] text-slate-400 font-mono">
                        ID: {act.certificate_number}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    {primaryDoc ? (
                      <SecureLink
                        href={primaryDoc.file || primaryDoc.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </SecureLink>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No Document</span>
                    )}

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        act.is_verified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : act.status === 'PENDING_INCHARGE'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {act.is_verified ? 'Verified' : act.status ? act.status.replace(/_/g, ' ') : 'Draft'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. STATS SECTION: DIRECTLY ON PAGE (NO SEPARATE BUTTON)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Faculty Activity Statistics
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live graphical distribution dynamically reflecting your uploaded FDPs, Certifications, and Publications.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> FDPs
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ml-2" /> Certifications
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 ml-2" /> Publications
          </div>
        </div>

        {/* Dynamic Chart & Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Bar Chart Visualization */}
          <div className="lg:col-span-8 bg-slate-50/80 rounded-2xl p-4 sm:p-6 border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Category Distribution Breakdown
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsChartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={44}>
                    {statsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Progress Summary */}
          <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Academic Output Share
            </h4>

            <div className="space-y-3">
              {statsChartData.map((item) => {
                const percentage = totalTracked > 0 ? Math.round((item.count / totalTracked) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">{item.name}</span>
                      <span className="text-slate-900">
                        {item.count} <span className="text-slate-400 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              Updated automatically whenever new certification documents, FDPs, or research publications are uploaded.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: PERSONAL DETAILS & RESUME UPLOAD                                 */}
      {/* ========================================================================= */}
      {isPersonalDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Personal & Professional Details</h3>
                  <p className="text-xs text-slate-300">
                    {profile?.user_name || 'Faculty Member'} • {profile?.department_name || 'Department'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonalDetailsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {personalDetailsMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{personalDetailsMessage}</span>
                </div>
              )}

              {personalDetailsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{personalDetailsError}</span>
                </div>
              )}

              {/* View Mode vs Edit Mode */}
              {!editingPersonalDetails ? (
                <div className="space-y-5">
                  {/* Grid of details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.user_name || '—'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.designation || '—'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Degree / Qualification</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.qualification || '—'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.department_name || '—'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Professional Experience</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.experience_duration || '7 years'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Employee ID</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.employee_id || 'FAC-001'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Email</span>
                      <span className="font-bold text-slate-900 text-sm truncate block">{profile?.user_email || '—'}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.phone || 'Not specified'}</span>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile?.bio && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Academic & Research Bio</span>
                      <p className="text-slate-700 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Resume Section */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 block">Faculty Resume / Curriculum Vitae</span>
                    {profile?.resume || profile?.resume_url ? (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="font-bold text-slate-900 text-xs">Uploaded Professional Resume</p>
                            <p className="text-[10px] text-slate-400">PDF / Document Stored in System</p>
                          </div>
                        </div>
                        <SecureLink
                          href={profile.resume_url || (profile.resume as string)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View Resume</span>
                        </SecureLink>
                      </div>
                    ) : (
                      <p className="text-indigo-800 text-xs">
                        No resume uploaded yet. Click <strong>Edit Details & Upload Resume</strong> below to attach your document.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Edit Form Mode */
                <form onSubmit={handleSavePersonalDetails} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Degree / Qualification</label>
                    <input
                      type="text"
                      value={formQualification}
                      onChange={(e) => setFormQualification(e.target.value)}
                      placeholder="e.g. Ph.D. in Computer Science, M.Tech"
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="Contact phone"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formExperienceYears}
                        onChange={(e) => setFormExperienceYears(e.target.value)}
                        placeholder="Years of experience"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Professional Bio</label>
                    <textarea
                      rows={3}
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      placeholder="Brief summary of specialization and research areas..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                    />
                  </div>

                  {/* Resume Upload Option */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                    <label className="block font-bold text-indigo-950">Upload / Replace Resume</label>
                    <p className="text-[11px] text-indigo-800">
                      Select your updated CV or resume file (PDF or DOCX format).
                    </p>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                    {resumeFile && (
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingPersonalDetails(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDetails}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {savingDetails ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            {!editingPersonalDetails && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Institutional Faculty ID: {profile?.employee_id || 'FAC-001'}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPersonalDetailsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPersonalDetails(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition cursor-pointer"
                  >
                    Edit Details & Upload Resume
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: UPLOAD CERTIFICATION (TRIGGERED BY + BUTTON)                    */}
      {/* ========================================================================= */}
      {isAddCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in-50 zoom-in-95 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Upload Certification Document</h3>
                  <p className="text-xs text-slate-500">Record a new professional certificate or credential</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCertModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {certUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{certUploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadCertification} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Activity / Certification Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="faculty-activity-category-select"
                  value={certCategory}
                  onChange={(e) => setCertCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-semibold"
                >
                  <option value="FDP">Faculty Development Program (FDP)</option>
                  <option value="PUBLICATION">Research Publication / Journal Paper</option>
                  <option value="CERTIFICATION">Other Certification (Professional Credential)</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="SEMINAR">Seminar / Conference</option>
                  <option value="TRAINING">Industrial / Professional Training</option>
                  <option value="AWARD">Academic / Research Award</option>
                  <option value="OTHER">Other Academic Activity</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Categorizing correctly ensures accurate calculation for Total FDPs, Other Certifications, or Publications.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Title / Course / Paper Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect, IEEE Paper on Neural Networks"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issuing Body / Authority</label>
                  <input
                    type="text"
                    value={certOrganizer}
                    onChange={(e) => setCertOrganizer(e.target.value)}
                    placeholder="e.g. Amazon, Coursera, IEEE"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={certDate}
                    onChange={(e) => setCertDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Certificate / Credential ID</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="Optional Certificate ID or verification code"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* File Upload Input */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                <label className="block font-bold text-purple-950">
                  Select Certificate File (PDF / Image)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                />
                {certFile && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Selected: {certFile.name} ({(certFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCertModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingCert || !certTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {uploadingCert ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Certificate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyProfileView;
