/**
 * API functions for search functionality
 */
import apiClient, { handleApiError } from './client';
import type { DocumentSearchParams } from './types';

/**
 * Perform a semantic search on legal documents
 */
export async function semanticSearch(params: DocumentSearchParams) {
  try {
    const response = await apiClient.get('/search/semantic', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Perform a lexical search on legal documents
 */
export async function lexicalSearch(params: DocumentSearchParams) {
  try {
    const response = await apiClient.get('/search/lexical', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Perform a hybrid search (combines semantic and lexical search)
 */
export async function hybridSearch(params: DocumentSearchParams) {
  try {
    const response = await apiClient.get('/search/hybrid', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Search for similar documents based on content
 */
export async function findSimilarDocuments(documentId: number, limit = 5) {
  try {
    const response = await apiClient.get(`/search/similar/${documentId}`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get search suggestions as user types
 */
export async function getSearchSuggestions(query: string, limit = 5) {
  try {
    const response = await apiClient.get('/search/suggestions', {
      params: { query, limit },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
