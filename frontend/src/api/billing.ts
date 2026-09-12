import { apiClient } from './client';
import {
  TenantBillingInfo,
  Plan,
  BillingUsageSummary,
  Invoice,
  PaymentTransaction,
  BillingSupportTicket,
  RevenueAnalytics,
  AdminFeatureOverride,
  ReconciliationReport,
  BillingCycleType,
} from '../types';

export const billingApi = {
  // Tenant Billing Subscription & Entitlements
  getSubscription: async (collegeId?: string): Promise<TenantBillingInfo> => {
    const res = await apiClient.get<TenantBillingInfo>('/billing/subscription/', {
      params: collegeId ? { college_id: collegeId } : undefined,
    });
    return res.data;
  },

  // Plan List & Comparison
  getPlans: async (): Promise<{ current_plan_code: string | null; plans: Plan[] }> => {
    const res = await apiClient.get<{ current_plan_code: string | null; plans: Plan[] }>('/billing/plans/');
    return res.data;
  },

  // Usage Quotas & Soft Warnings
  getUsage: async (collegeId?: string): Promise<BillingUsageSummary> => {
    const res = await apiClient.get<BillingUsageSummary>('/billing/usage/', {
      params: collegeId ? { college_id: collegeId } : undefined,
    });
    return res.data;
  },

  // Invoices
  getInvoices: async (collegeId?: string): Promise<Invoice[]> => {
    const res = await apiClient.get('/billing/invoices/', {
      params: collegeId ? { college_id: collegeId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  getInvoicePDF: async (invoiceId: string): Promise<any> => {
    const res = await apiClient.get(`/billing/invoices/${invoiceId}/pdf/`);
    return res.data;
  },

  // Payments History
  getPayments: async (collegeId?: string): Promise<PaymentTransaction[]> => {
    const res = await apiClient.get('/billing/payments/', {
      params: collegeId ? { college_id: collegeId } : undefined,
    });
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  // Checkout Session
  createCheckout: async (payload: {
    plan_id?: string;
    plan_code?: string;
    billing_cycle: BillingCycleType;
  }): Promise<{ success: boolean; checkout_url: string; checkout_session_id: string }> => {
    const res = await apiClient.post('/billing/checkout/', payload);
    return res.data;
  },

  // Plan Upgrade / Safe Downgrade
  changePlan: async (payload: {
    plan_id?: string;
    plan_code?: string;
  }): Promise<{ success: boolean; message: string; warnings: any[]; subscription: any }> => {
    const res = await apiClient.post('/billing/change-plan/', payload);
    return res.data;
  },

  // Cancellation with data preservation
  cancelSubscription: async (immediate: boolean = false): Promise<{ success: boolean; message: string; subscription: any }> => {
    const res = await apiClient.post('/billing/cancel/', { immediate });
    return res.data;
  },

  // Pause / Resume / Reactivate
  pauseSubscription: async (): Promise<{ success: boolean; message: string; subscription: any }> => {
    const res = await apiClient.post('/billing/pause/');
    return res.data;
  },

  resumeSubscription: async (): Promise<{ success: boolean; message: string; subscription: any }> => {
    const res = await apiClient.post('/billing/resume/');
    return res.data;
  },

  reactivateSubscription: async (): Promise<{ success: boolean; message: string; subscription: any }> => {
    const res = await apiClient.post('/billing/reactivate/');
    return res.data;
  },

  // Support Tickets
  getSupportTickets: async (): Promise<BillingSupportTicket[]> => {
    const res = await apiClient.get('/billing/support/');
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  createSupportTicket: async (data: {
    ticket_type: string;
    subject: string;
    message: string;
    invoice?: string;
  }): Promise<BillingSupportTicket> => {
    const res = await apiClient.post<BillingSupportTicket>('/billing/support/', data);
    return res.data;
  },

  // Super Admin Platform Revenue Dashboard
  getAdminRevenueAnalytics: async (): Promise<RevenueAnalytics> => {
    const res = await apiClient.get<RevenueAnalytics>('/admin/billing/');
    return res.data;
  },

  // Super Admin Manual Feature Overrides
  getAdminOverrides: async (): Promise<AdminFeatureOverride[]> => {
    const res = await apiClient.get('/admin/billing/overrides/');
    return Array.isArray(res.data) ? res.data : (res.data.results || []);
  },

  createAdminOverride: async (data: {
    college: string;
    feature_key: string;
    is_enabled: boolean;
    reason: string;
    valid_until: string;
  }): Promise<AdminFeatureOverride> => {
    const res = await apiClient.post<AdminFeatureOverride>('/admin/billing/overrides/', data);
    return res.data;
  },

  revokeAdminOverride: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/billing/overrides/${id}/`);
  },

  // Subscription Reconciliation
  reconcileSubscriptions: async (): Promise<ReconciliationReport> => {
    const res = await apiClient.get<ReconciliationReport>('/admin/billing/reconcile/');
    return res.data;
  },
};
