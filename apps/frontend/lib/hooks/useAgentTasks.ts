/**
 * React Query hooks for agent task management
 * Optimized with advanced caching strategies and real-time polling
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentTasksApi } from '../api/agent-tasks';
import {
  createQuery,
  createMutation,
  createPaginatedQuery,
} from './useQueryWithCache';
import { CachePriority } from '@/lib/services/cacheService';

import type {
  AgentTask,
  AgentTaskStatus,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  AgentTaskListParams,
  AgentsStatusResponse,
  UserDocument,
} from '../api/types';

// Agent task query key factories
const agentTaskKeys = {
  all: ['agent-tasks'] as const,
  lists: () => [...agentTaskKeys.all, 'list'] as const,
  list: (params: AgentTaskListParams) => [...agentTaskKeys.lists(), params] as const,
  details: () => [...agentTaskKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentTaskKeys.details(), id] as const,
  status: (id: string) => [...agentTaskKeys.detail(id), 'status'] as const,
  results: (id: string) => [...agentTaskKeys.detail(id), 'results'] as const,
  // Agent-specific keys
  agents: ['agents'] as const,
  agentsStatus: () => [...agentTaskKeys.agents, 'status'] as const,
  agentsHealth: () => [...agentTaskKeys.agents, 'health'] as const,
  // User documents
  userDocuments: () => ['user-documents'] as const,
  userDocumentsList: (skip: number, limit: number) => 
    [...agentTaskKeys.userDocuments(), 'list', { skip, limit }] as const,
  // Feature flags
  featureFlags: () => ['feature-flags'] as const,
  featureFlag: (key: string) => [...agentTaskKeys.featureFlags(), key] as const,
};

/**
 * Hook for document analysis with agent processing
 */
export const useAgentDocumentAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      request = {},
      enableAgents = true 
    }: { 
      documentId: number; 
      request?: DocumentAnalysisRequest;
      enableAgents?: boolean; 
    }) => {
      return agentTasksApi.analyzeDocument(documentId, request, enableAgents);
    },
    onSuccess: (data) => {
      // If we got a task ID, start polling for status
      if (data.task_id) {
        queryClient.prefetchQuery({
          queryKey: agentTaskKeys.status(data.task_id),
          queryFn: () => agentTasksApi.getTaskStatus(data.task_id!),
          staleTime: 0, // Always fresh for status checks
        });
      }
      
      // Invalidate user tasks list to include new task
      queryClient.invalidateQueries({
        queryKey: agentTaskKeys.lists(),
      });
    },
    onError: (error) => {
      console.error('Document analysis failed:', error);
    },
  });
};

/**
 * Hook for monitoring agent task status with intelligent polling
 */
