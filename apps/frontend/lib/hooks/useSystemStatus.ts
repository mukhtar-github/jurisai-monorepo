/**
 * Custom hook for accessing system status information
 * Used for diagnostics and troubleshooting
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// Define types for system status response
export interface DatabaseStatus {
  connected: boolean;
  migrationStatus: 'complete' | 'partial' | 'none';
  version?: string;
  tables?: string[];
  missing_tables?: string[];
  error?: string;
}

export interface SystemInfo {
  status: string;
  uptime: string;
  version: string;
}

export interface SystemStatusResponse {
  status: string;
  database: DatabaseStatus;
  system: SystemInfo;
  error?: string;
}

export interface MigrationResponse {
  success: boolean;
  message: string;
  details?: {
    action?: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    database_connected?: boolean;
    current_revision?: string;
    latest_revision?: string;
    is_latest?: boolean;
    pending_migrations?: number;
    missing_tables?: string[];
  };
}

/**
 * Hook for fetching system status information
 */
export function useSystemStatus() {
  return useQuery<SystemStatusResponse>({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const response = await apiClient.get<SystemStatusResponse>('/system/status');
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching system features validation
 */
export function useSystemFeatures() {
  return useQuery({
    queryKey: ['systemFeatures'],
    queryFn: async () => {
      const response = await apiClient.get('/system/features');
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for managing database migrations
 * Requires admin authentication
 */
export function useMigrationManager() {
  return useMutation<MigrationResponse, Error, { action: 'check' | 'apply' | 'verify' | 'fix' }>({
    mutationFn: async ({ action }) => {
      const response = await apiClient.post<MigrationResponse>(`/system/migrations?action=${action}`, {});
      return response.data;
    },
    onError: (error) => {
      console.error('Migration operation failed:', error);
    }
  });
}

/**
 * Hook to check if API and database are available
 * This is useful for displaying application-wide notifications
 */
export function useSystemAvailability() {
  return useQuery({
    queryKey: ['systemAvailability'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<SystemStatusResponse>('/system/status');
        return {
          apiAvailable: true,
          databaseAvailable: response.data.database.connected,
          systemStatus: response.data.status,
        };
      } catch (error) {
        return {
          apiAvailable: false,
          databaseAvailable: false,
          systemStatus: 'unavailable',
        };
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}
