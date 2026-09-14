import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  Building2,
  Users,
  Award,
  BookOpen,
  FileText,
  Layers,
  Download,
  Search,
  Eye,
  ArrowLeft,
  CheckCircle2,
  BarChart3,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  GraduationCap,
  Briefcase,
  Cpu,
  Phone,
  Mail,
  ChevronRight,
  Info,
  Clock,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';

// Exactly 11 mandated departments
const MANDATED_DEPARTMENTS = [
  { code: 'IT', name: 'Information Technology', icon: '💻' },
  { code: 'CSE', name: 'Computer Science and Engineering', icon: '🖥️' },
  { code: 'AIDS', name: 'Artificial Intelligence and Data Science', icon: '🤖' },
  { code: 'AIML', name: 'Artificial Intelligence and Machine Learning', icon: '🧠' },
  { code: 'ECE', name: 'Electronics and Communication Engineering', icon: '📡' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', icon: '⚡' },
  { code: 'CIVIL', name: 'Civil Engineering', icon: '🏗️' },
  { code: 'MBA', name: 'Master of Business Administration', icon: '📊' },
  { code: 'MECH', name: 'Mechanical Engineering', icon: '⚙️' },
  { code: 'ME', name: 'Mechatronics Engineering', icon: '🦾' },
  { code: 'CYBERSECURITY', name: 'Cyber Security', icon: '🛡️' },
];

interface IQACDashboardProps {
  setActiveTab?: (tab: string) => void;
  onOpenReview?: (record: any) => void;
}

export const IQACDashboard: React.FC<IQACDashboardProps> = () => {
  const { user } = useAuthStore();

  // Navigation levels:
  // 1. Department List (selectedDept === null)
  // 2. Department Overview (selectedDept !== null, activeDeptAction === 'overview')
  // 3. Faculty Profile List (activeDeptAction === 'faculty_profile', selectedFacultyId === null)
  // 4. Individual Faculty Profile (activeDeptAction === 'faculty_profile', selectedFacultyId !== null)
  // 5. Department Stats (activeDeptAction === 'department_stats')
  // 6. Department Report Download (activeDeptAction === 'report_download')
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [activeDeptAction, setActiveDeptAction] = useState<
    'overview' | 'faculty_profile' | 'department_stats' | 'report_download'
  >('overview');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  // Data states
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deptOverview, setDeptOverview] = useState<any | null>(null);
  const [deptOverviewLoading, setDeptOverviewLoading] = useState<boolean>(false);
  const [facultyProfile, setFacultyProfile] = useState<any | null>(null);
  const [facultyLoading, setFacultyLoading] = useState<boolean>(false);
  const [facultySearch, setFacultySearch] = useState<string>('');
  const [showPersonalDetails, setShowPersonalDetails] = useState<boolean>(false);
  const [activeFacultyCategory, setActiveFacultyCategory] = useState<string>('fdps');

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [user?.college]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/departments/');
      const apiDepts = res.data?.results || res.data || [];

      // Merge mandated 11 with API data
      const merged = MANDATED_DEPARTMENTS.map((m) => {
        const found = apiDepts.find(
          (d: any) =>
            d.code?.toUpperCase() === m.code ||
            d.name?.toLowerCase().includes(m.name.toLowerCase())
        );
        return {
          id: found ? found.id : m.code,
          code: m.code,
          name: found ? found.name : m.name,
          icon: m.icon,
          description: found?.description || `Department of ${m.name}`,
          is_active: found ? found.is_active : true,
        };
      });
      setDepartmentsList(merged);
    } catch (e) {
      console.error(e);
      setDepartmentsList(
        MANDATED_DEPARTMENTS.map((m) => ({
          id: m.code,
          code: m.code,
          name: m.name,
          icon: m.icon,
          description: `Department of ${m.name}`,
          is_active: true,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  // Load Department Overview when selected
  const handleSelectDepartment = async (dept: any) => {
    setSelectedDept(dept);
    setActiveDeptAction('overview');
    setSelectedFacultyId(null);
    setDeptOverviewLoading(true);
    try {
      const res = await apiClient.get(`/departments/${dept.id}/overview/`);
      setDeptOverview(res.data);
    } catch (e) {
      console.error(e);
      setDeptOverview(null);
    } finally {
      setDeptOverviewLoading(false);
    }
  };

  // Load Individual Faculty Profile
  const handleSelectFaculty = async (facultyId: string) => {
    setSelectedFacultyId(facultyId);
    setFacultyLoading(true);
    setShowPersonalDetails(false);
    setActiveFacultyCategory('fdps');
    try {
      const res = await apiClient.get(`/auth/users/${facultyId}/iqac-profile/`);
      setFacultyProfile(res.data);
    } catch (e) {
      console.error(e);
      setFacultyProfile(null);
    } finally {
      setFacultyLoading(false);
    }
  };

  // ==========================================
  // PDF REPORT GENERATORS
  // ==========================================

  const handleDownloadFacultyPDF = (profData: any) => {
    if (!profData) return;
    const fHeader = profData.faculty_header || {};
    const pDetails = profData.personal_details || {};
    const oMetrics = profData.overview_metrics || {};
    const acts = profData.activities || {};

    const printWin = window.open('', '_blank', 'width=1000,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>IQAC Faculty Report — ${fHeader.faculty_name || 'Faculty'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin: 0; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { font-size: 14px; margin: 4px 0 0 0; color: #334155; }
          .header p { font-size: 11px; margin: 3px 0 0 0; color: #64748b; }
          .section-title { font-size: 13px; font-weight: bold; background: #f0fdfa; color: #0f766e; padding: 6px 10px; border-left: 4px solid #0f766e; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background-color: #f8fafc; font-weight: 600; color: #334155; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
          .metric-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background: #ffffff; }
          .metric-num { font-size: 16px; font-weight: bold; color: #0f766e; }
          .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; background: #ccfbf1; color: #0f766e; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sig-box { width: 200px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; font-weight: bold; color: #475569; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${user?.college_name || 'Demo Engineering College'}</h1>
          <h2>INSTITUTIONAL QUALITY ASSURANCE CELL (IQAC)</h2>
          <p>Complete Faculty Quality & Academic Dossier Report • Academic Year 2024-25</p>
        </div>

        <div class="section-title">1. Faculty Profile & Header</div>
        <table>
          <tr>
            <th width="20%">Faculty Name</th><td><strong>${fHeader.faculty_name || '-'}</strong></td>
            <th width="20%">Employee ID</th><td>${pDetails.employee_id || '-'}</td>
          </tr>
          <tr>
            <th>Designation</th><td>${fHeader.designation || '-'}</td>
            <th>Department</th><td>${fHeader.department_name || '-'} (${fHeader.department_code || '-'})</td>
          </tr>
          <tr>
            <th>Experience Duration</th><td>${fHeader.experience_duration || '-'}</td>
            <th>Official Email</th><td>${fHeader.email || '-'}</td>
          </tr>
        </table>

        <div class="section-title">2. Personal & Professional Details</div>
        <table>
          <tr>
            <th width="25%">Qualification</th><td>${pDetails.qualification || '-'}</td>
            <th width="25%">Date of Joining</th><td>${pDetails.joining_date || '-'}</td>
          </tr>
          <tr>
            <th>Specialization</th><td>${pDetails.specialization || '-'}</td>
            <th>Contact Phone</th><td>${pDetails.contact_details || '-'}</td>
          </tr>
          <tr>
            <th>Research Interests</th><td colspan="3">${pDetails.research_interests || '-'}</td>
          </tr>
          <tr>
            <th>Professional Summary</th><td colspan="3">${pDetails.bio || '-'}</td>
          </tr>
        </table>

        <div class="section-title">3. Faculty Overview Summary Metrics (13 Categories)</div>
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-num">${oMetrics.total_fdps || 0}</div><div class="metric-label">Total FDPs</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_publications || 0}</div><div class="metric-label">Publications</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_certifications || 0}</div><div class="metric-label">Certifications</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_workshops || 0}</div><div class="metric-label">Workshops</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_seminars || 0}</div><div class="metric-label">Seminars / Webinars</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_conferences || 0}</div><div class="metric-label">Conferences</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_research || 0}</div><div class="metric-label">Research Activities</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_patents || 0}</div><div class="metric-label">Patents</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_projects || 0}</div><div class="metric-label">Projects</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_awards || 0}</div><div class="metric-label">Awards / Honors</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_consultancy || 0}</div><div class="metric-label">Consultancy</div></div>
          <div class="metric-card"><div class="metric-num">${oMetrics.total_memberships || 0}</div><div class="metric-label">Memberships</div></div>
        </div>

        <div class="section-title">4. Faculty Development Programs (FDPs)</div>
        <table>
          <thead><tr><th>#</th><th>FDP Title</th><th>Type</th><th>Organizing Institution</th><th>Date</th><th>Duration</th><th>Mode</th><th>Status</th></tr></thead>
          <tbody>
            ${(acts.fdps || []).map((a: any, i: number) => `
              <tr>
                <td>${i + 1}</td><td><strong>${a.title}</strong></td><td>${a.type}</td><td>${a.organizing_institution}</td>
                <td>${a.date}</td><td>${a.duration}</td><td>${a.mode}</td><td><span class="badge">${a.status}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="8" style="text-align:center;">No FDP records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">5. Research Publications</div>
        <table>
          <thead><tr><th>#</th><th>Publication Title</th><th>Authors</th><th>Journal / Conference</th><th>Indexing</th><th>Year / DOI</th><th>Status</th></tr></thead>
          <tbody>
            ${(acts.publications || []).map((a: any, i: number) => `
              <tr>
                <td>${i + 1}</td><td><strong>${a.title}</strong></td><td>${a.authors}</td><td>${a.journal_name}</td>
                <td>${a.indexing}</td><td>${a.year} • ${a.doi_url}</td><td><span class="badge">${a.status}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;">No publication records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">6. Certifications & Credentials</div>
        <table>
          <thead><tr><th>#</th><th>Certification Title</th><th>Category</th><th>Issuing Organization</th><th>Validity / Date</th><th>Certificate No.</th></tr></thead>
          <tbody>
            ${(acts.certifications || []).map((a: any, i: number) => `
              <tr>
                <td>${i + 1}</td><td><strong>${a.title}</strong></td><td>${a.category}</td><td>${a.issuing_organization}</td>
                <td>${a.date} (${a.validity})</td><td>${a.certificate_number || '-'}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No certification records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">7. Workshops & Hands-on Training</div>
        <table>
          <thead><tr><th>#</th><th>Workshop Title</th><th>Organizer</th><th>Date</th><th>Duration</th><th>Mode</th></tr></thead>
          <tbody>
            ${(acts.workshops || []).map((a: any, i: number) => `
              <tr><td>${i + 1}</td><td><strong>${a.title}</strong></td><td>${a.organizer}</td><td>${a.date}</td><td>${a.duration}</td><td>${a.mode}</td></tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No workshop records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">8. Seminars & Webinars</div>
        <table>
          <thead><tr><th>#</th><th>Title / Topic</th><th>Organizer</th><th>Date</th><th>Role</th><th>Mode</th></tr></thead>
          <tbody>
            ${(acts.seminars || []).map((a: any, i: number) => `
              <tr><td>${i + 1}</td><td><strong>${a.title}</strong></td><td>${a.organizer}</td><td>${a.date}</td><td>${a.role}</td><td>${a.mode}</td></tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No seminar records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">9. Conferences & Paper Presentations</div>
        <table>
          <thead><tr><th>#</th><th>Conference Name</th><th>Paper Title</th><th>Organizer</th><th>Date</th><th>Participation Type</th></tr></thead>
          <tbody>
            ${(acts.conferences || []).map((a: any, i: number) => `
              <tr><td>${i + 1}</td><td><strong>${a.conference_name}</strong></td><td>${a.paper_title}</td><td>${a.organizer}</td><td>${a.date}</td><td>${a.participation_type}</td></tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No conference records submitted.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">10. Research Activities, Patents & Sponsored Projects</div>
        <table>
          <thead><tr><th>Type</th><th>Title / Area</th><th>Organization / Agency</th><th>Duration / Status</th><th>Reference / Amount</th></tr></thead>
          <tbody>
            ${(acts.research || []).map((a: any) => `
              <tr><td>Research</td><td><strong>${a.research_area}</strong></td><td>${a.institution}</td><td>${a.duration} (${a.project_status})</td><td>PI Role</td></tr>
            `).join('')}
            ${(acts.patents || []).map((a: any) => `
              <tr><td>Patent</td><td><strong>${a.patent_title}</strong></td><td>Indian Patent Office</td><td>${a.filing_date}</td><td>No: ${a.patent_number}</td></tr>
            `).join('')}
            ${(acts.projects || []).map((a: any) => `
              <tr><td>Project</td><td><strong>${a.project_title}</strong></td><td>${a.funding_agency}</td><td>${a.duration}</td><td>Amount: ${a.funding_amount}</td></tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">11. Institutional Contributions (Awards, Consultancy, Memberships, Other)</div>
        <table>
          <thead><tr><th>Category</th><th>Activity Name / Organization</th><th>Details / Role</th><th>Duration / Value</th></tr></thead>
          <tbody>
            ${(acts.awards || []).map((a: any) => `
              <tr><td>Award</td><td><strong>${a.award_name}</strong></td><td>${a.awarding_organization}</td><td>Year: ${a.year}</td></tr>
            `).join('')}
            ${(acts.consultancy || []).map((a: any) => `
              <tr><td>Consultancy</td><td><strong>${a.consultancy_title}</strong></td><td>${a.organization}</td><td>Value: ${a.amount}</td></tr>
            `).join('')}
            ${(acts.memberships || []).map((a: any) => `
              <tr><td>Membership</td><td><strong>${a.organization}</strong></td><td>${a.membership_type}</td><td>No: ${a.membership_number}</td></tr>
            `).join('')}
            ${(acts.other_activities || []).map((a: any) => `
              <tr><td>Other Academic</td><td><strong>${a.title}</strong></td><td>${a.organizer}</td><td>${a.date}</td></tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">Faculty Member Signature<br/>(${fHeader.faculty_name || 'Faculty'})</div>
          <div class="sig-box">Head of Department (HOD)<br/>(${fHeader.department_code || 'Dept'})</div>
          <div class="sig-box">IQAC Coordinator / Member<br/>Institutional Seal</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  const handleDownloadDepartmentPDF = () => {
    if (!deptOverview || !selectedDept) return;
    const printWin = window.open('', '_blank', 'width=1000,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>IQAC Department Report — ${selectedDept.name} (${selectedDept.code})</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin: 0; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
          .header h2 { font-size: 14px; margin: 4px 0 0 0; color: #334155; }
          .header p { font-size: 11px; margin: 3px 0 0 0; color: #64748b; }
          .section-title { font-size: 13px; font-weight: bold; background: #f0fdfa; color: #0f766e; padding: 6px 10px; border-left: 4px solid #0f766e; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background-color: #f8fafc; font-weight: 600; color: #334155; }
          .metrics-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 15px; }
          .metric-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background: #ffffff; }
          .metric-num { font-size: 16px; font-weight: bold; color: #0f766e; }
          .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sig-box { width: 220px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; font-weight: bold; color: #475569; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${user?.college_name || 'Demo Engineering College'}</h1>
          <h2>INSTITUTIONAL QUALITY ASSURANCE CELL (IQAC)</h2>
          <p>Comprehensive Department Quality & Accreditation Report • Academic Year 2024-25</p>
          <p><strong>Department:</strong> ${selectedDept.name} (${selectedDept.code})</p>
        </div>

        <div class="section-title">1. Department Overview & Metrics (All 15 Mandated Categories)</div>
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-num">${deptOverview.total_faculty || 0}</div><div class="metric-label">Total Faculty</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_fdps || 0}</div><div class="metric-label">Total FDPs</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_publications || 0}</div><div class="metric-label">Publications</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_certifications || 0}</div><div class="metric-label">Certifications</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_workshops || 0}</div><div class="metric-label">Workshops</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_seminars || 0}</div><div class="metric-label">Seminars / Webinars</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_conferences || 0}</div><div class="metric-label">Conferences</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_fdp_activities || 0}</div><div class="metric-label">FDP Activities</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_research || 0}</div><div class="metric-label">Research Activities</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_awards || 0}</div><div class="metric-label">Awards / Honors</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_patents || 0}</div><div class="metric-label">Patents</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_projects || 0}</div><div class="metric-label">Funded Projects</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_consultancy || 0}</div><div class="metric-label">Consultancy</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_memberships || 0}</div><div class="metric-label">Memberships</div></div>
          <div class="metric-card"><div class="metric-num">${deptOverview.total_other || 0}</div><div class="metric-label">Other Activities</div></div>
        </div>

        <div class="section-title">2. Faculty-Wise Summary & Contribution Roster</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Faculty Name</th>
              <th>Designation</th>
              <th>Employee ID</th>
              <th>Official Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${(deptOverview.faculty || []).map((f: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${f.full_name}</strong></td>
                <td>${f.designation}</td>
                <td>${f.employee_id || '-'}</td>
                <td>${f.email}</td>
                <td>${f.role}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No faculty members registered in this department.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">3. Department Comparative Analysis Summary</div>
        <table>
          <thead><tr><th>Comparison Area</th><th>Primary Metric</th><th>Secondary Metric</th><th>Balance Ratio</th></tr></thead>
          <tbody>
            <tr>
              <td>Faculty Development vs Research</td>
              <td>FDPs: ${deptOverview.total_fdps}</td>
              <td>Publications: ${deptOverview.total_publications}</td>
              <td>${deptOverview.total_publications > 0 ? (deptOverview.total_fdps / deptOverview.total_publications).toFixed(2) : '1.00'}</td>
            </tr>
            <tr>
              <td>Certifications vs Workshops</td>
              <td>Certifications: ${deptOverview.total_certifications}</td>
              <td>Workshops: ${deptOverview.total_workshops}</td>
              <td>1.00</td>
            </tr>
            <tr>
              <td>Academic Dissemination</td>
              <td>Seminars / Webinars: ${deptOverview.total_seminars}</td>
              <td>Conferences: ${deptOverview.total_conferences}</td>
              <td>1.00</td>
            </tr>
            <tr>
              <td>Innovation & IP Ecosystem</td>
              <td>Patents (${deptOverview.total_patents}) + Projects (${deptOverview.total_projects})</td>
              <td>Research Activities: ${deptOverview.total_research}</td>
              <td>Active Institutional Grant Ratio</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">Head of Department (HOD)<br/>Department of ${selectedDept.code}</div>
          <div class="sig-box">IQAC Coordinator / Member<br/>College Quality Cell</div>
          <div class="sig-box">Principal / Dean<br/>Executive Management</div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 500);
  };

  // =========================================================================
  // VIEW LEVEL 4: INDIVIDUAL FACULTY PROFILE
  // =========================================================================
  if (selectedDept && activeDeptAction === 'faculty_profile' && selectedFacultyId) {
    if (facultyLoading) {
      return (
        <div className="py-24 text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">Loading Individual Faculty Profile...</p>
        </div>
      );
    }

    if (!facultyProfile) {
      return (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <p className="text-slate-600 mb-4 font-medium">Faculty profile data not found.</p>
          <button
            onClick={() => setSelectedFacultyId(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            ← Back to Faculty List
          </button>
        </div>
      );
    }

    const fHeader = facultyProfile.faculty_header || {};
    const pDetails = facultyProfile.personal_details || {};
    const oMetrics = facultyProfile.overview_metrics || {};
    const statsChart = facultyProfile.stats_chart || [];
    const acts = facultyProfile.activities || {};

    const categoryTabs = [
      { key: 'fdps', label: 'FDP Details', count: (acts.fdps || []).length },
      { key: 'publications', label: 'Publications', count: (acts.publications || []).length },
      { key: 'certifications', label: 'Certifications', count: (acts.certifications || []).length },
      { key: 'workshops', label: 'Workshops', count: (acts.workshops || []).length },
      { key: 'seminars', label: 'Seminars / Webinars', count: (acts.seminars || []).length },
      { key: 'conferences', label: 'Conferences', count: (acts.conferences || []).length },
      { key: 'research', label: 'Research Activities', count: (acts.research || []).length },
      { key: 'patents', label: 'Patents', count: (acts.patents || []).length },
      { key: 'projects', label: 'Projects', count: (acts.projects || []).length },
      { key: 'awards', label: 'Awards / Achievements', count: (acts.awards || []).length },
      { key: 'consultancy', label: 'Consultancy', count: (acts.consultancy || []).length },
      { key: 'memberships', label: 'Memberships', count: (acts.memberships || []).length },
      { key: 'other', label: 'Other Activities', count: (acts.other_activities || []).length },
    ];

    return (
      <div className="space-y-6 pb-16">
        {/* Top Back & Report Download Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedFacultyId(null)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Faculty List ({selectedDept.code})</span>
          </button>

          <button
            type="button"
            id="faculty-report-download-btn"
            onClick={() => handleDownloadFacultyPDF(facultyProfile)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-xl shadow-md text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Faculty IQAC Report (PDF)</span>
          </button>
        </div>

        {/* Section 5: Faculty Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0 overflow-hidden">
              {fHeader.photo_url ? (
                <img src={fHeader.photo_url} alt={fHeader.faculty_name} className="w-full h-full object-cover" />
              ) : (
                <span>{(fHeader.faculty_name || 'F').charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{fHeader.faculty_name}</h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Verified Faculty
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{fHeader.designation}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  {fHeader.department_name} ({fHeader.department_code})
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Experience: <strong>{fHeader.experience_duration}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  {fHeader.email}
                </span>
              </div>
            </div>
          </div>

          {/* Section 7: Personal Details Toggle Button */}
          <button
            type="button"
            id="personal-details-toggle-btn"
            onClick={() => setShowPersonalDetails((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              showPersonalDetails
                ? 'bg-teal-50 border-teal-300 text-teal-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Info className="w-4 h-4 text-teal-600" />
            <span>{showPersonalDetails ? 'Hide Personal Details' : 'Personal Details'}</span>
          </button>
        </div>

        {/* Section 7: Personal Details Modal / Expanded Card */}
        {showPersonalDetails && (
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-3xl p-6 border border-teal-200 shadow-sm animate-in fade-in-50">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-teal-100">
              <h3 className="text-sm font-bold text-teal-950 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-700" />
                Submitted Faculty Registration & Professional Information
              </h3>
              <span className="text-[11px] text-teal-700 font-semibold">
                Official Institutional Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Faculty Name</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.faculty_name}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Employee ID</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.employee_id}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Designation</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.designation}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Department</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.department}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Highest Qualification</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.qualification}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Specialization</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.specialization}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Date of Joining</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.joining_date}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Experience Duration</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.experience}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Official Email</span>
                <span className="text-slate-800 font-bold mt-0.5 block truncate">{pDetails.official_email}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Contact Details</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.contact_details}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Research Interests</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{pDetails.research_interests}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-3">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Professional Summary & Bio</span>
                <span className="text-slate-700 mt-1 block leading-relaxed">{pDetails.bio}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Faculty Overview Metrics (13 Categories) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Faculty Academic Summary Metrics
            </h3>
            <span className="text-xs text-teal-700 font-bold">
              Total Activities: {Object.values(oMetrics).reduce((a: any, b: any) => a + (Number(b) || 0), 0) as number}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {[
              { label: 'Total FDPs', val: oMetrics.total_fdps, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Publications', val: oMetrics.total_publications, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
              { label: 'Certifications', val: oMetrics.total_certifications, color: 'text-purple-700 bg-purple-50 border-purple-200' },
              { label: 'Workshops', val: oMetrics.total_workshops, color: 'text-pink-700 bg-pink-50 border-pink-200' },
              { label: 'Seminars/Webinars', val: oMetrics.total_seminars, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { label: 'Conferences', val: oMetrics.total_conferences, color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { label: 'Research', val: oMetrics.total_research, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
              { label: 'Awards/Honors', val: oMetrics.total_awards, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: 'Patents', val: oMetrics.total_patents, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
              { label: 'Projects', val: oMetrics.total_projects, color: 'text-teal-700 bg-teal-50 border-teal-200' },
              { label: 'Consultancy', val: oMetrics.total_consultancy, color: 'text-lime-700 bg-lime-50 border-lime-200' },
              { label: 'Memberships', val: oMetrics.total_memberships, color: 'text-violet-700 bg-violet-50 border-violet-200' },
              { label: 'Other Activities', val: oMetrics.total_other, color: 'text-slate-700 bg-slate-100 border-slate-200' },
            ].map((m, idx) => (
              <div key={idx} className={`p-3 rounded-2xl border text-center ${m.color} shadow-2xs`}>
                <span className="text-xl font-black block leading-none">{m.val || 0}</span>
                <span className="text-[10px] font-bold block mt-1 leading-tight">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 21: Faculty Stats — STRICTLY NOT A BUTTON, DIRECTLY VISIBLE ON PAGE */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Faculty Academic Statistics — Category Comparison Chart
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Directly visible graphical representation comparing contributions across all 13 academic categories
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Direct Statistical Analysis
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statsChart.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#0d9488'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sections 8 to 20: 13 Granular Academic Activity Sections */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Category Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-2 gap-1.5 scrollbar-thin">
            {categoryTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveFacultyCategory(t.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeFacultyCategory === t.key
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeFacultyCategory === t.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 8. FDP Details */}
            {activeFacultyCategory === 'fdps' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Faculty Development Programs (FDP Details)
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {(acts.fdps || []).length} programs recorded
                  </span>
                </div>
                {acts.fdps && acts.fdps.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="py-3 px-3">FDP Title</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Organizing Institution</th>
                          <th className="py-3 px-3">Date & Duration</th>
                          <th className="py-3 px-3">Mode</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acts.fdps.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 font-bold text-slate-800">{a.title}</td>
                            <td className="py-3 px-3 text-slate-600">{a.type}</td>
                            <td className="py-3 px-3 text-slate-600">{a.organizing_institution}</td>
                            <td className="py-3 px-3 text-slate-600">
                              {a.date} <span className="text-slate-400">({a.duration})</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {a.mode}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{a.role}</td>
                            <td className="py-3 px-3 text-right">
                              {a.certificate_proof ? (
                                <a
                                  href={a.certificate_proof}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                                >
                                  <span>View Proof</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Verified in Dossier</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No FDP activities submitted.</p>
                )}
              </div>
            )}

            {/* 9. Publications */}
            {activeFacultyCategory === 'publications' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Research Publications
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {(acts.publications || []).length} publications indexed
                  </span>
                </div>
                {acts.publications && acts.publications.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="py-3 px-3">Publication Title</th>
                          <th className="py-3 px-3">Authors</th>
                          <th className="py-3 px-3">Journal / Conference</th>
                          <th className="py-3 px-3">Type & Indexing</th>
                          <th className="py-3 px-3">Year / DOI</th>
                          <th className="py-3 px-3">Faculty Role</th>
                          <th className="py-3 px-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acts.publications.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 font-bold text-slate-800 max-w-xs">{a.title}</td>
                            <td className="py-3 px-3 text-slate-600">{a.authors}</td>
                            <td className="py-3 px-3 text-slate-600">{a.journal_name}</td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                {a.indexing}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {a.year} <br />
                              <span className="text-[10px] text-teal-600">{a.doi_url}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{a.role}</td>
                            <td className="py-3 px-3 text-right">
                              {a.proof_url ? (
                                <a
                                  href={a.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                                >
                                  <span>Proof</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Verified</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No publication records submitted.</p>
                )}
              </div>
            )}

            {/* 10. Certifications */}
            {activeFacultyCategory === 'certifications' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Certifications & Professional Credentials
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {(acts.certifications || []).length} certificates on record
                  </span>
                </div>
                {acts.certifications && acts.certifications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.certifications.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                            {a.category}
                          </span>
                          {a.proof_url && (
                            <a
                              href={a.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-teal-600 flex items-center gap-1"
                            >
                              <span>Proof</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mt-2">{a.title}</h5>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Issuer: <strong>{a.issuing_organization}</strong>
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                          <span>Issued: {a.date}</span>
                          <span>Validity: {a.validity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No certification records submitted.</p>
                )}
              </div>
            )}

            {/* 11. Workshops */}
            {activeFacultyCategory === 'workshops' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Workshops & Technical Training
                  </h4>
                </div>
                {acts.workshops && acts.workshops.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="py-3 px-3">Workshop Title</th>
                          <th className="py-3 px-3">Organizer</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Duration</th>
                          <th className="py-3 px-3">Mode</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acts.workshops.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 font-bold text-slate-800">{a.title}</td>
                            <td className="py-3 px-3 text-slate-600">{a.organizer}</td>
                            <td className="py-3 px-3 text-slate-600">{a.date}</td>
                            <td className="py-3 px-3 text-slate-600">{a.duration}</td>
                            <td className="py-3 px-3 text-slate-600">{a.mode}</td>
                            <td className="py-3 px-3 text-slate-600">{a.role}</td>
                            <td className="py-3 px-3 text-right text-teal-600 font-bold">
                              {a.proof_url ? (
                                <a href={a.proof_url} target="_blank" rel="noopener noreferrer">View Proof</a>
                              ) : (
                                'Verified'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No workshop records submitted.</p>
                )}
              </div>
            )}

            {/* 12. Seminars / Webinars */}
            {activeFacultyCategory === 'seminars' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Seminars & Webinars
                </h4>
                {acts.seminars && acts.seminars.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="py-3 px-3">Seminar / Webinar Title</th>
                          <th className="py-3 px-3">Organizer</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Topic</th>
                          <th className="py-3 px-3">Role</th>
                          <th className="py-3 px-3">Mode</th>
                          <th className="py-3 px-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acts.seminars.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 font-bold text-slate-800">{a.title}</td>
                            <td className="py-3 px-3 text-slate-600">{a.organizer}</td>
                            <td className="py-3 px-3 text-slate-600">{a.date}</td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{a.topic}</td>
                            <td className="py-3 px-3 text-slate-600">{a.role}</td>
                            <td className="py-3 px-3 text-slate-600">{a.mode}</td>
                            <td className="py-3 px-3 text-right text-teal-600 font-bold">Verified</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No seminar records submitted.</p>
                )}
              </div>
            )}

            {/* 13. Conferences */}
            {activeFacultyCategory === 'conferences' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Conferences & Symposia
                </h4>
                {acts.conferences && acts.conferences.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="py-3 px-3">Conference Name</th>
                          <th className="py-3 px-3">Paper Title</th>
                          <th className="py-3 px-3">Organizer</th>
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Location / Mode</th>
                          <th className="py-3 px-3">Participation Type</th>
                          <th className="py-3 px-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {acts.conferences.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 font-bold text-slate-800">{a.conference_name}</td>
                            <td className="py-3 px-3 text-slate-700">{a.paper_title}</td>
                            <td className="py-3 px-3 text-slate-600">{a.organizer}</td>
                            <td className="py-3 px-3 text-slate-600">{a.date}</td>
                            <td className="py-3 px-3 text-slate-600">{a.location_mode}</td>
                            <td className="py-3 px-3 text-slate-600">{a.participation_type}</td>
                            <td className="py-3 px-3 text-right text-teal-600 font-bold">Verified</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No conference records submitted.</p>
                )}
              </div>
            )}

            {/* 14. Research Activities */}
            {activeFacultyCategory === 'research' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Research Activities
                </h4>
                {acts.research && acts.research.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.research.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                          {a.project_status}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 mt-2">{a.research_area}</h5>
                        <p className="text-[11px] text-slate-600 mt-1">{a.research_project}</p>
                        <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                          <p>Role: <strong>{a.role}</strong></p>
                          <p>Host Institution: <strong>{a.institution}</strong></p>
                          <p>Duration: <strong>{a.duration}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No research activities submitted.</p>
                )}
              </div>
            )}

            {/* 15. Patents */}
            {activeFacultyCategory === 'patents' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Patents & Intellectual Property
                </h4>
                {acts.patents && acts.patents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.patents.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-teal-200 bg-teal-50/20">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                          {a.status}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 mt-2">{a.patent_title}</h5>
                        <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                          <p>Patent No: <strong>{a.patent_number}</strong></p>
                          <p>Application No: <strong>{a.application_number}</strong></p>
                          <p>Inventors: <strong>{a.inventors}</strong></p>
                          <p>Filing Date: <strong>{a.filing_date}</strong> • Grant Date: <strong>{a.grant_date}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No patents submitted.</p>
                )}
              </div>
            )}

            {/* 16. Projects */}
            {activeFacultyCategory === 'projects' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Sponsored Academic & Research Projects
                </h4>
                {acts.projects && acts.projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.projects.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/20">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                          {a.status}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 mt-2">{a.project_title}</h5>
                        <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                          <p>Funding Agency: <strong>{a.funding_agency}</strong></p>
                          <p>Sanctioned Amount: <strong className="text-cyan-800">{a.funding_amount}</strong></p>
                          <p>Faculty Role: <strong>{a.role}</strong> • Duration: <strong>{a.duration}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No funded projects submitted.</p>
                )}
              </div>
            )}

            {/* 17. Awards / Achievements */}
            {activeFacultyCategory === 'awards' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Honors, Awards & Achievements
                </h4>
                {acts.awards && acts.awards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.awards.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20">
                        <Award className="w-5 h-5 text-emerald-600 mb-2" />
                        <h5 className="text-xs font-bold text-slate-900">{a.award_name}</h5>
                        <p className="text-[11px] text-slate-600 mt-1">{a.description}</p>
                        <div className="mt-2 text-[11px] text-slate-500">
                          Awarding Body: <strong>{a.awarding_organization}</strong> ({a.year})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No awards submitted.</p>
                )}
              </div>
            )}

            {/* 18. Consultancy Activities */}
            {activeFacultyCategory === 'consultancy' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Consultancy & Industrial Advisory Activities
                </h4>
                {acts.consultancy && acts.consultancy.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.consultancy.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-lime-200 bg-lime-50/20">
                        <Briefcase className="w-5 h-5 text-lime-600 mb-2" />
                        <h5 className="text-xs font-bold text-slate-900">{a.consultancy_title}</h5>
                        <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                          <p>Client Organization: <strong>{a.organization}</strong></p>
                          <p>Remitted Value: <strong className="text-lime-800">{a.amount}</strong></p>
                          <p>Role: <strong>{a.role}</strong> • Duration: <strong>{a.duration}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No consultancy activities submitted.</p>
                )}
              </div>
            )}

            {/* 19. Professional Memberships */}
            {activeFacultyCategory === 'memberships' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Professional Organization Memberships
                </h4>
                {acts.memberships && acts.memberships.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {acts.memberships.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-violet-200 bg-violet-50/20">
                        <h5 className="text-xs font-bold text-slate-900">{a.organization}</h5>
                        <p className="text-[11px] text-violet-700 font-semibold mt-0.5">{a.membership_type}</p>
                        <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                          <p>Membership No: <strong>{a.membership_number}</strong></p>
                          <p>Validity: <strong>{a.validity}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No professional memberships submitted.</p>
                )}
              </div>
            )}

            {/* 20. Other Academic Activities */}
            {activeFacultyCategory === 'other' && (
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                  Other Relevant Academic Activities
                </h4>
                {acts.other_activities && acts.other_activities.length > 0 ? (
                  <div className="space-y-3">
                    {acts.other_activities.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-900">{a.title}</h5>
                          <span className="text-[10px] font-bold text-slate-500">{a.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{a.description}</p>
                        <p className="text-[10px] text-slate-400 mt-2">Organizer: {a.organizer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No other activities submitted.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 3: DEPARTMENT STATS (Comparison Graphs)
  // =========================================================================
  if (selectedDept && activeDeptAction === 'department_stats') {
    const graphs = deptOverview?.graphs || {};
    return (
      <div className="space-y-6 pb-16">
        {/* Top Back & Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveDeptAction('overview')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Department Overview ({selectedDept.code})</span>
          </button>

          <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Department Statistics & Comparative Analysis
          </span>
        </div>

        {/* Section 23: Complete Department Statistics (14 Metrics) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">
            {selectedDept.name} — Core Statistics Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { label: 'Faculty', val: deptOverview?.total_faculty || 0 },
              { label: 'Total FDPs', val: deptOverview?.total_fdps || 0 },
              { label: 'Publications', val: deptOverview?.total_publications || 0 },
              { label: 'Certifications', val: deptOverview?.total_certifications || 0 },
              { label: 'Workshops', val: deptOverview?.total_workshops || 0 },
              { label: 'Seminars', val: deptOverview?.total_seminars || 0 },
              { label: 'Conferences', val: deptOverview?.total_conferences || 0 },
              { label: 'Research', val: deptOverview?.total_research || 0 },
              { label: 'Patents', val: deptOverview?.total_patents || 0 },
              { label: 'Projects', val: deptOverview?.total_projects || 0 },
              { label: 'Awards', val: deptOverview?.total_awards || 0 },
              { label: 'Consultancy', val: deptOverview?.total_consultancy || 0 },
              { label: 'Memberships', val: deptOverview?.total_memberships || 0 },
              { label: 'Other Activities', val: deptOverview?.total_other || 0 },
            ].map((s, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xl font-black text-teal-800 block">{s.val}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 23: Department Comparison Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: FDP vs Publications */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              FDP vs Research Publications
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Continuous learning engagement vs research output</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphs.fdp_vs_publications || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Certifications vs Workshops */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              Certifications vs Workshops
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Technical credentialing vs hands-on skills acquisition</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphs.certifications_vs_workshops || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 3: Seminars vs Conferences */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              Seminars / Webinars vs Conferences
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Knowledge sessions vs peer-reviewed presentations</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphs.seminars_vs_conferences || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 4: Research, Patents & Projects */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              Research Activities, Patents & Sponsored Projects
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Intellectual property and funded grant ecosystem</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphs.research_patents_projects || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 5: Institutional Contributions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs lg:col-span-2">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              Awards, Consultancy, Memberships & Academic Outreach
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">Broader societal, industrial and institutional impact</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphs.institutional_contributions || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 3: DEPARTMENT REPORT DOWNLOAD
  // =========================================================================
  if (selectedDept && activeDeptAction === 'report_download') {
    return (
      <div className="space-y-6 pb-16">
        {/* Top Back */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveDeptAction('overview')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Department Overview ({selectedDept.code})</span>
          </button>

          <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Department IQAC Report Dossier
          </span>
        </div>

        {/* Section 24: Department Report Action Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4 border border-teal-200">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            {selectedDept.name} ({selectedDept.code})
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Comprehensive NAAC/NBA Accreditation Verification Report covering all 19 institutional categories and faculty-wise contribution summary.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2 max-w-lg mx-auto">
            <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
              Report Includes 19 Mandated Sections:
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] list-disc list-inside">
              <li>Department Overview</li>
              <li>Total Faculty Roster</li>
              <li>Faculty Summary</li>
              <li>FDP Details</li>
              <li>Publication Details</li>
              <li>Certification Summary</li>
              <li>Workshop Details</li>
              <li>Seminar / Webinar Details</li>
              <li>Conference Details</li>
              <li>Research Activities</li>
              <li>Patent Details</li>
              <li>Project Details</li>
              <li>Awards / Achievements</li>
              <li>Consultancy Activities</li>
              <li>Professional Memberships</li>
              <li>Other Activities</li>
              <li>Department Statistics</li>
              <li>Graphical Analysis</li>
              <li>Contribution Summary</li>
            </ul>
          </div>

          <button
            type="button"
            id="download-full-dept-report-btn"
            onClick={handleDownloadDepartmentPDF}
            className="mt-8 px-6 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-2xl shadow-lg shadow-teal-600/20 text-sm font-bold inline-flex items-center gap-2 cursor-pointer transition transform active:scale-98"
          >
            <Printer className="w-5 h-5" />
            <span>Generate & Download Department Report (PDF)</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 3: FACULTY PROFILE LIST
  // =========================================================================
  if (selectedDept && activeDeptAction === 'faculty_profile') {
    const facultyList = deptOverview?.faculty || [];
    const filtered = facultyList.filter(
      (f: any) =>
        f.full_name?.toLowerCase().includes(facultySearch.toLowerCase()) ||
        f.designation?.toLowerCase().includes(facultySearch.toLowerCase()) ||
        f.email?.toLowerCase().includes(facultySearch.toLowerCase())
    );

    return (
      <div className="space-y-6 pb-16">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveDeptAction('overview')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Department Overview ({selectedDept.code})</span>
          </button>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty name or designation..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-text"
            />
          </div>
        </div>

        {/* Section 4: Faculty Profile List Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {selectedDept.name} — Faculty Members ({filtered.length})
            </h3>
            <span className="text-xs text-slate-500">
              Select a faculty to view profile or download IQAC report
            </span>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((faculty: any) => (
                <div
                  key={faculty.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-700 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20 overflow-hidden">
                        {faculty.photo_url ? (
                          <img
                            src={faculty.photo_url}
                            alt={faculty.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(faculty.full_name || 'F').charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {faculty.full_name}
                        </h4>
                        <p className="text-xs font-semibold text-teal-700 truncate mt-0.5">
                          {faculty.designation || 'Assistant Professor'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {faculty.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Exactly 2 Buttons per Faculty Card (Spec #4) */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectFaculty(faculty.id)}
                      className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile View</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await apiClient.get(`/auth/users/${faculty.id}/iqac-profile/`);
                          handleDownloadFacultyPDF(res.data);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No faculty members found</p>
              <p className="text-xs text-slate-400 mt-1">Try refining your search query or check back later.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 2: DEPARTMENT OVERVIEW
  // =========================================================================
  if (selectedDept && activeDeptAction === 'overview') {
    return (
      <div className="space-y-6 pb-16">
        {/* Top Bar with Department Info & Back */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedDept(null)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← All Departments</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedDept.icon}</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {selectedDept.name} ({selectedDept.code})
              </h2>
              <p className="text-[11px] text-slate-500">Department Quality Overview & Institutional Analytics</p>
            </div>
          </div>
        </div>

        {deptOverviewLoading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-600">Calculating Department Overview Metrics...</p>
          </div>
        ) : (
          <>
            {/* Section 3: Department Overview Metrics (All 15 Mandated Metrics) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Department Overview Metrics (15 Mandated Categories)
                </h3>
                <span className="text-xs text-teal-700 font-bold">
                  Automatically calculated from faculty submitted data
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {[
                  { label: 'Total Faculty', val: deptOverview?.total_faculty || 0, icon: Users, color: 'text-slate-800 bg-white border-slate-200' },
                  { label: 'Total FDPs', val: deptOverview?.total_fdps || 0, icon: BookOpen, color: 'text-blue-700 bg-blue-50/50 border-blue-200' },
                  { label: 'Total Publications', val: deptOverview?.total_publications || 0, icon: FileText, color: 'text-indigo-700 bg-indigo-50/50 border-indigo-200' },
                  { label: 'Total Certifications', val: deptOverview?.total_certifications || 0, icon: Award, color: 'text-purple-700 bg-purple-50/50 border-purple-200' },
                  { label: 'Total Workshops', val: deptOverview?.total_workshops || 0, icon: Layers, color: 'text-pink-700 bg-pink-50/50 border-pink-200' },
                  { label: 'Seminars / Webinars', val: deptOverview?.total_seminars || 0, icon: Calendar, color: 'text-rose-700 bg-rose-50/50 border-rose-200' },
                  { label: 'Total Conferences', val: deptOverview?.total_conferences || 0, icon: GraduationCap, color: 'text-amber-700 bg-amber-50/50 border-amber-200' },
                  { label: 'FDP Activities', val: deptOverview?.total_fdp_activities || 0, icon: Cpu, color: 'text-orange-700 bg-orange-50/50 border-orange-200' },
                  { label: 'Research Activities', val: deptOverview?.total_research || 0, icon: Sparkles, color: 'text-yellow-700 bg-yellow-50/50 border-yellow-200' },
                  { label: 'Awards / Achievements', val: deptOverview?.total_awards || 0, icon: Award, color: 'text-emerald-700 bg-emerald-50/50 border-emerald-200' },
                  { label: 'Total Patents', val: deptOverview?.total_patents || 0, icon: ShieldCheck, color: 'text-teal-700 bg-teal-50/50 border-teal-200' },
                  { label: 'Total Projects', val: deptOverview?.total_projects || 0, icon: Briefcase, color: 'text-cyan-700 bg-cyan-50/50 border-cyan-200' },
                  { label: 'Consultancy Activities', val: deptOverview?.total_consultancy || 0, icon: Briefcase, color: 'text-lime-700 bg-lime-50/50 border-lime-200' },
                  { label: 'Professional Memberships', val: deptOverview?.total_memberships || 0, icon: CheckCircle2, color: 'text-violet-700 bg-violet-50/50 border-violet-200' },
                  { label: 'Other Academic Activities', val: deptOverview?.total_other || 0, icon: Info, color: 'text-slate-700 bg-slate-100 border-slate-200' },
                ].map((m, idx) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-3xl border shadow-2xs transition-all hover:shadow-sm ${m.color}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black">{m.val}</span>
                        <Icon className="w-5 h-5 opacity-70" />
                      </div>
                      <p className="text-[11px] font-bold leading-tight">{m.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Department Actions — EXACTLY 3 BUTTONS (NO OTHER BUTTONS) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
                Department Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Button 1: Faculty Profile */}
                <button
                  type="button"
                  id="action-faculty-profile-btn"
                  onClick={() => setActiveDeptAction('faculty_profile')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 hover:border-teal-400 text-left transition group cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                    1. Faculty Profile
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    View list of faculty members, individual profiles, and faculty IQAC reports.
                  </p>
                </button>

                {/* Button 2: Department Stats */}
                <button
                  type="button"
                  id="action-department-stats-btn"
                  onClick={() => setActiveDeptAction('department_stats')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 hover:border-indigo-400 text-left transition group cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                    2. Department Stats
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Detailed comparative statistics and departmental graphical analysis.
                  </p>
                </button>

                {/* Button 3: Report Download */}
                <button
                  type="button"
                  id="action-report-download-btn"
                  onClick={() => setActiveDeptAction('report_download')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 text-left transition group cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                      <Download className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                    3. Report Download
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Generate and download the complete 19-section verified Department IQAC Report.
                  </p>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW LEVEL 1: MAIN DASHBOARD (DEPARTMENT SELECTION)
  // =========================================================================
  return (
    <div className="space-y-6 pb-16">
      {/* Title & Introduction */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admin 2 • IQAC Member Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Institutional Quality Assurance Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Select any department to review automated academic metrics, inspect faculty dossiers, explore comparative analytics, and download official IQAC accreditation reports.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
          <p className="text-[10px] text-teal-200 font-bold uppercase">Accredited Academic Year</p>
          <p className="text-sm font-black text-white">2024–25 (Active)</p>
        </div>
      </div>

      {/* Section 2: Department Selection (All 11 departments as individual selectable cards) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Select Department
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a department to access its complete 15-metric quality overview and reporting actions
            </p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            11 Departments Active
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-600">Loading Academic Departments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {departmentsList.map((dept) => (
              <button
                key={dept.code}
                type="button"
                id={`dept-card-${dept.code.toLowerCase()}`}
                onClick={() => handleSelectDepartment(dept)}
                className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-400 hover:shadow-lg transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-98"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 rounded-2xl bg-teal-50 border border-teal-100/60 group-hover:scale-110 transition-transform">
                      {dept.icon}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                      {dept.code}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                    {dept.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {dept.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
                  <span>View Overview</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
