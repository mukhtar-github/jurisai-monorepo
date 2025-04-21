/**
 * API functions for Retrieval-Augmented Generation (RAG) pipeline
 */

import apiClient from './client';
import { handleApiError } from './utils';
import type {
  DocumentEmbeddingParams,
  EmbeddingResponse,
  SimilaritySearchParams,
  SimilaritySearchResponse,
  RAGQueryParams,
  RAGQueryResponse,
  VectorIndexStatusResponse,
} from './types';

/**
 * Generates embeddings for a document
 * @param params Document embedding parameters
 * @returns Embedding response with vector ID
 */
export async function generateDocumentEmbeddings(params: DocumentEmbeddingParams): Promise<EmbeddingResponse> {
  try {
    const response = await apiClient.post<EmbeddingResponse>('/rag/embeddings', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Performs vector similarity search on the document corpus
 * @param params Similarity search parameters
 * @returns Search results with similarity scores
 */
export async function performSimilaritySearch(params: SimilaritySearchParams): Promise<SimilaritySearchResponse> {
  try {
    const response = await apiClient.post<SimilaritySearchResponse>('/rag/search', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Executes a RAG query that combines retrieval with generation
 * @param params RAG query parameters
 * @returns Generated response with source documents
 */
export async function executeRAGQuery(params: RAGQueryParams): Promise<RAGQueryResponse> {
  try {
    const response = await apiClient.post<RAGQueryResponse>('/rag/query', params);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Gets the status of the vector index
 * @returns Vector index status information
 */
export async function getVectorIndexStatus(): Promise<VectorIndexStatusResponse> {
  try {
    const response = await apiClient.get<VectorIndexStatusResponse>('/rag/status');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Rebuilds the vector index for all documents
 * @param params Optional parameters for rebuilding the index
 * @returns Status of the rebuild operation
 */
export async function rebuildVectorIndex(params?: { document_types?: string[]; jurisdictions?: string[] }): Promise<{ status: string; job_id: string }> {
  try {
    const response = await apiClient.post<{ status: string; job_id: string }>('/rag/rebuild-index', params || {});
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Gets the status of a vector index rebuild job
 * @param jobId The ID of the rebuild job
 * @returns Status of the rebuild job
 */
export async function getIndexRebuildStatus(jobId: string): Promise<{ status: string; progress: number; error?: string }> {
  try {
    const response = await apiClient.get<{ status: string; progress: number; error?: string }>(`/rag/rebuild-status/${jobId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Generates a summary of a document using the RAG pipeline
 * @param documentId The ID of the document to summarize
 * @param options Optional parameters for summarization
 * @returns Summary of the document
 */
export async function generateDocumentSummary(
  documentId: number,
  options?: { max_length?: number; focus_areas?: string[] }
): Promise<{ summary: string; processing_time: number }> {
  try {
    const response = await apiClient.post<{ summary: string; processing_time: number }>(
      `/rag/summarize/${documentId}`,
      options || {}
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Extracts key information from a document using the RAG pipeline
 * @param documentId The ID of the document
 * @param extractionTypes Types of information to extract
 * @returns Extracted information
 */
export async function extractDocumentInformation(
  documentId: number,
  extractionTypes: ('entities' | 'dates' | 'citations' | 'definitions' | 'custom')[]
): Promise<Record<string, any>> {
  try {
    const response = await apiClient.post<Record<string, any>>(`/rag/extract/${documentId}`, { extraction_types: extractionTypes });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
