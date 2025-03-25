/**
 * API client for JurisAI backend services
 */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Extend AxiosRequestConfig to include our custom properties
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
    skipRetry?: boolean;
  }
}

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';
// Default to localhost for development, and assume Railway URL format for production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (isDevelopment ? 'http://localhost:8000' : 'https://jurisai-backend-production.up.railway.app');
const TIMEOUT = 30000; // 30 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Token storage keys (must match those in AuthContext)
const TOKEN_KEY = 'jurisai_auth_token';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting for GET requests when needed
    if (config.method?.toLowerCase() === 'get' && config.params?.noCacheMode) {
      const timestamp = new Date().getTime();
      config.params = { ...config.params, _t: timestamp };
      delete config.params.noCacheMode;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Utility function for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Check if config exists before proceeding
    if (!error.config) {
      return Promise.reject(error);
    }
    
    const originalRequest = error.config;
    
    // Skip retry if explicitly marked
    if (originalRequest.skipRetry) {
      return Promise.reject(error);
    }
    
    // Initialize retry count if doesn't exist
    if (originalRequest._retryCount === undefined) {
      originalRequest._retryCount = 0;
    }
    
    // Check if we should retry the request
    const shouldRetry = 
      originalRequest._retryCount < MAX_RETRIES && 
      RETRY_STATUS_CODES.includes(error.response?.status || 0) &&
      ['get', 'head'].includes(originalRequest.method?.toLowerCase() || '');
    
    // Handle 401 Unauthorized error (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear tokens and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Implement retry logic
    if (shouldRetry) {
      originalRequest._retryCount++;
      const delay = RETRY_DELAY * (2 ** (originalRequest._retryCount - 1)); // Exponential backoff
      
      console.log(`Retrying request (${originalRequest._retryCount}/${MAX_RETRIES}) after ${delay}ms`);
      await sleep(delay);
      
      return apiClient(originalRequest);
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

/**
 * Health check function to verify backend connectivity
 * @returns Promise that resolves to true if backend is reachable
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health', { 
      timeout: 5000, // Shorter timeout for health check
      skipRetry: true // Don't retry health checks
    });
    return response.status === 200 && response.data.status === 'healthy';
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

/**
 * Comprehensive health check that includes all backend services
 * @returns Promise with detailed health information
 */
export const getApiFullHealth = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await apiClient.get('/health/full', { 
      timeout: 10000,
      skipRetry: true
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export default apiClient;

// Helper types for API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: string;
}

// Helper type for pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// Error response type
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<number, string> = {
  400: 'The request is invalid. Please check your input.',
  401: 'You need to log in to access this feature.',
  403: 'You don\'t have permission to access this resource.',
  404: 'The requested item could not be found.',
  408: 'The request timed out. Please try again.',
  429: 'Too many requests. Please try again later.',
  500: 'Something went wrong on our servers. We\'re working to fix it.',
  502: 'Our service is temporarily unavailable. Please try again later.',
  503: 'Service unavailable. Please try again later.',
  504: 'The server gateway timed out. Please try again later.'
};

// Helper function to handle API errors
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 0;
    const isNetworkError = error.message === 'Network Error';
    const isTimeoutError = error.code === 'ECONNABORTED';
    
    // Get user-friendly message based on status code
    let friendlyMessage = ERROR_MESSAGES[status] || 'An unexpected error occurred.';
    
    // Override with network-specific messages
    if (isNetworkError) {
      friendlyMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (isTimeoutError) {
      friendlyMessage = 'The request took too long to complete. Please try again.';
    }
    
    const response = error.response?.data;
    return {
      status: status || 500,
      message: response?.message || friendlyMessage,
      errors: response?.errors,
      isNetworkError,
      isTimeoutError
    };
  }
  
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'An unknown error occurred',
  };
}
