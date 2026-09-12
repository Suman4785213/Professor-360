export type UserRole =
  | 'SUPER_ADMIN'
  | 'COLLEGE_MANAGEMENT'
  | 'IQAC'
  | 'HOD'
  | 'DEPARTMENT_INCHARGE'
  | 'FACULTY';

export type Role = UserRole;

export interface FacultyProfile {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  college?: string;
  college_name?: string;
  department?: string;
  department_name?: string;
  employee_id: string;
  designation: string;
  qualification: string;
  joining_date?: string;
  phone?: string;
  profile_photo?: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'RETIRED';
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  employee_id?: string;
  designation?: string;
  role: UserRole;
  college?: string;
  college_name?: string;
  college_logo?: string | null;
  department?: string;
  department_name?: string;
  avatar?: string | null;
  bio?: string;
  is_active: boolean;
  is_email_verified: boolean;
  faculty_profile?: FacultyProfile | null;
}

export interface PublicDepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface PublicCollegeOption {
  id: string;
  name: string;
  short_name?: string;
  code: string;
  city?: string;
  state?: string;
  departments: PublicDepartmentOption[];
}

export interface FacultyRegisterPayload {
  college: string;
  department: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string;
  designation?: string;
  phone?: string;
  password: string;
  confirm_password: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  degree: string;
  duration_years: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  department: string;
  department_name?: string;
  college?: string;
  college_name?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  college?: string;
  faculty_count?: number;
  hod_details?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  incharge_details?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
  college: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  model_name: string;
  object_id?: string;
  object_repr?: string;
  comment?: string;
  ip_address?: string;
  created_at: string;
}

export type ActivityType =
  | 'FDP'
  | 'WORKSHOP'
  | 'SEMINAR'
  | 'CONFERENCE'
  | 'CERTIFICATION'
  | 'PUBLICATION'
  | 'RESEARCH'
  | 'TRAINING'
  | 'ACHIEVEMENT'
  | 'AWARD'
  | 'OTHER';

export type ActivityStatus =
  | 'DRAFT'
  | 'PENDING_INCHARGE'
  | 'INCHARGE_VERIFIED'
  | 'PENDING_HOD'
  | 'HOD_APPROVED'
  | 'PENDING_IQAC'
  | 'IQAC_VERIFIED'
  | 'VERIFIED_EVIDENCE'
  | 'RETURNED_TO_FACULTY'
  | 'RETURNED_TO_INCHARGE'
  | 'REJECTED_INCHARGE'
  | 'REJECTED_HOD'
  | 'REJECTED_IQAC';

export interface ActivityCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  college?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface Document {
  id: string;
  activity: string;
  file: string;
  file_name: string;
  original_filename?: string;
  file_size: number;
  mime_type: string;
  file_hash?: string;
  category?: string;
  category_name?: string;
  category_code?: string;
  description?: string;
  version?: number;
  is_current?: boolean;
  is_primary: boolean;
  status: 'ACTIVE' | 'DELETED' | 'ARCHIVED';
  preview_url: string;
  download_url: string;
  uploaded_at: string;
}

export type NotificationCategory =
  | 'VERIFICATION'
  | 'EVIDENCE'
  | 'DATA_REQUEST'
  | 'METRIC'
  | 'AQAR'
  | 'SSR'
  | 'TASK'
  | 'DEADLINE'
  | 'REPORT'
  | 'AI'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category?: NotificationCategory;
  notification_type: string;
  priority?: NotificationPriority;
  is_read: boolean;
  read_at?: string | null;
  action_url?: string;
  action_label?: string;
  related_model?: string;
  related_id?: string;
  deduplication_key?: string;
  metadata?: Record<string, any>;
  sender_name?: string;
  recipient_name?: string;
  created_at: string;
}

export interface Activity {
  id: string;
  title: string;
  activity_type?: ActivityType;
  category?: string;
  category_name?: string;
  category_code?: string;
  organizer?: string;
  venue?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  duration_days?: number;
  duration_hours?: number;
  description?: string;
  additional_remarks?: string;
  is_online: boolean;
  certificate_number?: string;
  status: ActivityStatus;
  last_rejection_reason?: string;
  last_rejected_by_role?: string;
  last_rejected_at?: string;
  is_editable?: boolean;
  is_verified?: boolean;
  documents?: Document[];
  faculty_name: string;
  faculty_email?: string;
  faculty_employee_id?: string;
  department_name?: string;
  academic_year_name?: string;
  verification_details?: any;
  created_at: string;
  updated_at: string;
}

export interface VerificationLog {
  id: string;
  actor_name: string;
  role: string;
  action: string;
  previous_status: string;
  new_status: string;
  comment: string;
  created_at: string;
}

export interface VerificationRecord {
  id: string;
  activity: string;
  activity_details: Activity;
  current_status: ActivityStatus;
  incharge_verified_at?: string;
  incharge_comment?: string;
  hod_approved_at?: string;
  hod_comment?: string;
  iqac_verified_at?: string;
  iqac_comment?: string;
  logs: VerificationLog[];
  created_at: string;
}

export type CollegeStatus = 'SETUP' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
export type SubscriptionStatusType = SubscriptionStatus;
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type BillingCycleType = BillingCycle;

