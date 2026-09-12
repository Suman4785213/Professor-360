import { apiClient } from './client';
import {
  IntegrationHealth,
  EmailDeliveryLog,
  EmailTemplate,
  Announcement,
  SSOConfiguration,
  StorageMigrationJob,
} from '../types';

export const integrationsApi = {
  // Health & Diagnostics
  getHealth: async (): Promise<IntegrationHealth> => {
    const res = await apiClient.get<IntegrationHealth>('/integrations/health/');
    return res.data;
  },

  // Email Delivery Logs
  getEmailLogs: async (params?: {
    status?: string;
    event?: string;
    recipient?: string;
    page?: number;
  }): Promise<{ results: EmailDeliveryLog[]; count: number }> => {
    const res = await apiClient.get('/integrations/email-logs/', { params });
    // DRF may return pagination { count, results } or plain array
    if (Array.isArray(res.data)) {
      return { results: res.data, count: res.data.length };
    }
    return res.data;
  },

  retryEmail: async (logId: string): Promise<{ success: boolean; message: string; log: EmailDeliveryLog }> => {
    const res = await apiClient.post(`/integrations/email-logs/${logId}/retry/`);
    return res.data;
  },

  // Email Templates
  getEmailTemplates: async (): Promise<EmailTemplate[]> => {
    const res = await apiClient.get('/integrations/email-templates/');
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  createEmailTemplate: async (data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const res = await apiClient.post<EmailTemplate>('/integrations/email-templates/', data);
    return res.data;
  },

  updateEmailTemplate: async (id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const res = await apiClient.patch<EmailTemplate>(`/integrations/email-templates/${id}/`, data);
    return res.data;
  },

  deleteEmailTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/email-templates/${id}/`);
  },

  // Announcements
  getAnnouncements: async (params?: {
    is_active?: boolean;
    audience?: string;
    priority?: string;
  }): Promise<Announcement[]> => {
    const res = await apiClient.get('/integrations/announcements/', { params });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  createAnnouncement: async (data: Partial<Announcement>): Promise<Announcement> => {
    const res = await apiClient.post<Announcement>('/integrations/announcements/', data);
    return res.data;
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
    const res = await apiClient.patch<Announcement>(`/integrations/announcements/${id}/`, data);
    return res.data;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/announcements/${id}/`);
  },

  // SSO Configuration
  getSSOConfig: async (): Promise<SSOConfiguration | null> => {
    try {
      const res = await apiClient.get<SSOConfiguration>('/integrations/sso/');
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  saveSSOConfig: async (data: Partial<SSOConfiguration>): Promise<SSOConfiguration> => {
    const res = await apiClient.post<SSOConfiguration>('/integrations/sso/', data);
    return res.data;
  },

  testSSOConfig: async (): Promise<{ success: boolean; message: string; details?: any }> => {
    const res = await apiClient.post('/integrations/sso/test/');
    return res.data;
  },

  // Storage Migration Jobs
  getStorageJobs: async (): Promise<StorageMigrationJob[]> => {
    const res = await apiClient.get('/integrations/storage-jobs/');
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  startStorageMigration: async (data: {
    source_provider: string;
    target_provider: string;
  }): Promise<StorageMigrationJob> => {
    const res = await apiClient.post<StorageMigrationJob>('/integrations/storage-jobs/', data);
    return res.data;
  },

  // Calendar Export
  getCalendarExportUrl: (scope: 'all' | 'tasks' | 'deadlines' = 'all'): string => {
    const token = localStorage.getItem('access_token');
    return `/api/v1/integrations/calendar/export/?scope=${scope}&token=${encodeURIComponent(token || '')}`;
  },

  downloadCalendarICS: async (scope: 'all' | 'tasks' | 'deadlines' = 'all'): Promise<Blob> => {
    const res = await apiClient.get('/integrations/calendar/export/', {
      params: { scope },
      responseType: 'blob',
    });
    return res.data;
  },
};
