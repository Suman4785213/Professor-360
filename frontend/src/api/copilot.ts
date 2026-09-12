/**
 * Phase 15: IQAC AI Copilot API Client
 * Connects frontend to the grounded, role-scoped institutional copilot.
 */
import { apiClient } from './client';
import {
  AICopilotConversation,
  AICopilotMessage,
  AICopilotFeedback,
  AICopilotBenchmark,
} from '../types';

export interface ChatResponse extends AICopilotMessage {}

export interface BenchmarkReport {
  college: string;
  total_benchmark_cases: number;
  passed_cases: number;
  accuracy_percentage: number;
  hallucination_incidents: number;
  governance_violations: number;
  results: {
    question: string;
    expected_intent: string;
    actual_intent: string;
    confidence: string;
    sources_count: number;
    passed: boolean;
    latency_ms: number;
  }[];
}

export const copilotApi = {
  // Send a message to Copilot (creates conversation if not provided)
  sendMessage: async (content: string, conversationId?: string): Promise<ChatResponse> => {
    const payload: { content: string; conversation_id?: string } = { content };
    if (conversationId) {
      payload.conversation_id = conversationId;
    }
    const res = await apiClient.post('/ai/copilot/chat/', payload);
    return res.data;
  },

  // List user conversations
  getConversations: async (): Promise<AICopilotConversation[]> => {
    const res = await apiClient.get('/ai/copilot/conversations/');
    return res.data.results || res.data;
  },

  // Retrieve single conversation details
  getConversation: async (id: string): Promise<AICopilotConversation> => {
    const res = await apiClient.get(`/ai/copilot/conversations/${id}/`);
    return res.data;
  },

  // Update conversation title or pin status
  updateConversation: async (
    id: string,
    data: { title?: string; is_pinned?: boolean }
  ): Promise<AICopilotConversation> => {
    const res = await apiClient.patch(`/ai/copilot/conversations/${id}/`, data);
    return res.data;
  },

  // Pin/unpin shortcut
  togglePinConversation: async (id: string): Promise<{ status: string; is_pinned: boolean }> => {
    const res = await apiClient.post(`/ai/copilot/conversations/${id}/pin/`);
    return res.data;
  },

  // Delete conversation
  deleteConversation: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai/copilot/conversations/${id}/`);
  },

  // Retrieve message history for a conversation
  getMessages: async (conversationId: string): Promise<AICopilotMessage[]> => {
    const res = await apiClient.get(`/ai/copilot/conversations/${conversationId}/messages/`);
    return res.data.results || res.data;
  },

  // Confirm or dismiss an AI proposed action (e.g. Create Task or Generate Report)
  confirmAction: async (
    messageId: string,
    confirm: boolean
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await apiClient.post('/ai/copilot/confirm-action/', {
      message_id: messageId,
      confirm,
    });
    return res.data;
  },

  // Submit user feedback on a message
  submitFeedback: async (
    messageId: string,
    isHelpful: boolean,
    reason?: 'ACCURATE' | 'HALLUCINATION' | 'WRONG_ROLE_DATA' | 'POOR_EXPLANATION' | 'OTHER',
    comment?: string
  ): Promise<{ id: string; status: string }> => {
    const res = await apiClient.post('/ai/copilot/feedback/', {
      message_id: messageId,
      is_helpful: isHelpful,
      reason,
      comment,
    });
    return res.data;
  },

  // Run or view evaluation benchmarks
  getBenchmarks: async (): Promise<BenchmarkReport> => {
    const res = await apiClient.get('/ai/copilot/benchmarks/');
    return res.data;
  },
};
