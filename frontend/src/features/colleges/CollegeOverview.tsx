import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { College } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Building2, Award, Mail, Phone, MapPin, Globe, Calendar, CheckCircle2 } from 'lucide-react';

export const CollegeOverview: React.FC = () => {
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollege();
  }, []);

  const fetchCollege = async () => {
    try {
      const res = await apiClient.get('/colleges/current/');
      setCollege(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading institutional details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Institutional Profile & Accreditation</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registered institutional metadata, university affiliation, and NAAC status
          </p>
        </div>
        <Badge variant="success" size="md">
          Active Institution
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <Card className="lg:col-span-2" title="Institutional Identity">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black border border-brand-100 shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{college?.name || 'Demo Engineering College'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Code: {college?.code || 'DEMO-ENG'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="brand">Affiliated: {college?.university_affiliation || 'Autonomous / State University'}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{college?.contact_email || 'info@demo.edu'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{college?.contact_phone || '+91 98765 43210'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{college?.city || 'Bangalore'}, {college?.state || 'Karnataka'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{college?.website || 'https://www.demo.edu'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* NAAC Accreditation Card */}
        <Card title="NAAC Accreditation">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accredited Grade</p>
            <p className="text-3xl font-black text-amber-500 mt-1">NAAC {college?.naac_grade || 'A+'}</p>
            <p className="text-xs text-slate-500 mt-2">
              Valid cycle: 2022 - 2027
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Accreditation Active</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
