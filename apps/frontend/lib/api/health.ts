/**
 * Health API module for JurisAI
 * Provides functions for checking system health and component status
 */
import apiClient, { ApiResponse } from './client';

// Types for health check responses
export interface BasicHealthResponse {
  status: string;
  uptime: string;
}

export interface SystemInfoResponse {
  os: string;
  os_version: string;
  python_version: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
}

export interface DatabaseStatusResponse {
  status: string;
  type: string;
  message: string;
}

export interface AIModelsResponse {
  status: string;
  models: {
    rag_available: boolean;
    summarizer_available: boolean;
    document_processor_available: boolean;
  };
}

export interface FullHealthResponse {
  status: string;
  timestamp: number;
  uptime: string;
  database: DatabaseStatusResponse;
  system: SystemInfoResponse;
  ai_models: AIModelsResponse;
  version: string;
}

/**
 * Get basic health status
 * @returns Promise with basic health status
 */
export const getBasicHealth = async (): Promise<BasicHealthResponse> => {
  try {
    const response = await apiClient.get<BasicHealthResponse>('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get system information
 * @returns Promise with system information
 */
export const getSystemInfo = async (): Promise<SystemInfoResponse> => {
  try {
    const response = await apiClient.get<SystemInfoResponse>('/health/system');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get database status
 * @returns Promise with database connection status
 */
export const getDatabaseStatus = async (): Promise<DatabaseStatusResponse> => {
  try {
    const response = await apiClient.get<DatabaseStatusResponse>('/health/database');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get AI models status
 * @returns Promise with AI models availability status
 */
export const getAIModelsStatus = async (): Promise<AIModelsResponse> => {
  try {
    const response = await apiClient.get<AIModelsResponse>('/health/ai-models');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get comprehensive health status of all system components
 * @returns Promise with detailed health information for all components
 */
export const getFullHealth = async (): Promise<FullHealthResponse> => {
  try {
    const response = await apiClient.get<FullHealthResponse>('/health/full');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if the backend API is reachable
 * @param timeout - Timeout in milliseconds
 * @returns Promise resolving to boolean indicating if API is reachable
 */
export const checkApiConnectivity = async (timeout = 5000): Promise<boolean> => {
  try {
    await apiClient.get('/health', {
      timeout,
      skipRetry: true, // Don't retry this request
    });
    return true;
  } catch (error) {
    return false;
  }
};