export const useAgentTaskStatus = (taskId: string | null) => {
  return useQuery({
    queryKey: agentTaskKeys.status(taskId || ''),
    queryFn: async () => {
      if (!taskId) return null;
      return agentTasksApi.getTaskStatus(taskId);
    },
    enabled: !!taskId,
    staleTime: 0, // Status should always be fresh
    refetchInterval: (query) => {
      // Intelligent polling based on task status
      if (!query.state.data) return 2000; // Start with 2s when no data
      
      const status = query.state.data.status;
      if (status === 'completed' || status === 'failed') {
        return false; // Stop polling when task is done
      }
      if (status === 'processing') {
        return 2000; // Poll every 2 seconds while processing
      }
      return 5000; // Poll every 5 seconds for pending status
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * Hook for getting user's agent tasks with filtering
 */
export const useUserAgentTasks = (params: AgentTaskListParams = {}) => {
  return useQuery({
    queryKey: agentTaskKeys.list(params),
    queryFn: () => agentTasksApi.getUserTasks(params),
    staleTime: 30 * 1000, // 30 seconds before considered stale
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Enhanced user agent tasks hook with caching
 */
export const useUserAgentTasksEnhanced = createPaginatedQuery<
  AgentTaskListParams, 
  AgentTaskStatus[]
>(
  '/api/v1/agents/tasks',
  params => agentTaskKeys.list(params),
  {
    cachePriority: CachePriority.MEDIUM,
    cacheTags: ['agent-tasks', 'user-tasks'],
    defaultStaleTime: 30 * 1000, // 30 seconds
  }
);

/**
 * Hook for getting user's documents with agent context
 */
export const useUserDocuments = (skip: number = 0, limit: number = 100) => {
  return useQuery({
    queryKey: agentTaskKeys.userDocumentsList(skip, limit),
    queryFn: () => agentTasksApi.getUserDocuments(skip, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes before considered stale
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for agent system health check
 */
export const useAgentHealth = () => {
  return useQuery({
    queryKey: agentTaskKeys.agentsHealth(),
    queryFn: () => agentTasksApi.getAgentHealth(),
    staleTime: 5 * 60 * 1000, // 5 minutes before considered stale
    gcTime: 15 * 60 * 1000, // Cache for 15 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for agent system status (public endpoint)
 */
export const useAgentsStatus = () => {
  return useQuery({
    queryKey: agentTaskKeys.agentsStatus(),
    queryFn: () => agentTasksApi.getAgentsStatus(),
    staleTime: 2 * 60 * 1000, // 2 minutes before considered stale
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for getting task results (public endpoint for backward compatibility)
 */
export const useAgentTaskResults = (taskId: string | null) => {
  return useQuery({
    queryKey: agentTaskKeys.results(taskId || ''),
    queryFn: async () => {
      if (!taskId) return null;
      return agentTasksApi.getPublicTaskResults(taskId);
    },
    enabled: !!taskId,
    staleTime: 60 * 1000, // 1 minute before considered stale
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

/**
 * Hook for feature flags management
 */
export const useFeatureFlags = () => {
  return useQuery({
    queryKey: agentTaskKeys.featureFlags(),
    queryFn: () => agentTasksApi.getFeatureFlags(),
    staleTime: 5 * 60 * 1000, // 5 minutes before considered stale
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
};

/**
 * Hook for specific feature flag
 */
export const useFeatureFlag = (key: string) => {
  return useQuery({
    queryKey: agentTaskKeys.featureFlag(key),
    queryFn: () => agentTasksApi.getFeatureFlag(key),
    staleTime: 5 * 60 * 1000, // 5 minutes before considered stale
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
    enabled: !!key,
  });
};

/**
 * Composite hook for monitoring a document analysis workflow
 */
export const useDocumentAnalysisWorkflow = (documentId: number | null) => {
  const analysis = useAgentDocumentAnalysis();
  const taskStatus = useAgentTaskStatus(
    analysis.data?.task_id || null
  );
  
  return {
    // Analysis mutation
    startAnalysis: analysis.mutate,
    isStarting: analysis.isPending,
    analysisError: analysis.error,
    analysisData: analysis.data,
    
    // Task monitoring
    taskStatus: taskStatus.data,
    isPolling: taskStatus.isFetching,
    taskError: taskStatus.error,
    
    // Workflow state
    isAnalysisComplete: taskStatus.data?.status === 'completed',
    isAnalysisFailed: taskStatus.data?.status === 'failed',
    isProcessing: taskStatus.data?.status === 'processing',
    isPending: taskStatus.data?.status === 'pending',
    
    // Results
    results: taskStatus.data?.result,
    confidence: taskStatus.data?.confidence,
    processingTime: taskStatus.data?.processing_time_ms,
    
    // Reset function
    reset: () => {
      analysis.reset();
    },
  };
};

/**
 * Hook for invalidating agent-related queries
 */
export const useInvalidateAgentQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAllTasks: () => {
      queryClient.invalidateQueries({
        queryKey: agentTaskKeys.lists(),
      });
    },
    invalidateTaskStatus: (taskId: string) => {
      queryClient.invalidateQueries({
        queryKey: agentTaskKeys.status(taskId),
      });
    },
    invalidateAgentsStatus: () => {
      queryClient.invalidateQueries({
        queryKey: agentTaskKeys.agentsStatus(),
      });
    },
    invalidateUserDocuments: () => {
      queryClient.invalidateQueries({
        queryKey: agentTaskKeys.userDocuments(),
      });
    },
    refetchTaskStatus: (taskId: string) => {
      return queryClient.refetchQueries({
        queryKey: agentTaskKeys.status(taskId),
      });
    },
  };
};

// Export query key factories for external use
export { agentTaskKeys };