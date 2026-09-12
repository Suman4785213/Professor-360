/**
 * Imports & Integrations API Client (Phase 14)
 */
import { apiClient } from './client';
import {
  ImportJob,
  ImportTemplate,
  APIKey,
  WebhookEndpoint,
  WebhookDeliveryLog,
  ImportDataType,
  ImportMode,
} from '../types';

export const importsApi = {
  // Import Jobs
  getJobs: async (): Promise<ImportJob[]> => {
    const res = await apiClient.get('/imports/jobs/');
    return res.data.results || res.data;
  },

  getJob: async (id: string): Promise<ImportJob> => {
    const res = await apiClient.get(`/imports/jobs/${id}/`);
    return res.data;
  },

  uploadFile: async (file: File, dataType: ImportDataType, mode: ImportMode = 'INSERT_ONLY'): Promise<ImportJob> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data_type', dataType);
    formData.append('mode', mode);

    const res = await apiClient.post('/imports/jobs/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  mapColumns: async (id: string, columnMapping: Record<string, string>, referenceMapping: Record<string, string> = {}, mode?: ImportMode): Promise<any> => {
    const res = await apiClient.post(`/imports/jobs/${id}/map/`, {
      column_mapping: columnMapping,
      reference_mapping: referenceMapping,
      mode,
    });
    return res.data;
  },

  validateJob: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/imports/jobs/${id}/validate/`);
    return res.data;
  },

  executeJob: async (id: string, mode?: ImportMode): Promise<any> => {
    const res = await apiClient.post(`/imports/jobs/${id}/execute/`, { mode });
    return res.data;
  },

  downloadErrorReport: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/imports/jobs/${id}/error-report/`, {
      responseType: 'blob',
    });
    return res.data;
  },

  downloadTemplate: async (dataType: ImportDataType, format: 'XLSX' | 'CSV' = 'XLSX'): Promise<Blob> => {
    const res = await apiClient.get(`/imports/templates/${dataType}/?format=${format}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  suggestAIMapping: async (headers: string[], dataType: ImportDataType): Promise<Record<string, string>> => {
    const res = await apiClient.post('/imports/ai-suggest-mapping/', {
      headers,
      data_type: dataType,
    });
    return res.data.suggestions || {};
  },

  // Saved Templates
  getSavedTemplates: async (): Promise<ImportTemplate[]> => {
    const res = await apiClient.get('/imports/saved-templates/');
    return res.data.results || res.data;
  },

  saveTemplate: async (data: Partial<ImportTemplate>): Promise<ImportTemplate> => {
    const res = await apiClient.post('/imports/saved-templates/', data);
    return res.data;
  },

  // Controlled Exports
  exportData: async (dataType: string, format: 'XLSX' | 'CSV' = 'XLSX', filters: Record<string, any> = {}): Promise<Blob> => {
    const res = await apiClient.post('/imports/export/', {
      data_type: dataType,
      format,
      filters,
    }, {
      responseType: 'blob',
    });
    return res.data;
  },

  // API Keys
  getAPIKeys: async (): Promise<APIKey[]> => {
    const res = await apiClient.get('/integrations/api-keys/');
    return res.data.results || res.data;
  },

  createAPIKey: async (data: { name: string; scopes: string[] }): Promise<APIKey & { raw_token?: string; warning?: string }> => {
    const res = await apiClient.post('/integrations/api-keys/', data);
    return res.data;
  },

  revokeAPIKey: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/api-keys/${id}/`);
  },

  // Webhooks
  getWebhooks: async (): Promise<WebhookEndpoint[]> => {
    const res = await apiClient.get('/integrations/webhooks/');
    return res.data.results || res.data;
  },

  createWebhook: async (data: { url: string; secret: string; events: string[] }): Promise<WebhookEndpoint> => {
    const res = await apiClient.post('/integrations/webhooks/', data);
    return res.data;
  },

  testWebhook: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/integrations/webhooks/${id}/test-ping/`);
    return res.data;
  },

  deleteWebhook: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/webhooks/${id}/`);
  },

  getWebhookLogs: async (): Promise<WebhookDeliveryLog[]> => {
    const res = await apiClient.get('/integrations/webhooks/logs/');
    return res.data.results || res.data;
  },
};