export interface Plan {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_departments: number;
  max_faculty: number;
  storage_limit_gb: number;
  ai_processing_limit: number;
  max_reports_monthly: number;
  max_academic_years: number;
  max_api_requests_monthly?: number;
  currency?: string;
  is_custom_enterprise?: boolean;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  college: string;
  college_name?: string;
  college_code?: string;
  plan: string;
  plan_details?: Plan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  start_date: string;
  current_period_start: string;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
  cancelled_at?: string | null;
  cancel_at_period_end?: boolean;
  auto_renew: boolean;
  grace_period_days?: number;
  pause_start?: string | null;
  pause_end?: string | null;
  provider?: string;
  customer_id?: string;
  subscription_id?: string;
  is_trial?: boolean;
  trial_days_remaining?: number;
  is_in_grace_period?: boolean;
  is_restricted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantUsageSummary {
  college_id: string;
  college_name: string;
  plan: string;
  storage: {
    used_gb: number;
    limit_gb: number;
    percentage: number;
    is_near_limit: boolean;
    is_exceeded: boolean;
  };
  ai_processing: {
    used: number;
    limit: number;
    percentage: number;
    is_near_limit: boolean;
    is_exceeded: boolean;
  };
  users: {
    used: number;
    limit: number;
    percentage: number;
    is_near_limit: boolean;
    is_exceeded: boolean;
  };
  reports: {
    used: number;
    limit: number;
    percentage: number;
    is_near_limit: boolean;
    is_exceeded: boolean;
  };
  evidence_count: number;
  departments_count: number;
  tasks_count: number;
  last_updated?: string;
}

export interface College {
  id: string;
  name: string;
  short_name?: string;
  code: string;
  institution_code?: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  university_affiliation?: string;
  contact_email?: string;
  contact_phone?: string;
  logo?: string | null;
  accreditation_type: string;
  naac_grade?: string;
  established_year?: number;
  subscription_plan: string;
  status?: CollegeStatus;
  is_active: boolean;
  setup_step?: number;
  setup_completed?: boolean;
  academic_year_format?: string;
  date_format?: string;
  timezone?: string;
  default_report_format?: string;
  branding_config?: {
    primary_color?: string;
    secondary_color?: string;
    report_header?: string;
    report_footer?: string;
    contact_details?: string;
    [key: string]: any;
  };
  document_settings?: Record<string, any>;
  notification_settings?: Record<string, any>;
  ai_settings?: Record<string, any>;
  framework_settings?: Record<string, any>;
  departments_count?: number;
  faculty_count?: number;
  active_subscription?: Subscription | null;
  usage_summary?: TenantUsageSummary;
}

export interface TenantFeatureFlag {
  id: string;
  college: string;
  feature_key: string;
  is_enabled: boolean;
  reason?: string;
  created_at?: string;
}

export interface UserInvitation {
  id: string;
  college: string;
  email: string;
  role: UserRole;
  department?: string;
  department_name?: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  invited_by?: string;
  invited_by_name?: string;
  expires_at: string;
  accepted_at?: string | null;
  is_expired: boolean;
  created_at: string;
}

export interface SystemHealthData {
  overall_status: string;
  timestamp: string;
  database: {
    engine: string;
    status: string;
    latency_ms: number;
  };
  storage: {
    status: string;
    total_gb: number;
    free_gb: number;
    used_pct: number;
  };
  ai_provider: {
    provider: string;
    status: string;
    latency_ms: number;
  };
  workers: {
    status: string;
    active_workers: number;
    tasks_queued: number;
  };
  platform_counts: {
    total_colleges: number;
    active_colleges: number;
    suspended_colleges: number;
    total_users: number;
    total_evidence: number;
  };
}

export interface SubscriptionDashboardData {
  total_colleges: number;
  active_subscriptions: number;
  trial_colleges: number;
  past_due_colleges: number;
  suspended_colleges: number;
  mrr: number;
  arr: number;
  plan_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  college: string;
  college_name?: string;
  department: string;
  department_name: string;
  department_code: string;
  faculty: string;
  faculty_name: string;
  faculty_email: string;
  faculty_employee_id: string;
  faculty_designation?: string;
  academic_year: string;
  academic_year_name: string;
  activity: string;
  activity_details?: {
    id: string;
    activity_type?: string;
    start_date?: string;
    end_date?: string;
    duration?: string;
    organizer?: string;
    location?: string;
    certificate_number?: string;
    is_online?: boolean;
    additional_remarks?: string;
  };
  document?: string;
  document_details?: Document;
  supporting_documents?: Document[];
  is_verified: boolean;
  verified_at: string;
  status: 'ACTIVE' | 'ARCHIVED';
  archived_at?: string;
  archived_by?: string;
  archived_by_name?: string;
  archive_reason?: string;
  verification_timeline?: Array<{
    actor_name: string;
    role: string;
    action: string;
    comment: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface EvidenceDepartmentBreakdown {
  id: string;
  name: string;
  code: string;
  count: number;
}

export interface EvidenceCategoryBreakdown {
  category: string;
  count: number;
}

export interface EvidenceYearComparison {
  year: string;
  count: number;
}

export interface EvidenceStats {
  total_verified: number;
  current_year_verified: number;
  total_departments: number;
  total_categories: number;
  department_breakdown: EvidenceDepartmentBreakdown[];
  category_breakdown: EvidenceCategoryBreakdown[];
  year_comparison: EvidenceYearComparison[];
}

export interface EvidenceFilterParams {
  search?: string;
  academic_year?: string;
  department?: string;
  category?: string;
  faculty?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  date_from?: string;
  date_to?: string;
  organizer?: string;
}

export interface AnalyticsData {
  total_faculty: number;
  total_activities: number;
  total_departments: number;
  status_summary: {
    draft: number;
    pending_incharge: number;
    incharge_verified: number;
    pending_hod: number;
    hod_approved: number;
    pending_iqac: number;
    verified_evidence: number;
    rejected: number;
  };
  activity_types: Array<{ activity_type: string; count: number }>;
}

// ==========================================
// PHASE 5: IQAC CRITERIA & EVIDENCE MAPPING
// ==========================================

export interface Framework {
  id: string;
  name: string;
  code: string;
  version: string;
  description: string;
  is_active: boolean;
  college?: string;
  college_name?: string;
  criteria_count: number;
  created_at: string;
  updated_at: string;
}

export interface Criterion {
  id: string;
  number: string;
  title: string;
  description: string;
  weightage: number;
  framework: string;
  framework_ref?: string;
  framework_name?: string;
  display_order: number;
  metrics_count: number;
  is_active: boolean;
  metrics?: Metric[];
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  number: string;
  title: string;
  description: string;
  weightage: number;
  benchmark_count: number;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  criterion: string;
  criterion_number?: string;
  criterion_title?: string;
  requirements_count: number;
  active_mappings_count: number;
  requirements?: EvidenceRequirement[];
  created_at: string;
  updated_at: string;
}

export interface EvidenceRequirement {
  id: string;
  metric: string;
  name: string;
  document_category?: string;
  document_category_name?: string;
  required_count: number;
  is_mandatory: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceMapping {
  id: string;
  evidence: string;
  evidence_title: string;
  evidence_category: string;
  faculty_name: string;
  faculty_employee_id: string;
  department_name: string;
  department_code: string;
  academic_year_name: string;
  criterion: string;
  criterion_number: string;
  criterion_title: string;
  metric: string;
  metric_number: string;
  metric_title: string;
  status: 'ACTIVE' | 'ARCHIVED';
  notes: string;
  mapped_by?: string;
  mapped_by_name?: string;
  mapped_at: string;
  archived_at?: string;
  archived_by_name?: string;
  archive_reason?: string;
}

export interface CriterionProgressSummary {
  id: string;
  number: string;
  title: string;
  weightage: number;
  metrics_count: number;
  metrics_with_evidence: number;
  evidence_count: number;
  availability_percentage: number;
  status: 'NO_EVIDENCE' | 'PARTIAL' | 'AVAILABLE' | 'COMPLETE';
}

export interface CriteriaProgressStats {
  total_criteria: number;
  total_metrics: number;
  metrics_with_evidence: number;
  metrics_without_evidence: number;
  total_evidence_mapped: number;
  overall_availability_percentage: number;
  criteria: CriterionProgressSummary[];
}

export interface MetricProgressDetail {
  id: string;
  number: string;
  title: string;
  description: string;
  weightage: number;
  benchmark_count: number;
  evidence_count: number;
  progress_percentage: number;
  status: 'NO_EVIDENCE' | 'PARTIAL' | 'AVAILABLE' | 'COMPLETE';
  requirements: Array<{
    id: string;
    name: string;
    required_count: number;
    is_mandatory: boolean;
    description: string;
  }>;
}

export interface CriterionProgressDetail {
  criterion_id: string;
  criterion_number: string;
  criterion_title: string;
  total_metrics: number;
  metrics_with_evidence: number;
  total_evidence_count: number;
  overall_availability_percentage: number;
  status: 'NO_EVIDENCE' | 'PARTIAL' | 'AVAILABLE' | 'COMPLETE';
  metrics: MetricProgressDetail[];
}

export interface DepartmentContribution {
  id: string;
  name: string;
  code: string;
  count: number;
}

export interface FacultyContribution {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  count: number;
}

export interface AcademicYearContribution {
  id: string;
  year: string;
  count: number;
}

export interface MetricContributions {
  metric_id: string;
  metric_number: string;
  metric_title: string;
  total_evidence_count: number;
  department_contributions: DepartmentContribution[];
  faculty_contributions: FacultyContribution[];
  academic_year_contributions: AcademicYearContribution[];
}

export interface EvidenceSuggestion {
  id: string;
  title: string;
  category: string;
  faculty_name: string;
  faculty_employee_id: string;
  department_name: string;
  department_code: string;
  academic_year_name: string;
  verified_at: string;
  document_name?: string;
  match_reasons: string[];
}

// ─── Phase 6: Automated Report Generation Engine Types ─────────────────────────

export type ReportOutputFormat = 'PDF' | 'EXCEL' | 'WORD';
export type GeneratedReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

export interface ReportType {
  id: string;
  name: string;
  code: string;
  description: string;
  default_format: ReportOutputFormat;
  category_code?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplateVersion {
  id: string;
  version_number: number;
  file: string;
  change_summary: string;
  created_by_name: string;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  college?: string;
  report_type: string;
  report_type_name: string;
  report_type_code: string;
  name: string;
  file_format: ReportOutputFormat;
  file?: string;
  version: number;
  is_active: boolean;
  versions?: ReportTemplateVersion[];
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  college: string;
  college_name: string;
  report_type: string;
  report_type_name: string;
  report_type_code: string;
  template?: string;
  template_name?: string;
  template_version: number;
  title: string;
  academic_year?: string;
  academic_year_name?: string;
  department?: string;
  department_name?: string;
  faculty?: string;
  faculty_name?: string;
  category?: string;
  category_name?: string;
  criterion?: string;
  metric?: string;
  filters_applied: Record<string, any>;
  record_count: number;
  output_format: ReportOutputFormat;
  status: GeneratedReportStatus;
  file?: string;
  file_size: number;
  error_message?: string;
  generated_by_name: string;
  generated_by_email: string;
  generated_at: string;
  archived_at?: string;
  archived_by_name?: string;
  archive_reason?: string;
}

export interface ReportPreviewMeta {
  title: string;
  report_type_code: string;
  report_type_name: string;
  academic_year: string;
  department: string;
  generated_by: string;
  generated_by_email: string;
  generated_at: string;
  total_records: number;
  filters_applied: Record<string, any>;
}

export interface ReportPreviewRecord {
  sl_no: number;
  id: string;
  faculty_name: string;
  faculty_email: string;
  employee_id: string;
  designation: string;
  department_name: string;
  department_code: string;
  activity_title: string;
  category_name: string;
  activity_type: string;
  start_date: string;
  end_date: string;
  date_range: string;
  organizer: string;
  venue: string;
  duration: string;
  is_online: string;
  certificate_number: string;
  status: string;
  verified_status: string;
}

export interface ReportPreviewData {
  college: {
    id: string;
    name: string;
    code: string;
    logo_url?: string;
    address?: string;
  };
  meta: ReportPreviewMeta;
  sample_records: ReportPreviewRecord[];
  total_records: number;
  page: number;
  page_size: number;
}

export interface ReportFilterParams {
  report_type: string;
  academic_year?: string;
  department?: string;
  faculty?: string;
  category?: string;
  criterion?: string;
  metric?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  template?: string;
  output_format?: ReportOutputFormat;
}

// ─── Phase 7 AI Types ───────────────────────────────────────────────────────
export type AIProcessingStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'REVIEW_REQUIRED'
  | 'CONFIRMED'
  | 'FAILED';

export type AIDocumentType =
  | 'CERTIFICATE'
  | 'PARTICIPATION'
  | 'COMPLETION'
  | 'APPOINTMENT_LETTER'
  | 'AWARD'
  | 'PUBLICATION_PROOF'
  | 'RESEARCH_DOCUMENT'
  | 'EVENT_DOCUMENT'
  | 'OTHER_EVIDENCE';

export interface AIFieldConfidenceItem {
  field_name: string;
  value: string;
  confidence: number;
  is_detected: boolean;
}

export interface AIClassificationResultData {
  suggested_category?: string | null;
  suggested_code: string;
  suggested_name?: string;
  confidence: number;
  alternative_categories: Array<{ id: string; code: string; name: string; confidence: number }>;
  explanation?: string;
}

export interface AIExtractionResultData {
  ai_document_type: AIDocumentType;
  raw_text: string;
  extracted_data: Record<string, { value: string | null; confidence: number; detected: boolean }>;
  overall_confidence: number;
}

export interface AIProcessingJob {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  status: AIProcessingStatus;
  provider: string;
  model_name: string;
  execution_time_ms: number;
  error_message?: string;
  extraction_result?: AIExtractionResultData;
  classification_result?: AIClassificationResultData;
  field_confidences?: AIFieldConfidenceItem[];
  activity?: string;
  document?: string;
  created_at: string;
  updated_at: string;
}

export interface AIDuplicateMatch {
  type: string;
  activity_id?: string;
  document_id?: string;
  activity_title: string;
  certificate_number?: string;
  faculty_name?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  created_at?: string;
  status?: string;
}

export interface AIDuplicateInfo {
  is_exact_duplicate: boolean;
  is_possible_duplicate: boolean;
  has_duplicate_warning: boolean;
  warning?: string;
  exact_matches: AIDuplicateMatch[];
  fuzzy_matches: AIDuplicateMatch[];
}

export interface AIMetrics {
  total_processed: number;
  successfully_processed: number;
  confirmed_count: number;
  failed_count: number;
  success_rate: number;
  average_processing_time_ms: number;
  top_corrected_fields: Array<{ field_name: string; count: number }>;
}

export interface AISearchResultItem {
  id: string;
  activity_id: string;
  title: string;
  faculty_name: string;
  department: string;
  academic_year: string;
  category: string;
  organizer: string;
  start_date?: string | null;
  certificate_number?: string;
  is_verified: boolean;
  has_document: boolean;
}

export interface AISearchResponse {
  query: string;
  parsed_filters: {
    keyword?: string | null;
    category_code?: string | null;
    department_code?: string | null;
    academic_year_name?: string | null;
    faculty_name?: string | null;
    metric_code?: string | null;
    confidence: number;
    explanation: string;
  };
  results: AISearchResultItem[];
  total: number;
  explanation: string;
}

// ─── Phase 8: AQAR / SSR Intelligence & Compliance Workspace Types ────────────

export type ComplianceWorkspaceType = 'AQAR' | 'SSR';
export type ComplianceNarrativeStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'REVISION_REQUIRED' | 'APPROVED' | 'LOCKED';
export type DataRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DataRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'CLOSED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface Section {
  id: string;
  name: string;
  code: string;
  description: string;
  display_order: number;
  is_active: boolean;
  criteria_count?: number;
}

export interface MetricNeedsAttention {
  id: string;
  number: string;
  title: string;
  criterion_number: string;
  criterion_title: string;
  status: 'PARTIAL' | 'MISSING';
  evidence_count: number;
  benchmark_count: number;
  missing_count: number;
  weightage: number;
}

export interface CriteriaProgressItem {
  id: string;
  number: string;
  title: string;
  description: string;
  weightage: number;
  total_metrics: number;
  completed: number;
  partial: number;
  missing: number;
  evidence_count: number;
  progress_percentage: number;
  section_name?: string;
}

export interface SectionProgressItem {
  id: string;
  name: string;
  code: string;
  total_metrics: number;
  completed: number;
  partial: number;
  missing: number;
  evidence_count: number;
  progress_percentage: number;
}

export interface AQARDashboardData {
  workspace: 'AQAR';
  academic_year: {
    id: string | null;
    name: string;
  };
  framework: {
    id: string | null;
    name: string;
    version: string;
  };
  progress: {
    overall_completeness_percentage: number;
    total_metrics: number;
    completed_metrics_count: number;
    partial_metrics_count: number;
    missing_metrics_count: number;
    total_evidence_mapped: number;
    criteria_progress: CriteriaProgressItem[];
    sections_progress: SectionProgressItem[];
    needs_attention: MetricNeedsAttention[];
  };
  checklist_summary: {
    total_tasks: number;
    completed_tasks: number;
    completion_percentage: number;
  };
  open_data_requests_count: number;
  narrative_counts: {
    draft: number;
    ready_for_review: number;
    approved: number;
  };
}

export interface SSRDashboardData {
  workspace: 'SSR';
  cycle: string;
  framework: {
    id: string | null;
    name: string;
    version: string;
  };
  progress: {
    overall_completeness_percentage: number;
    total_metrics: number;
    completed_metrics_count: number;
    partial_metrics_count: number;
    missing_metrics_count: number;
    total_evidence_mapped: number;
    criteria_progress: CriteriaProgressItem[];
    sections_progress: SectionProgressItem[];
    needs_attention: MetricNeedsAttention[];
  };
  narrative_readiness: {
    total_metrics: number;
    approved_narratives: number;
    under_review: number;
    draft_narratives: number;
    missing_narratives: number;
    readiness_percentage: number;
  };
}

export interface ComplianceNarrativeVersion {
  id: string;
  version_number: number;
  narrative_text: string;
  status: string;
  edited_by: string;
  edited_by_name: string;
  change_reason: string;
  created_at: string;
}

export interface ComplianceNarrative {
  id: string;
  workspace_type: ComplianceWorkspaceType;
  college: string;
  academic_year: string;
  metric: string;
  metric_number: string;
  metric_title: string;
  narrative_text: string;
  status: ComplianceNarrativeStatus;
  author: string;
  author_name: string;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  is_ai_drafted: boolean;
  ai_model?: string;
  version: number;
  source_evidence: string[];
  source_evidence_count: number;
  review_comments?: string;
  versions?: ComplianceNarrativeVersion[];
  created_at: string;
  updated_at: string;
}

export interface DataRequest {
  id: string;
  college: string;
  workspace_type: ComplianceWorkspaceType;
  metric: string;
  metric_number: string;
  metric_title: string;
  academic_year: string;
  department?: string | null;
  department_name?: string;
  assigned_to?: string | null;
  assigned_to_name?: string;
  requested_by: string;
  requested_by_name: string;
  title: string;
  description: string;
  required_evidence_type?: string;
  due_date?: string | null;
  priority: DataRequestPriority;
  status: DataRequestStatus;
  response_evidence?: string | null;
  response_evidence_title?: string;
  submission_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PreparationTask {
  id: string;
  college: string;
  workspace_type: ComplianceWorkspaceType;
  academic_year: string;
  title: string;
  description: string;
  owner?: string | null;
  owner_name?: string;
  department?: string | null;
  department_name?: string;
  metric?: string | null;
  metric_number?: string;
  due_date?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  is_system_item: boolean;
  display_order: number;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface GapAnalysisItem {
  metric_id: string;
  metric_number: string;
  metric_title: string;
  criterion_number: string;
  criterion_title: string;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  evidence_available_count: number;
  benchmark_count: number;
  contributing_departments: string[];
  available_requirements: Array<{
    name: string;
    required_count: number;
    available_count: number;
    is_mandatory: boolean;
  }>;
  missing_requirements: Array<{
    name: string;
    required_count: number;
    available_count: number;
    missing_count: number;
    is_mandatory: boolean;
  }>;
  suggested_action: string;
}

export interface DepartmentComplianceStats {
  id: string;
  name: string;
  code: string;
  evidence_count: number;
  metrics_supported_count: number;
  coverage_percentage: number;
}

export interface SourceTraceItem {
  mapping_id: string;
  mapped_at: string;
  mapped_by: string;
  mapping_notes: string;
  evidence: {
    id: string;
    title: string;
    category: string;
    is_verified: boolean;
    verified_at?: string | null;
  };
  activity: {
    id?: string | null;
    title: string;
    category: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
    duration?: string;
    organizer?: string;
  };
  faculty: {
    id: string;
    name: string;
    employee_id: string;
    email: string;
    department: string;
  };
  document?: {
    id?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    file_hash?: string;
  } | null;
}

export interface MetricTraceabilityResponse {
  metric_id: string;
  metric_number: string;
  metric_title: string;
  criterion_number: string;
  criterion_title: string;
  total_sources_count: number;
  sources: SourceTraceItem[];
}

// ─── Phase 9: Advanced Analytics & Executive Intelligence Types ────────────────

export interface ExecutiveKPIs {
  total_faculty: number;
  total_departments: number;
  total_activities: number;
  verified_evidence: number;
  pending_evidence: number;
  aqar_completeness_pct: number;
  ssr_completeness_pct: number;
  data_quality_score: number;
  preparation_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  pipeline_bottleneck_count: number;
}

export interface AIInsight {
  id: string;
  title: string;
  category: 'GROWTH' | 'BOTTLENECK' | 'GAP' | 'RISK' | 'QUALITY' | 'RECOMMENDATION';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  narrative: string;
  time_period: string;
  source_metrics: Record<string, any>;
  recommended_action: string;
  is_active: boolean;
  created_at: string;
}

export interface ExecutiveAnalyticsResponse {
  academic_year: string;
  kpis: ExecutiveKPIs;
  evidence_distribution: {
    verified: number;
    pending: number;
    unmapped: number;
  };
  top_contributing_departments: Array<{
    id: string;
    name: string;
    code: string;
    verified_count: number;
  }>;
  active_ai_insights: AIInsight[];
  growth_trend_preview: {
    previous_year: number;
    current_year: number;
    growth_rate_pct: number;
  };
  preparation_risk: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
    factors: string[];
    recommendation: string;
  };
  is_monitoring_only: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  avg_latency_days: number;
  sla_days: number;
  is_delayed: boolean;
}

export interface BottleneckAlert {
  stage: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  pending_count: number;
  avg_days: number;
}

export interface VerificationPipelineData {
  total_pending: number;
  pipeline_stages: PipelineStage[];
  bottlenecks: BottleneckAlert[];
  rejection_rate_pct: number;
  return_rate_pct: number;
}

export interface AcademicYearComparisonItem {
  year_id: string;
  year_name: string;
  is_current: boolean;
  activities_count: number;
  verified_evidence_count: number;
  aqar_completeness_pct: number;
  ssr_completeness_pct: number;
  growth_rate_pct: number | null;
}

export interface DepartmentBenchmarkItem {
  id: string;
  name: string;
  code: string;
  faculty_count: number;
  total_activities: number;
  verified_evidence: number;
  pending_submissions: number;
  evidence_per_faculty: number;
  avg_turnaround_days: number;
  aqar_readiness_pct: number;
}

export interface FacultyParticipationData {
  total_faculty: number;
  total_activities: number;
  verified_activities: number;
  pending_activities: number;
  categories_breakdown: Record<string, number>;
  faculty_records: Array<{
    id: string;
    name: string;
    employee_id: string;
    department: string;
    designation: string;
    activity_count: number;
    verified_count: number;
  }>;
}

export interface EvidenceHealthData {
  total_documents: number;
  verified_documents: number;
  unmapped_evidence_count: number;
  metadata_completeness_pct: number;
  duplicate_candidates_count: number;
  orphan_documents_count: number;
  health_indicators: {
    duplicate_risk: 'LOW' | 'MEDIUM' | 'HIGH';
    mapping_health: 'GOOD' | 'ATTENTION' | 'CRITICAL';
    metadata_health: 'HEALTHY' | 'MODERATE' | 'POOR';
  };
}

export interface GapMatrixCell {
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
  count: number;
}

export interface GapMatrixDepartment {
  id: string;
  name: string;
  code: string;
}

export interface GapMatrixRow {
  metric_id: string;
  metric_number: string;
  metric_title: string;
  criterion_number: string;
  departments: Record<string, GapMatrixCell>;
}

export interface GapMatrixData {
  departments: GapMatrixDepartment[];
  matrix: GapMatrixRow[];
  summary: {
    total_metrics: number;
    total_departments: number;
    missing_cells: number;
    partial_cells: number;
    complete_cells: number;
  };
}

export interface DataQualityIssue {
  issue_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  record_id: string;
  record_type: string;
  description: string;
  faculty_name: string;
  department_name: string;
  suggested_fix: string;
}

export interface DataQualityReport {
  quality_score: number;
  total_issues: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  issues: DataQualityIssue[];
}

export interface ForecastData {
  has_sufficient_data: boolean;
  historical_points: Array<{ period: string; verified_count: number }>;
  forecast_points: Array<{ period: string; projected_count: number; lower_bound: number; upper_bound: number }>;
  target_date: string;
  target_evidence: number;
  projected_evidence_at_target: number;
  forecast_confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_DATA';
  disclaimer: string;
}

// ==========================================
// PHASE 10: NOTIFICATION & WORKFLOW TYPES
// ==========================================

export interface IQACTask {
  id: string;
  college: string;
  title: string;
  description: string;
  owner: string;
  owner_name?: string;
  owner_email?: string;
  creator: string;
  creator_name?: string;
  department?: string | null;
  department_name?: string;
  academic_year?: string | null;
  academic_year_code?: string;
  priority: TaskPriority;
  due_date: string;
  status: TaskStatus;
  related_metric?: string | null;
  metric_code?: string;
  metric_name?: string;
  related_evidence?: string | null;
  evidence_title?: string;
  related_data_request?: string | null;
  deduplication_key?: string;
  is_automated?: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  is_overdue?: boolean;
  activities_count?: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task: string;
  actor: string;
  actor_name?: string;
  actor_email?: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task: string;
  author: string;
  author_name?: string;
  author_email?: string;
  comment: string;
  created_at: string;
}

export interface NotificationPreference {
  id?: string;
  user?: string;
  channel_in_app: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  channel_whatsapp: boolean;
  channel_push: boolean;
  category_verification: boolean;
  category_tasks: boolean;
  category_deadlines: boolean;
  category_aqar_ssr: boolean;
  category_reports: boolean;
  category_system: boolean;
  updated_at?: string;
}

export interface NotificationTemplate {
  id: string;
  college?: string;
  code: string;
  title_template: string;
  body_template: string;
  action_url_template: string;
  action_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  college?: string;
  name: string;
  description?: string;
  trigger: string;
  condition: Record<string, any>;
  action: string;
  action_config: Record<string, any>;
  is_active: boolean;
  cooldown_hours: number;
  last_triggered_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDeadlineSummary {
  due_today: IQACTask[];
  due_tomorrow: IQACTask[];
  due_this_week: IQACTask[];
  overdue: IQACTask[];
  upcoming: IQACTask[];
}

export interface OperationalWorkQueueData {
  role: string;
  counts: {
    pending_verifications?: number;
    evidence_gaps?: number;
    data_requests?: number;
    narrative_reviews?: number;
    tasks?: number;
    overdue_tasks?: number;
    reports?: number;
    submissions?: number;
    returned?: number;
    verified?: number;
    drafts?: number;
    deadlines?: number;
    [key: string]: number | undefined;
  };
  pending_verifications?: any[];
  evidence_gaps?: any[];
  data_requests?: any[];
  narrative_reviews?: any[];
  tasks?: IQACTask[];
  overdue_tasks?: IQACTask[];
  reports?: any[];
  submissions?: any[];
  returned?: any[];
  verified?: any[];
  drafts?: any[];
  deadlines?: any[];
}

// Phase 14: Data Import, Integrations & Interoperability
export type ImportDataType = 'FACULTY' | 'ACTIVITIES' | 'EVIDENCE_METADATA' | 'DEPARTMENTS' | 'PROGRAMS' | 'ACADEMIC_YEARS';
export type ImportJobStatus = 'UPLOADED' | 'VALIDATING' | 'READY' | 'IMPORTING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED' | 'CANCELLED';
export type ImportMode = 'INSERT_ONLY' | 'INSERT_AND_UPDATE';

export interface ImportPreviewRow {
  row_number: number;
  raw_data: Record<string, any>;
  mapped_data: Record<string, any>;
  status: 'NEW' | 'DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'UPDATE' | 'INVALID';
  errors: Array<{ field: string; value: string; message: string; fix: string }>;
  warnings: string[];
}

export interface ImportErrorDetail {
  row: number;
  field: string;
  value: string;
  error: string;
  suggested_fix: string;
}

export interface ImportValidationResults {
  headers?: string[];
  sheet_names?: string[];
  sample_rows?: Array<Record<string, any>>;
  total_rows?: number;
  valid_rows?: number;
  warning_count?: number;
  error_count?: number;
  duplicate_count?: number;
  preview?: ImportPreviewRow[];
  error_details?: ImportErrorDetail[];
}

export interface ImportJob {
  id: string;
  college: string;
  college_name?: string;
  user: string;
  user_name?: string;
  data_type: ImportDataType;
  data_type_display?: string;
  file: string;
  original_filename: string;
  file_format: 'XLSX' | 'CSV';
  status: ImportJobStatus;
  status_display?: string;
  mode: ImportMode;
  column_mapping: Record<string, string>;
  reference_mapping: Record<string, string>;
  total_rows: number;
  valid_rows: number;
  warning_count: number;
  error_count: number;
  imported_count: number;
  validation_results?: ImportValidationResults;
  error_report_file?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ImportTemplate {
  id: string;
  college?: string;
  name: string;
  data_type: ImportDataType;
  column_mapping: Record<string, string>;
  reference_mapping: Record<string, string>;
  version: number;
  is_active: boolean;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string;
  college: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_by?: string;
  created_by_name?: string;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  raw_token?: string;
  warning?: string;
}

export interface WebhookEndpoint {
  id: string;
  college: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpoint: string;
  endpoint_url?: string;
  event: string;
  payload: Record<string, any>;
  response_status?: number;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  attempt: number;
  error_message: string;
  created_at: string;
}

// ==========================================
// Phase 15: IQAC AI Copilot Types
// ==========================================

export type AICopilotConfidenceLevel = 'HIGH' | 'NEEDS_REVIEW' | 'NOT_ENOUGH_DATA';
export type AICopilotMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface AICopilotSource {
  type: string; // 'EVIDENCE' | 'METRIC' | 'ACTIVITY' | 'FACULTY' | 'DOCUMENT'
  id: string;
  title: string;
  department?: string;
  academic_year?: string;
  is_verified?: boolean;
  url: string;
}

export interface AICopilotSuggestedAction {
  label: string;
  action: string;
  url?: string;
  prompt?: string;
}

export interface AICopilotPendingAction {
  type: 'CREATE_TASK' | 'GENERATE_REPORT' | string;
  payload: Record<string, any>;
  prompt: string;
  status?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXECUTED';
}

export interface AICopilotFeedback {
  id?: string;
  message: string;
  user?: string;
  is_helpful: boolean;
  reason?: 'ACCURATE' | 'HALLUCINATION' | 'WRONG_ROLE_DATA' | 'POOR_EXPLANATION' | 'OTHER';
  comment?: string;
  created_at?: string;
}

export interface AICopilotMessage {
  id: string;
  conversation: string;
  role: AICopilotMessageRole;
  content: string;
  intent?: string;
  confidence_level?: AICopilotConfidenceLevel;
  sources?: AICopilotSource[];
  suggested_actions?: AICopilotSuggestedAction[];
  pending_action?: AICopilotPendingAction | null;
  action_confirmed?: boolean;
  model_used?: string;
  execution_time_ms?: number;
  tokens_used?: number;
  created_at: string;
  feedback?: AICopilotFeedback | null;
}

export interface AICopilotConversation {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

export interface AICopilotBenchmark {
  id: string;
  question: string;
  target_role: UserRole;
  expected_intent: string;
  description: string;
}

// ==========================================
// Phase 16: External Integrations & Communication Types
// ==========================================

export type EmailDeliveryStatusType = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
export type AnnouncementPriorityType = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementAudienceType = 'ENTIRE_COLLEGE' | 'DEPARTMENT' | 'ROLE' | 'ACADEMIC_YEAR';
export type SSOProtocolType = 'OIDC' | 'SAML' | 'GOOGLE' | 'MICROSOFT';
export type SSOStatusType = 'INACTIVE' | 'TESTING' | 'ACTIVE' | 'ERROR';
export type StorageProviderType = 'LOCAL' | 'S3' | 'AZURE' | 'GCS';
export type MigrationJobStatusType = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface EmailTemplate {
  id: string;
  college: string;
  name: string;
  event: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailDeliveryLog {
  id: string;
  college: string;
  recipient: string;
  subject: string;
  event: string;
  provider: string;
  status: EmailDeliveryStatusType;
  attempt_count: number;
  max_retries: number;
  provider_response?: string;
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

export interface Announcement {
  id: string;
  college: string;
  title: string;
  content: string;
  message?: string;
  priority: AnnouncementPriorityType;
  audience: AnnouncementAudienceType;
  audience_type?: AnnouncementAudienceType;
  department?: string;
  department_name?: string;
  target_role?: UserRole;
  academic_year?: string;
  academic_year_name?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SSOConfiguration {
  id: string;
  college: string;
  college_name?: string;
  domain: string;
  protocol: SSOProtocolType;
  status: SSOStatusType;
  issuer_url?: string;
  client_id: string;
  client_secret?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  enforce_sso: boolean;
  allow_password_fallback: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageMigrationJob {
  id: string;
  college: string;
  source_provider: StorageProviderType;
  target_provider: StorageProviderType;
  status: MigrationJobStatusType;
  total_files: number;
  migrated_files: number;
  failed_files: number;
  error_details?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface ServiceHealthItem {
  status: 'CONNECTED' | 'WARNING' | 'FAILED' | 'DISCONNECTED';
  provider: string;
  message?: string;
  details?: Record<string, any>;
}

export interface IntegrationHealth {
  overall_status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  services: {
    email: ServiceHealthItem;
    calendar: ServiceHealthItem;
    storage: ServiceHealthItem;
    webhooks: ServiceHealthItem;
    sso: ServiceHealthItem;
    api: ServiceHealthItem;
  };
  metrics: {
    active_webhooks: number;
    pending_retries: number;
    active_api_keys: number;
  };
}

// ==========================================
// PHASE 17: COMMERCIAL SAAS & BILLING TYPES
// ==========================================

export type InvoiceStatusType =
  | 'DRAFT'
  | 'OPEN'
  | 'PAID'
  | 'VOID'
  | 'UNCOLLECTIBLE'
  | 'REFUNDED';

export type PaymentStatusType = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type BillingTicketType =
  | 'PAYMENT_ISSUE'
  | 'BILLING_QUESTION'
  | 'INVOICE_QUERY'
  | 'PLAN_CHANGE_REQUEST'
  | 'OTHER';

export type BillingTicketStatusType = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Invoice {
  id: string;
  college: string;
  college_name: string;
  college_code: string;
  subscription?: string | null;
  plan_name?: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatusType;
  issue_date: string;
  due_date: string;
  paid_at?: string | null;
  provider_invoice_id?: string;
  provider: string;
  pdf_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  college: string;
  invoice: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: PaymentStatusType;
  payment_reference: string;
  provider: string;
  payment_method: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminFeatureOverride {
  id: string;
  college: string;
  college_name: string;
  feature_key: string;
  is_enabled: boolean;
  reason: string;
  valid_from: string;
  valid_until: string;
  created_by: string;
  created_by_name: string;
  is_active: boolean;
  is_currently_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingSupportTicket {
  id: string;
  college: string;
  college_name: string;
  ticket_type: BillingTicketType;
  subject: string;
  message: string;
  status: BillingTicketStatusType;
  invoice?: string | null;
  invoice_number?: string;
  created_by: string;
  created_by_name: string;
  assigned_to?: string | null;
  resolution_notes?: string;
  task?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotaMetricItem {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  warning_level: number | null;
  is_near_limit: boolean;
  is_exceeded: boolean;
}

export interface StorageQuotaMetricItem {
  used_gb: number;
  limit_gb: number;
  remaining_gb: number;
  percentage: number;
  warning_level: number | null;
  is_near_limit: boolean;
  is_exceeded: boolean;
}

export interface SoftWarning {
  resource: string;
  threshold: number;
  severity: 'info' | 'warning' | 'danger';
  message: string;
}

export interface BillingUsageSummary {
  college_id: string;
  college_name: string;
  plan: string;
  currency: string;
  storage: StorageQuotaMetricItem;
  ai_processing: QuotaMetricItem;
  faculty: QuotaMetricItem;
  departments: QuotaMetricItem;
  users: QuotaMetricItem;
  reports: QuotaMetricItem;
  soft_warnings: SoftWarning[];
  evidence_count: number;
  tasks_count: number;
  last_updated: string;
}

export interface TenantBillingInfo {
  college_id: string;
  college_name: string;
  college_code: string;
  subscription: Subscription | null;
  entitlements: Record<string, { enabled: boolean; source: string; is_restricted: boolean }>;
  usage: BillingUsageSummary;
  soft_warnings: SoftWarning[];
  is_in_grace_period: boolean;
  is_restricted: boolean;
  trial_days_remaining: number;
}

export interface RevenueAnalytics {
  has_sufficient_data: boolean;
  message: string;
  total_tenants: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  past_due_subscriptions: number;
  cancelled_subscriptions: number;
  paused_subscriptions: number;
  mrr: number;
  arr: number;
  currency: string;
  payment_success_rate: number;
  successful_payments_count: number;
  failed_payments_count: number;
  plan_distribution: Record<string, number>;
  churn_rate: number;
  calculated_at: string;
}

export interface ReconciliationAuditItem {
  subscription_id: string | null;
  college: string;
  local_status: string;
  provider_status: string;
  reconciliation_status: 'MATCH' | 'MISMATCH' | 'UNKNOWN';
  last_audited: string;
}

export interface ReconciliationReport {
  total_audited: number;
  matches: number;
  mismatches: number;
  unknowns: number;
  results: ReconciliationAuditItem[];
  audited_at: string;
}

