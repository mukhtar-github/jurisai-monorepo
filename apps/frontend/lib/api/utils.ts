/**
 * Utility functions for API client
 */
import axios from 'axios';

/**
 * Handles API errors and transforms them into more user-friendly format
 * @param error The error from axios
 * @returns A normalized error object
 */
export function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    // Handle Axios errors
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    // Create a custom error with the status and original message
    const customError = new Error(`API Error (${status}): ${message}`);
    (customError as any).status = status;
    (customError as any).originalError = error;
    
    return customError;
  }
  
  // If it's already an Error instance, return it
  if (error instanceof Error) {
    return error;
  }
  
  // Otherwise, convert to Error
  return new Error(String(error));
}
