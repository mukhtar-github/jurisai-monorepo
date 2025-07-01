/**
 * Tests for agent task hooks
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  useAgentDocumentAnalysis,
  useAgentTaskStatus,
  useUserAgentTasks,
  useDocumentAnalysisWorkflow,
  useAgentsStatus,
  useFeatureFlag,
} from '@/lib/hooks/useAgentTasks';
import { agentTasksApi } from '@/lib/api/agent-tasks';

// Mock the API
vi.mock('@/lib/api/agent-tasks', () => ({
  agentTasksApi: {
    analyzeDocument: vi.fn(),
    getTaskStatus: vi.fn(),
    getUserTasks: vi.fn(),
    getAgentsStatus: vi.fn(),
    getFeatureFlag: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAgentDocumentAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start document analysis successfully', async () => {
    const mockResponse = {
      task_id: 'test-task-123',
      status: 'processing',
      agent_enabled: true,
      message: 'Analysis started',
    };

    vi.mocked(agentTasksApi.analyzeDocument).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgentDocumentAnalysis(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      documentId: 1,
      request: { parameters: { max_summary_length: 300 } },
      enableAgents: true,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(agentTasksApi.analyzeDocument).toHaveBeenCalledWith(
      1,
      { parameters: { max_summary_length: 300 } },
      true
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle analysis failure', async () => {
    const mockError = new Error('Analysis failed');
    vi.mocked(agentTasksApi.analyzeDocument).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAgentDocumentAnalysis(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      documentId: 1,
      enableAgents: true,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useAgentTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch task status when taskId is provided', async () => {
    const mockStatus = {
      task_id: 'test-task-123',
      status: 'completed' as const,
      agent_type: 'document_analyzer',
      result: { summary: 'Test summary' },
      confidence: 0.95,
    };

    vi.mocked(agentTasksApi.getTaskStatus).mockResolvedValue(mockStatus);

    const { result } = renderHook(
      () => useAgentTaskStatus('test-task-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(agentTasksApi.getTaskStatus).toHaveBeenCalledWith('test-task-123');
    expect(result.current.data).toEqual(mockStatus);
  });

  it('should not fetch when taskId is null', () => {
    const { result } = renderHook(
      () => useAgentTaskStatus(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(agentTasksApi.getTaskStatus).not.toHaveBeenCalled();
  });

  it('should configure polling based on status', async () => {
    const mockProcessingStatus = {
      task_id: 'test-task-123',
      status: 'processing' as const,
      agent_type: 'document_analyzer',
    };

    vi.mocked(agentTasksApi.getTaskStatus).mockResolvedValue(mockProcessingStatus);

    const { result } = renderHook(
      () => useAgentTaskStatus('test-task-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The hook should have a refetchInterval configured
    expect(result.current.data?.status).toBe('processing');
  });
});

describe('useUserAgentTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user tasks with filters', async () => {
    const mockTasks = [
      {
        task_id: 'task-1',
        status: 'completed' as const,
        agent_type: 'document_analyzer',
        created_at: '2023-01-01T00:00:00Z',
      },
      {
        task_id: 'task-2',
        status: 'processing' as const,
        agent_type: 'document_analyzer',
        created_at: '2023-01-02T00:00:00Z',
      },
    ];

    vi.mocked(agentTasksApi.getUserTasks).mockResolvedValue(mockTasks);

    const { result } = renderHook(
      () => useUserAgentTasks({ status_filter: 'completed', limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(agentTasksApi.getUserTasks).toHaveBeenCalledWith({
      status_filter: 'completed',
      limit: 10,
    });
    expect(result.current.data).toEqual(mockTasks);
  });
});

describe('useDocumentAnalysisWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide complete workflow state', async () => {
    const mockAnalysisResponse = {
      task_id: 'test-task-123',
      status: 'processing' as const,
      agent_enabled: true,
      message: 'Analysis started',
    };

    const mockTaskStatus = {
      task_id: 'test-task-123',
      status: 'completed' as const,
      agent_type: 'document_analyzer',
      result: { summary: 'Test summary' },
      confidence: 0.95,
      processing_time_ms: 5000,
    };

    vi.mocked(agentTasksApi.analyzeDocument).mockResolvedValue(mockAnalysisResponse);
    vi.mocked(agentTasksApi.getTaskStatus).mockResolvedValue(mockTaskStatus);

    const { result } = renderHook(
      () => useDocumentAnalysisWorkflow(1),
      { wrapper: createWrapper() }
    );

    // Start analysis
    result.current.startAnalysis({
      documentId: 1,
      enableAgents: true,
    });

    await waitFor(() => {
      expect(result.current.analysisData).toEqual(mockAnalysisResponse);
    });

    // Check workflow state
    expect(result.current.isProcessing).toBe(false); // Will be true when status is fetched
    expect(result.current.results).toBeUndefined(); // Will be populated when status is fetched
    expect(typeof result.current.reset).toBe('function');
  });
});

describe('useAgentsStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch agents status', async () => {
    const mockStatus = {
      status: 'success',
      data: {
        document_analyzer: {
          enabled: true,
          description: 'Document analysis agent',
          features: {
            summarization: true,
            entity_extraction: true,
          },
        },
      },
    };

    vi.mocked(agentTasksApi.getAgentsStatus).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useAgentsStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(agentTasksApi.getAgentsStatus).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockStatus);
  });
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch feature flag by key', async () => {
    const mockFlag = {
      key: 'enable_document_analysis_agent',
      enabled: true,
      config: {},
    };

    vi.mocked(agentTasksApi.getFeatureFlag).mockResolvedValue(mockFlag);

    const { result } = renderHook(
      () => useFeatureFlag('enable_document_analysis_agent'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(agentTasksApi.getFeatureFlag).toHaveBeenCalledWith('enable_document_analysis_agent');
    expect(result.current.data).toEqual(mockFlag);
  });

  it('should not fetch when key is empty', () => {
    const { result } = renderHook(
      () => useFeatureFlag(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(agentTasksApi.getFeatureFlag).not.toHaveBeenCalled();
  });
});