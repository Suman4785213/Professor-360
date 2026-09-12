/**
 * Phase 18 — Support & Advanced Admin API Client
 */
import { apiClient } from './client';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  college: string;
  college_name: string;
  college_code: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  sla_status: 'ON_TIME' | 'AT_RISK' | 'BREACHED';
  subject: string;
  description: string;
  assigned_to?: string;
  assigned_to_name?: string;
  first_responded_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  first_response_due_at?: string;
  resolution_due_at?: string;
  comments_count: number;
  attachments_count: number;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket: string;
  author: string;
  author_name: string;
  author_role: string;
  author_email: string;
  is_internal: boolean;
  message: string;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket: string;
  uploaded_by: string;
  uploaded_by_name: string;
  file: string;
  file_url?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED' | 'CLOSED';
  description: string;
  affects_all_tenants: boolean;
  affected_tenants: string[];
  affected_tenants_names: string[];
  started_at: string;
  mitigated_at?: string;
  resolved_at?: string;
  resolution?: string;
  created_by_name?: string;
  created_at: string;
}

export interface KBArticle {
  id: string;
  category: string;
  category_name: string;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  view_count: number;
  created_by_name?: string;
  created_at: string;
}

export interface KBCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  articles: KBArticle[];
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  college?: string;
  college_name?: string;
  user_email: string;
  ip_address?: string;
  path?: string;
  details: Record<string, any>;
  resolved: boolean;
  created_at: string;
}

export interface BackgroundJob {
  id: string;
  job_type: 'AI' | 'REPORTS' | 'IMPORTS' | 'NOTIFICATIONS' | 'WEBHOOKS';
  title: string;
  tenant_name: string;
  college_id?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  error_message?: string;
  is_retryable: boolean;
}

export interface SystemHealthData {
  overall_status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  timestamp: string;
  services: Record<string, {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
    [key: string]: any;
  }>;
  platform_counts: {
    total_colleges: number;
    active_colleges: number;
    trial_colleges: number;
    suspended_colleges: number;
    total_users: number;
    total_evidence: number;
    open_support_tickets: number;
    failed_jobs: number;
  };
}

export const supportApi = {
  // Support Tickets
  getTickets: async (params?: Record<string, any>) => {
    const res = await apiClient.get('/tickets/', { params });
    return res.data.results || res.data;
  },

  getTicket: async (id: string) => {
    const res = await apiClient.get(`/tickets/${id}/`);
    return res.data;
  },

  createTicket: async (data: { category: string; priority: string; subject: string; description: string; attachment?: File; college_id?: string }) => {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('subject', data.subject);
    formData.append('description', data.description);
    if (data.attachment) {
      formData.append('attachment', data.attachment);
    }
    if (data.college_id) {
      formData.append('college_id', data.college_id);
    }
    const res = await apiClient.post('/tickets/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  addComment: async (ticketId: string, message: string, isInternal: boolean = false) => {
    const res = await apiClient.post(`/tickets/${ticketId}/comment/`, {
      message,
      is_internal: isInternal,
    });
    return res.data;
  },

  uploadAttachment: async (ticketId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/tickets/${ticketId}/attachment/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  assignTicket: async (ticketId: string, assignedToUserId: string) => {
    const res = await apiClient.post(`/tickets/${ticketId}/assign/`, {
      assigned_to: assignedToUserId,
    });
    return res.data;
  },

  resolveTicket: async (ticketId: string, resolutionNotes: string = '') => {
    const res = await apiClient.post(`/tickets/${ticketId}/resolve/`, {
      resolution_notes: resolutionNotes,
    });
    return res.data;
  },

  setWaitingForUser: async (ticketId: string) => {
    const res = await apiClient.post(`/tickets/${ticketId}/waiting-for-user/`);
    return res.data;
  },

  closeTicket: async (ticketId: string) => {
    const res = await apiClient.post(`/tickets/${ticketId}/close/`);
    return res.data;
  },

  // Incidents
  getIncidents: async () => {
    const res = await apiClient.get('/incidents/');
    return res.data.results || res.data;
  },

  createIncident: async (data: Partial<Incident>) => {
    const res = await apiClient.post('/incidents/', data);
    return res.data;
  },

  updateIncident: async (id: string, data: Partial<Incident>) => {
    const res = await apiClient.patch(`/incidents/${id}/`, data);
    return res.data;
  },

  // Knowledge Base
  getKBCategories: async () => {
    const res = await apiClient.get('/kb/categories/');
    return res.data.results || res.data;
  },

  getKBArticles: async (params?: Record<string, any>) => {
    const res = await apiClient.get('/kb/articles/', { params });
    return res.data.results || res.data;
  },

  recordKBArticleView: async (id: string) => {
    const res = await apiClient.post(`/kb/articles/${id}/view/`);
    return res.data;
  },

  // Security Events
  getSecurityEvents: async (params?: Record<string, any>) => {
    const res = await apiClient.get('/security/events/', { params });
    return res.data.results || res.data;
  },

  resolveSecurityEvent: async (id: string) => {
    const res = await apiClient.post(`/security/events/${id}/resolve/`);
    return res.data;
  },

  // Background Jobs
  getBackgroundJobs: async (params?: { job_type?: string; status?: string; limit?: number }) => {
    const res = await apiClient.get('/admin/jobs/', { params });
    return res.data.jobs || [];
  },

  retryBackgroundJob: async (jobType: string, jobId: string) => {
    const res = await apiClient.post('/admin/jobs/retry/', {
      job_type: jobType,
      job_id: jobId,
    });
    return res.data;
  },

  // Global Admin Search
  adminSearch: async (query: string) => {
    const res = await apiClient.get('/admin/search/', { params: { q: query } });
    return res.data;
  },

  // Maintenance Mode
  getMaintenanceMode: async () => {
    const res = await apiClient.get('/admin/maintenance/');
    return res.data;
  },

  setMaintenanceMode: async (enabled: boolean, reason?: string, durationMinutes?: number) => {
    const res = await apiClient.post('/admin/maintenance/', {
      enabled,
      reason,
      estimated_duration_minutes: durationMinutes,
    });
    return res.data;
  },

  // System Health
  getSystemHealthDetail: async (): Promise<SystemHealthData> => {
    const res = await apiClient.get('/admin/system-health/');
    return res.data;
  },
};
