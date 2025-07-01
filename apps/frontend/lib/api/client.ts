/**
 * API client for JurisAI backend services
 */
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import httpCache, { CachePriority } from '@/lib/services/cacheService';
import { errorLogger } from '../utils/error-logger';

// Extend AxiosRequestConfig to include our custom properties
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
    skipRetry?: boolean;
    cacheOptions?: {
      ttl?: number;
      priority?: CachePriority;
      forceRefresh?: boolean;
      cacheTags?: string[];
    };
  }
  
  // Extend AxiosResponse to include our custom properties
  export interface AxiosResponse<T = any> {
    _fromCache?: boolean;
    _stale?: boolean;
    _fromPendingRequest?: boolean;
  }
}

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';
// Default to localhost for development, and use Railway URL for production
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (isDevelopment ? 'http://localhost:8000' : 'https://jurisai-monorepo-production.up.railway.app');
const TIMEOUT = 30000; // 30 seconds

// Log which API URL we're using
console.log(`API client initialized with base URL: ${API_URL}`);

// Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable CORS credentials for cross-origin requests
  withCredentials: false
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Cache configuration
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Token storage keys (must match those in AuthContext)
const TOKEN_KEY = 'jurisai_auth_token';

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add authorization header if token exists
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Only apply caching for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const url = config.url || '';
      const params = config.params || {};
      
      // Skip cache if forceRefresh is set
      if (config.cacheOptions?.forceRefresh !== true) {
        // Check for pending request with same parameters
        const pendingRequest = httpCache.getPendingRequest(url, params);
        if (pendingRequest) {
          // Return the existing request to avoid duplicates
          return new Promise((resolve, reject) => {
            pendingRequest.then(
              (response) => resolve({ ...config, _fromPendingRequest: true, data: response }),
              (error) => reject(error)
            );
          }) as any;
        }
      
        // Try to get from cache
        const cachedEntry = httpCache.get(url, params);
        if (cachedEntry) {
          // Add cache headers for conditional requests
          if (cachedEntry.etag && config.headers) {
            config.headers['If-None-Match'] = cachedEntry.etag;
          }
          if (cachedEntry.lastModified && config.headers) {
            config.headers['If-Modified-Since'] = cachedEntry.lastModified;
          }
        }
      }
      
      // Add cache busting for GET requests when needed
      if (config.params?.noCacheMode) {
        const timestamp = new Date().getTime();
        config.params = { ...config.params, _t: timestamp };
        delete config.params.noCacheMode;
      }
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
    // Handle GET request caching
    if (response.config.method?.toLowerCase() === 'get' && response.status === 200) {
      const url = response.config.url || '';
      const params = response.config.params || {};
      
      // Don't cache responses with certain status codes or error responses
      const shouldCache = response.status === 200;
      
      if (shouldCache) {
        // Extract cache headers
        const etag = response.headers['etag'];
        const lastModified = response.headers['last-modified'];
        const cacheControl = response.headers['cache-control'];
        
        // Get TTL from cache-control header or config
        let maxAge = undefined;
        if (cacheControl) {
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          if (maxAgeMatch && maxAgeMatch[1]) {
            maxAge = parseInt(maxAgeMatch[1], 10) * 1000; // Convert to ms
          }
        }
        
        // Use configured TTL if available
        const configTtl = response.config.cacheOptions?.ttl || DEFAULT_CACHE_TTL;
        maxAge = maxAge || configTtl;
        
        // Get priority from config
        const priority = response.config.cacheOptions?.priority || CachePriority.MEDIUM;
        
        // Store in cache
        httpCache.set(url, response.data, params, {
          etag,
          lastModified,
          cacheControl,
          maxAge,
          priority
        });
      }
    }
    
    return response;
  },
  async (error: AxiosError) => {
    // Check if config exists before proceeding
    if (!error.config) {
      return Promise.reject(error);
    }
    
    const originalRequest = error.config;
    
    // Handle HTTP 304 Not Modified (use cached data)
    if (error.response?.status === 304) {
      const url = originalRequest.url || '';
      const params = originalRequest.params || {};
      
      // Get from cache
      const cachedEntry = httpCache.get(url, params);
      if (cachedEntry) {
        // Construct a success response using cached data
        const cachedResponse: AxiosResponse = {
          ...error.response,
          status: 200,
          data: cachedEntry.data,
          _fromCache: true
        };
        return cachedResponse;
      }
    }
    
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
      ['get', 'head', 'options'].includes(originalRequest.method?.toLowerCase() || '');
    
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
      
      // Exponential backoff with jitter
      const delay = RETRY_DELAY * (2 ** (originalRequest._retryCount - 1)) * (0.8 + Math.random() * 0.4);
      
      console.log(`Retrying request (${originalRequest._retryCount}/${MAX_RETRIES}) after ${Math.round(delay)}ms: ${originalRequest.url}`);
      await sleep(delay);
      
      // For GET requests, try to use cached data during retry to improve UX
      if (originalRequest.method?.toLowerCase() === 'get') {
        const url = originalRequest.url || '';
        const params = originalRequest.params || {};
        
        // Get from cache
        const cachedEntry = httpCache.get(url, params);
        if (cachedEntry) {
          // Construct a success response using cached data, but still retry in background
          console.log(`Using cached data for ${url} while retrying in background`);
          
          // Make the retry request in the background
          apiClient(originalRequest).then(
            (response) => {
              // Update cache with fresh data
              if (response.status === 200) {
                httpCache.set(url, response.data, params, {
                  etag: response.headers['etag'],
                  lastModified: response.headers['last-modified'],
                  cacheControl: response.headers['cache-control'],
                  priority: originalRequest.cacheOptions?.priority || CachePriority.MEDIUM
                });
              }
            },
            () => {} // Ignore errors in background retry
          );
          
          // Return cached data immediately
          const cachedResponse: AxiosResponse = {
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest,
            data: cachedEntry.data,
            _fromCache: true,
            _stale: true
          };
          return cachedResponse;
        }
      }
      
      return apiClient(originalRequest);
    }
    
    // For GET requests that failed, try to use cached data as fallback
    if (originalRequest.method?.toLowerCase() === 'get') {
      const url = originalRequest.url || '';
      const params = originalRequest.params || {};
      
      // Get from cache
      const cachedEntry = httpCache.get(url, params);
      if (cachedEntry) {
        console.log(`Request failed, using cached data as fallback for ${url}`);
        
        // Construct a success response using cached data
        const cachedResponse: AxiosResponse = {
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest,
          data: cachedEntry.data,
          _fromCache: true,
          _stale: true
        };
        return cachedResponse;
      }
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

/**
 * Invalidate cache entries by tag
 * @param tags - Tags to invalidate
 */
export const invalidateCacheTags = (tags: string[]): void => {
  // Implement tag-based cache invalidation
  console.log(`Invalidating cache for tags: ${tags.join(', ')}`);
  
  // This is a simplified implementation that clears the entire cache
  // In a real implementation, you'd track which URLs are associated with which tags
  httpCache.clear();
};

/**
 * Prefetch API resources for better performance
 * @param paths - Array of API paths to prefetch
 */
export const prefetchResources = async (paths: string[]): Promise<void> => {
  for (const path of paths) {
    try {
      // Extract URL and params if path includes query params
      let url = path;
      let params = {};
      
      if (path.includes('?')) {
        const [urlPart, queryPart] = path.split('?');
        url = urlPart;
        params = Object.fromEntries(
          new URLSearchParams(queryPart).entries()
        );
      }
      
      // Prefetch the resource
      await httpCache.prefetch(url, params);
    } catch (error) {
      // Silently fail for prefetch requests
      console.debug(`Prefetch failed for ${path}`, error);
    }
  }
};

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
export const getApiFullHealth = async (): Promise<any> => {
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
  hasCachedData?: boolean;
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
  // Log the error with our enhanced error logger
  errorLogger.logApiError(error);
  
  // Default error response
  const defaultError: ApiError = {
    status: 500,
    message: 'An unexpected error occurred. Please try again later.',
    isNetworkError: false,
    isTimeoutError: false
  };

  // No error
  if (!error) {
    return defaultError;
  }

  // Axios error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Network error
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        status: 408,
        message: ERROR_MESSAGES[408] || 'Request timed out. Please try again.',
        isTimeoutError: true
      };
    }

    // Network error
    if (!axiosError.response) {
      return {
        status: 0,
        message: 'Cannot connect to the server. Please check your network connection.',
        isNetworkError: true
      };
    }

    // Server error with response
    const status = axiosError.response.status;
    const serverMessage = axiosError.response.data?.message || axiosError.response.data?.error;
    const serverErrors = axiosError.response.data?.errors;

    // Detailed console log for debugging production issues
    console.error(`API Error (${status}):`, {
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      status,
      message: serverMessage,
      errors: serverErrors,
      responseData: axiosError.response.data,
      // Add stack trace in development
      stack: process.env.NODE_ENV === 'development' ? axiosError.stack : undefined
    });

    return {
      status,
      message: serverMessage || ERROR_MESSAGES[status] || `Error ${status}`,
      errors: serverErrors,
    };
  }

  // Other errors
  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message || defaultError.message
    };
  }

  // Unknown error format
  return defaultError;
}
