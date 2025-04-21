/**
 * React Query hooks for document management
 * Optimized with advanced caching strategies and offline support
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDocuments,
  getDocument,
  uploadDocument,
  analyzeDocument,
  deleteDocument,
  getDocumentEntities,
  getDocumentKeyTerms,
  searchDocuments,
  batchUploadDocuments,
  getBatchStatus,
  exportBatchDocuments,
  batchAnalyzeDocuments,
} from '../api/documents';

import type {
  DocumentListParams,
  DocumentUploadParams,
  DocumentAnalysisParams,
  DocumentSearchParams,
  BatchUploadParams,
  BatchAnalyzeParams,
  BatchExportParams,
  BatchStatusResponse,
  DocumentListResponse,
  LegalDocument
} from '../api/types';

import { 
  createQuery, 
  createPaginatedQuery, 
  createMutation
} from './useQueryWithCache';
import { CachePriority } from '@/lib/services/cacheService';

// Document query key factories
const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params: DocumentListParams) => [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: number) => [...documentKeys.details(), id] as const,
  entities: (id: number) => [...documentKeys.detail(id), 'entities'] as const,
  keyTerms: (id: number) => [...documentKeys.detail(id), 'keyTerms'] as const,
  batchStatus: (batchId: string) => [...documentKeys.all, 'batch', batchId] as const,
};

// Document list query hook - Traditional implementation
export function useDocumentListLegacy(params: DocumentListParams = {}) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => listDocuments(params),
    staleTime: 60 * 1000, // 1 minute before considered stale
    // Use placeholder data from any existing document lists while loading
    placeholderData: (previousData: DocumentListResponse | undefined) => previousData,
  });
}

// Enhanced document list query with advanced caching
export const useDocumentList = createPaginatedQuery<DocumentListParams, DocumentListResponse>(
  '/documents',
  params => documentKeys.list(params)
);

// Document detail query - Traditional implementation
export function useDocumentLegacy(documentId: number, includeContent = true, includeMetadata = false) {
  return useQuery({
    queryKey: [...documentKeys.detail(documentId), { includeContent, includeMetadata }],
    queryFn: () => getDocument(documentId, includeContent, includeMetadata),
    enabled: documentId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes before considered stale
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes (replacing cacheTime)
  });
}

// Enhanced document detail query with advanced caching
export function useDocument(documentId: number, includeContent = true, includeMetadata = false) {
  interface DocumentParams {
    id: number;
    includeContent: boolean;
    includeMetadata: boolean;
  }
  
  const useDocumentQuery = createQuery<DocumentParams, LegalDocument>(
    `/documents/${documentId}`,
    (params) => [...documentKeys.detail(params.id), { includeContent: params.includeContent, includeMetadata: params.includeMetadata }]
  );
  
  return useDocumentQuery(
    { id: documentId, includeContent, includeMetadata },
    {
      enabled: documentId > 0,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      cachePriority: CachePriority.HIGH,
      cacheTags: [`document-${documentId}`],
      // Important for UX: immediately show the previous document while loading
      placeholderData: (previousData: LegalDocument | undefined) => previousData,
    }
  );
}

// Document upload mutation - Traditional implementation
export function useDocumentUploadLegacy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: DocumentUploadParams) => uploadDocument(params),
    onSuccess: () => {
      // Invalidate document lists to refetch with new document
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    // Retry uploads on failure - networks can be flaky
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Enhanced document upload mutation with advanced cache invalidation
export const useDocumentUpload = createMutation<DocumentUploadParams, LegalDocument>(
  '/documents',
  'post'
);

// Usage example:
// const uploadMutation = useDocumentUpload({
//   invalidateQueries: [documentKeys.lists()],
//   invalidateTags: ['documents'],
//   onSuccess: (data) => {
//     console.log('Document uploaded successfully', data);
//   }
// });

// Document analysis mutation - Enhanced with cache tags
export const useDocumentAnalysis = createMutation<DocumentAnalysisParams, any>(
  '/documents/analyze',
  'post'
);

// Document deletion mutation - Enhanced with cache tags
export const useDocumentDelete = createMutation<number, void>(
  '/documents', // Will be appended with document ID
  'delete'
);

// Document entities query - Enhanced with caching
export function useDocumentEntities(documentId: number) {
  const useEntitiesQuery = createQuery<{id: number}, any>(
    `/documents/${documentId}/entities`,
    params => documentKeys.entities(params.id)
  );
  
  return useEntitiesQuery(
    { id: documentId },
    {
      enabled: documentId > 0,
      staleTime: 15 * 60 * 1000, // 15 minutes
      cachePriority: CachePriority.MEDIUM,
      cacheTags: [`document-${documentId}`, 'entities'],
    }
  );
}

// Document key terms query - Enhanced with caching
export function useDocumentKeyTerms(documentId: number) {
  const useKeyTermsQuery = createQuery<{id: number}, any>(
    `/documents/${documentId}/key-terms`,
    params => documentKeys.keyTerms(params.id)
  );
  
  return useKeyTermsQuery(
    { id: documentId },
    {
      enabled: documentId > 0,
      staleTime: 15 * 60 * 1000, // 15 minutes
      cachePriority: CachePriority.MEDIUM,
      cacheTags: [`document-${documentId}`, 'key-terms'],
    }
  );
}

// Document search - Enhanced with caching
export function useDocumentSearch(params: DocumentSearchParams) {
  const useSearchQuery = createQuery<DocumentSearchParams, any>(
    '/documents/search',
    searchParams => ['documents', 'search', searchParams]
  );
  
  return useSearchQuery(
    params,
    {
      enabled: !!params.query && params.query.length > 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cachePriority: CachePriority.LOW, // Search results are less critical to persist
      cacheTags: ['search-results'],
    }
  );
}

// Batch status query - Enhanced with frequent refreshing
export function useBatchStatus(batchId: string) {
  const useBatchStatusQuery = createQuery<{id: string}, BatchStatusResponse>(
    `/documents/batch/${batchId}/status`,
    params => documentKeys.batchStatus(params.id)
  );
  
  return useBatchStatusQuery(
    { id: batchId },
    {
      enabled: !!batchId,
      // For batch processing, we want more frequent updates
      refetchInterval: (query) => {
        // Adjust polling frequency based on status
        if (!query.state.data) return 2000; // Start with 2s when no data
        const status = query.state.data.status;
        if (status === 'completed' || status === 'failed') return false; // Stop polling
        if (status === 'processing') return 3000; // Every 3s while processing
        return 5000; // Default to 5s for other statuses
      },
      staleTime: 0, // Always consider batch status stale
      cachePriority: CachePriority.MEDIUM,
      cacheTags: [`batch-${batchId}`],
    }
  );
}

// Batch analyze documents mutation
export function useBatchAnalyze() {
  const batchAnalyzeMutation = createMutation<BatchAnalyzeParams, string>(
    '/documents/analyze/batch',
    'post'
  );
  
  return batchAnalyzeMutation({
    onSuccess: () => {
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

// Export the traditional hooks for backward compatibility
export {
  useDocumentListLegacy as useDocumentList_v3,
  useDocumentLegacy as useDocument_v3,
  useDocumentUploadLegacy as useDocumentUpload_v3,
};
