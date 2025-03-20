/**
 * API functions for document summarization
 */
import apiClient, { handleApiError } from './client';

/**
 * Generate a summary for a specific document
 */
export async function summarizeDocument(documentId: number, maxLength?: number) {
  try {
    const response = await apiClient.get(`/summarization/document/${documentId}`, {
      params: { max_length: maxLength },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generate a summary for text input
 */
export async function summarizeText(text: string, maxLength?: number) {
  try {
    const response = await apiClient.post('/summarization/text', {
      text,
      max_length: maxLength,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generate a focused summary targeting specific aspects
 */
export async function focusedSummary(documentId: number, aspects: string[]) {
  try {
    const response = await apiClient.post(`/summarization/focused/${documentId}`, {
      aspects,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
