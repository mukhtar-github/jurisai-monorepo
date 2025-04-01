/**
 * Health check hooks for JurisAI
 * Provides React Query hooks for checking system health and component status
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { 
  getBasicHealth, 
  getSystemInfo, 
  getDatabaseStatus, 
  getAIModelsStatus, 
  getFullHealth,
  checkApiConnectivity,
  BasicHealthResponse,
  SystemInfoResponse,
  DatabaseStatusResponse,
  AIModelsResponse,
  FullHealthResponse,
} from '@/lib/api/health';

// Query keys for caching
export const healthKeys = {
  all: ['health'] as const,
  basic: () => [...healthKeys.all, 'basic'] as const,
  system: () => [...healthKeys.all, 'system'] as const,
  database: () => [...healthKeys.all, 'database'] as const,
  aiModels: () => [...healthKeys.all, 'ai-models'] as const,
  full: () => [...healthKeys.all, 'full'] as const,
  connectivity: () => [...healthKeys.all, 'connectivity'] as const,
};

/**
 * Hook for basic health status
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useBasicHealth = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}): UseQueryResult<BasicHealthResponse> => {
  return useQuery({
    queryKey: healthKeys.basic(),
    queryFn: getBasicHealth,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook for system information
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useSystemInfo = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}): UseQueryResult<SystemInfoResponse> => {
  return useQuery({
    queryKey: healthKeys.system(),
    queryFn: getSystemInfo,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Hook for database status
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useDatabaseStatus = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}): UseQueryResult<DatabaseStatusResponse> => {
  return useQuery({
    queryKey: healthKeys.database(),
    queryFn: getDatabaseStatus,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook for AI models status
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useAIModelsStatus = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}): UseQueryResult<AIModelsResponse> => {
  return useQuery({
    queryKey: healthKeys.aiModels(),
    queryFn: getAIModelsStatus,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook for comprehensive health status
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useFullHealth = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}): UseQueryResult<FullHealthResponse> => {
  return useQuery({
    queryKey: healthKeys.full(),
    queryFn: getFullHealth,
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook for API connectivity check
 * @param options.enabled - Whether the query should run automatically
 * @param options.refetchInterval - How often to refetch data in milliseconds
 */
export const useApiConnectivity = (options: {
  enabled?: boolean;
  refetchInterval?: number | false;
  timeout?: number;
} = {}): UseQueryResult<boolean> => {
  return useQuery({
    queryKey: healthKeys.connectivity(),
    queryFn: () => checkApiConnectivity(options.timeout),
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval || false,
    gcTime: 1000 * 60 * 5, // 5 minutes
    staleTime: 1000 * 10, // 10 seconds
    retry: false, // Don't retry connectivity checks
  });
};
