/**
 * Enhanced error logging utility for JurisAI
 * This helps diagnose production issues by providing detailed error information
 */

// Error logging levels
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

// Error context interface
interface ErrorContext {
  component?: string;
  action?: string;
  url?: string;
  params?: Record<string, any>;
  user?: string | null;
  additionalInfo?: Record<string, any>;
}

// Main error logger
export const errorLogger = {
  /**
   * Log an error with detailed context
   */
  logError: (error: unknown, context: ErrorContext = {}, level: LogLevel = LogLevel.ERROR) => {
    // Only log detailed errors in development or when explicitly enabled
    const isDev = process.env.NODE_ENV === 'development';
    const isDetailedLoggingEnabled = process.env.NEXT_PUBLIC_ENABLE_DETAILED_LOGGING === 'true';
    
    if (!isDev && !isDetailedLoggingEnabled) {
      // In production without detailed logging, only log minimal info
      console.error(`Error in ${context.component || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    // Extract error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown Error',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        url: context.url || (typeof window !== 'undefined' ? window.location.href : 'server-side'),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server-side',
      }
    };
    
    // Log the detailed error
    console[level]('📋 DETAILED ERROR LOG:', errorDetails);
    
    // Return the formatted error for optional display to user
    return {
      message: errorDetails.message,
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      context: context.action,
    };
  },
  
  /**
   * Log an API error with request and response details
   */
  logApiError: (error: unknown, request?: Request | RequestInfo, additionalContext: Record<string, any> = {}) => {
    let url = 'unknown-api';
    let method = 'unknown';
    
    // Extract URL and method from request if available
    if (request) {
      if (request instanceof Request) {
        url = request.url;
        method = request.method;
      } else if (typeof request === 'string') {
        url = request;
      }
    }
    
    // Get response details if available
    const responseInfo: Record<string, any> = {};
    if (error && typeof error === 'object') {
      if ('status' in error) responseInfo.status = (error as any).status;
      if ('statusText' in error) responseInfo.statusText = (error as any).statusText;
      if ('data' in error) responseInfo.data = (error as any).data;
    }
    
    return errorLogger.logError(error, {
      component: 'API Client',
      action: `${method} ${url}`,
      additionalInfo: {
        ...additionalContext,
        response: responseInfo,
      }
    });
  },
  
  /**
   * Create a wrapper for async functions that automatically logs errors
   */
  createErrorWrapper: <T extends (...args: any[]) => Promise<any>>(
    fn: T, 
    context: ErrorContext
  ) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        errorLogger.logError(error, {
          ...context,
          params: args.length > 0 ? { arguments: args } : undefined,
        });
        throw error;
      }
    };
  }
};

/**
 * Utility to enable detailed error logging in production temporarily
 * This helps diagnose issues without redeploying
 */
export const enableDetailedLogging = (durationMs = 3600000) => { // Default: 1 hour
  if (typeof window === 'undefined') return; // Server-side, do nothing
  
  // Set a flag in localStorage
  localStorage.setItem('jurisai_detailed_logging', 'true');
  localStorage.setItem('jurisai_logging_expiry', String(Date.now() + durationMs));
  
  console.info(`✅ Detailed error logging enabled for ${durationMs / 60000} minutes`);
  
  // Set up auto-disable
  setTimeout(() => {
    localStorage.removeItem('jurisai_detailed_logging');
    localStorage.removeItem('jurisai_logging_expiry');
    console.info('⏱️ Detailed error logging automatically disabled');
  }, durationMs);
  
  // Apply immediately
  (window as any).__JURISAI_DETAILED_LOGGING = true;
};

// Initialize logging settings
if (typeof window !== 'undefined') {
  const loggingEnabled = localStorage.getItem('jurisai_detailed_logging') === 'true';
  const expiryTime = parseInt(localStorage.getItem('jurisai_logging_expiry') || '0', 10);
  
  if (loggingEnabled && expiryTime > Date.now()) {
    (window as any).__JURISAI_DETAILED_LOGGING = true;
  } else if (loggingEnabled && expiryTime <= Date.now()) {
    // Clear expired settings
    localStorage.removeItem('jurisai_detailed_logging');
    localStorage.removeItem('jurisai_logging_expiry');
  }
}
