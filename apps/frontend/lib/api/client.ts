/**
 * API client for JurisAI backend services
 */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';
// Default to localhost for development, and assume Railway URL format for production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (isDevelopment ? 'http://localhost:8000' : 'https://jurisai-backend-production.up.railway.app');
const TIMEOUT = 30000; // 30 seconds

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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized error (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear tokens and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

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
}

// Helper function to handle API errors
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data;
    return {
      status: error.response?.status || 500,
      message: response?.message || error.message || 'An unknown error occurred',
      errors: response?.errors,
    };
  }
  
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'An unknown error occurred',
  };
}
