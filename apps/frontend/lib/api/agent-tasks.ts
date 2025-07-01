/**
 * Agent Tasks API functions
 */
import { apiClient } from './client';
import type {
  AgentTask,
  AgentTaskStatus,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  AgentTaskListParams,
  AgentsStatusResponse,
  UserDocument,
  FeatureFlag
} from './types';

/**
 * Enhanced agent routes (with authentication)
 */
export const agentTasksApi = {
  // Document analysis with agent
  analyzeDocument: async (
    documentId: number,
    request: DocumentAnalysisRequest,
    enableAgents: boolean = true
  ): Promise<DocumentAnalysisResponse> => {
    const response = await apiClient.post(
      `/api/v1/agents/analyze-document/${documentId}?enable_agents=${enableAgents}`,
      request
    );
    return response.data;
  },

  // Get agent task status
  getTaskStatus: async (taskId: string): Promise<AgentTaskStatus> => {
    const response = await apiClient.get(`/api/v1/agents/tasks/${taskId}/status`);
    return response.data;
  },

  // Get user's agent tasks
  getUserTasks: async (params?: AgentTaskListParams): Promise<AgentTaskStatus[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status_filter) queryParams.append('status_filter', params.status_filter);
    if (params?.agent_type) queryParams.append('agent_type', params.agent_type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `/api/v1/agents/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // Get user's documents
  getUserDocuments: async (skip: number = 0, limit: number = 100): Promise<UserDocument[]> => {
    const response = await apiClient.get(
      `/api/v1/agents/my-documents?skip=${skip}&limit=${limit}`
    );
    return response.data.data;
  },

  // Agent health check
  getAgentHealth: async (): Promise<{
    status: string;
    user_id: number;
    user_email: string;
    agent_features: Record<string, boolean>;
    message: string;
  }> => {
    const response = await apiClient.get('/api/v1/agents/health');
    return response.data;
  },

  // Public agent routes (no authentication required)
  getAgentsStatus: async (): Promise<AgentsStatusResponse> => {
    const response = await apiClient.get('/agents');
    return response.data;
  },

  // Feature flags
  getFeatureFlags: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get('/feature-flags');
    return response.data.data;
  },

  getFeatureFlag: async (key: string): Promise<{ key: string; enabled: boolean; config: any }> => {
    const response = await apiClient.get(`/feature-flags/${key}`);
    return response.data.data;
  },

  // Public agent task status (for backward compatibility)
  getPublicTaskStatus: async (taskId: string): Promise<AgentTask> => {
    const response = await apiClient.get(`/agents/tasks/${taskId}`);
    return response.data.data;
  },

  // Public agent task results
  getPublicTaskResults: async (taskId: string): Promise<{
    status: string;
    message: string;
    data?: {
      results: any;
      confidence: number;
      duration_seconds: number;
    };
    error?: string;
  }> => {
    const response = await apiClient.get(`/agents/tasks/${taskId}/results`);
    return response.data;
  }
};

export default agentTasksApi;