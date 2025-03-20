/**
 * API functions for document management
 */
import apiClient, { handleApiError } from './client';
import type {
  LegalDocument,
  DocumentEntity,
  DocumentKeyTerm,
  DocumentListParams,
  DocumentUploadParams,
  DocumentAnalysisParams,
  DocumentSearchParams,
  BatchUploadParams,
  BatchAnalyzeParams,
  BatchExportParams,
  DocumentListResponse,
  DocumentAnalysisResponse,
  BatchUploadResponse,
  BatchStatusResponse,
  DocumentEntitiesResponse,
  DocumentKeyTermsResponse,
} from './types';

/**
 * List documents with optional filters
 */
export async function listDocuments(params: DocumentListParams = {}) {
  try {
    const response = await apiClient.get<DocumentListResponse>('/documents', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Upload a new document
 */
export async function uploadDocument(params: DocumentUploadParams) {
  try {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('title', params.title);
    formData.append('document_type', params.document_type);
    formData.append('jurisdiction', params.jurisdiction);
    
    if (params.publication_date) {
      formData.append('publication_date', params.publication_date);
    }
    
    formData.append('process_with_ai', String(params.process_with_ai ?? true));
    formData.append('auto_analyze', String(params.auto_analyze ?? false));
    
    const response = await apiClient.post<LegalDocument>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: number, includeContent = true, includeMetadata = false) {
  try {
    const response = await apiClient.get<LegalDocument>(`/documents/${documentId}`, {
      params: {
        include_content: includeContent,
        include_metadata: includeMetadata,
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Analyze a document
 */
export async function analyzeDocument(params: DocumentAnalysisParams) {
  try {
    const response = await apiClient.post<DocumentAnalysisResponse>(`/documents/${params.document_id}/analyze`, null, {
      params: {
        analysis_type: params.analysis_type,
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: number) {
  try {
    const response = await apiClient.delete(`/documents/${documentId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get document entities
 */
export async function getDocumentEntities(
  documentId: number,
  entityType?: string,
  limit = 50,
  offset = 0,
  sortBy = 'relevance',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  try {
    const response = await apiClient.get<DocumentEntitiesResponse>(`/documents/${documentId}/entities`, {
      params: {
        entity_type: entityType,
        limit,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get document key terms
 */
export async function getDocumentKeyTerms(
  documentId: number,
  minRelevance?: number,
  minFrequency?: number,
  limit = 50,
  offset = 0,
  sortBy = 'relevance',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  try {
    const response = await apiClient.get<DocumentKeyTermsResponse>(`/documents/${documentId}/key_terms`, {
      params: {
        min_relevance: minRelevance,
        min_frequency: minFrequency,
        limit,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Search documents
 */
export async function searchDocuments(params: DocumentSearchParams) {
  try {
    const response = await apiClient.get<DocumentListResponse>('/documents/search', { params });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Batch upload documents
 */
export async function batchUploadDocuments(params: BatchUploadParams) {
  try {
    const formData = new FormData();
    
    // Append each file to the form data
    params.files.forEach((file) => {
      formData.append('files', file);
    });
    
    formData.append('document_type', params.document_type);
    formData.append('jurisdiction', params.jurisdiction);
    formData.append('process_with_ai', String(params.process_with_ai ?? true));
    formData.append('auto_analyze', String(params.auto_analyze ?? false));
    
    const response = await apiClient.post<BatchUploadResponse>('/documents/batch-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Get batch status
 */
export async function getBatchStatus(batchId: string) {
  try {
    const response = await apiClient.get<BatchStatusResponse>(`/documents/batch-status/${batchId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Export batch documents
 */
export async function exportBatchDocuments(params: BatchExportParams) {
  try {
    const response = await apiClient.post('/documents/export-batch', {
      document_ids: params.document_ids,
    }, {
      params: {
        export_format: params.export_format,
        include_content: params.include_content,
        include_metadata: params.include_metadata,
        include_entities: params.include_entities,
        include_key_terms: params.include_key_terms,
      },
      responseType: params.export_format === 'json' ? 'json' : 'blob',
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Batch analyze documents
 */
export async function batchAnalyzeDocuments(params: BatchAnalyzeParams) {
  try {
    const response = await apiClient.post('/documents/batch-analyze', {
      document_ids: params.document_ids,
      analysis_types: params.analysis_types,
    });
    
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
