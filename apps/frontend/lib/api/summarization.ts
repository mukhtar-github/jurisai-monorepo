/**
 * API functions for document summarization
 */
import apiClient, { handleApiError } from './client';

/**
 * Summary response interface matching backend schema
 */
export interface SummaryResponse {
  document_id?: number;
  title?: string;
  summary: string;
  key_points: string[];
  citations: string[];
  metadata?: Record<string, any>;
  summary_type: string;
  original_length: number;
  summary_length: number;
  ai_used: boolean;
}

/**
 * Generate a summary for a specific document
 */
export async function summarizeDocument(
  documentId: number, 
  options?: { 
    maxLength?: number;
    minLength?: number;
    focusArea?: string;
    useAi?: boolean;
  }
): Promise<SummaryResponse> {
  try {
    const response = await apiClient.post(`/summarization/document/${documentId}`, {
      max_length: options?.maxLength || 500,
      min_length: options?.minLength || 100,
      focus_area: options?.focusArea,
      use_ai: options?.useAi !== false, // Default to true
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generate a summary for text input
 */
export async function summarizeText(
  text: string, 
  options?: { 
    maxLength?: number;
    minLength?: number;
    focusArea?: string;
    useAi?: boolean;
  }
): Promise<SummaryResponse> {
  try {
    const response = await apiClient.post('/summarization/text', {
      text,
      max_length: options?.maxLength || 500,
      min_length: options?.minLength || 100,
      focus_area: options?.focusArea,
      use_ai: options?.useAi !== false, // Default to true
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generate a specialized legal document summary with citation preservation
 * and key point extraction
 */
export async function summarizeLegalDocument(
  text: string,
  options?: {
    maxLength?: number;
    focusArea?: string;
    extractKeyPoints?: boolean;
    preserveCitations?: boolean;
  }
): Promise<SummaryResponse> {
  try {
    const response = await apiClient.post('/summarization/legal', {
      text,
      max_length: options?.maxLength || 1000,
      focus_area: options?.focusArea,
      extract_key_points: options?.extractKeyPoints !== false, // Default to true
      preserve_citations: options?.preserveCitations !== false, // Default to true
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generate a focused summary targeting specific aspects
 * @deprecated Use summarizeDocument or summarizeLegalDocument with focusArea option instead
 */
export async function focusedSummary(documentId: number, aspects: string[]) {
  console.warn('focusedSummary is deprecated. Use summarizeDocument with focusArea option instead.');
  try {
    const response = await apiClient.post(`/summarization/focused/${documentId}`, {
      aspects,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
