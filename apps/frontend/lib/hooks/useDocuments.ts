/**
 * React Query hooks for document management
 * Optimized with advanced caching strategies and offline support
 */
'use client';

import { useQuery, useMutation, useQueryClient, Query } from '@tanstack/react-query';
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

// Document list query hook
export function useDocumentList(params: DocumentListParams = {}) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => listDocuments(params),
    staleTime: 60 * 1000, // 1 minute before considered stale
    // Use placeholder data from any existing document lists while loading
    placeholderData: (previousData: DocumentListResponse | undefined) => previousData,
  });
}

// Document detail query hook
export function useDocument(documentId: number, includeContent = true, includeMetadata = false) {
  return useQuery({
    queryKey: [...documentKeys.detail(documentId), { includeContent, includeMetadata }],
    queryFn: () => getDocument(documentId, includeContent, includeMetadata),
    enabled: documentId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes before considered stale
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes (replacing cacheTime)
  });
}

// Document upload mutation hook
export function useDocumentUpload() {
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

// Document analysis mutation hook
export function useDocumentAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: DocumentAnalysisParams) => analyzeDocument(params),
    onSuccess: (data, variables) => {
      // Invalidate related document queries
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.document_id) });
      // Also invalidate any entities and key terms
      queryClient.invalidateQueries({ queryKey: documentKeys.entities(variables.document_id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.keyTerms(variables.document_id) });
      
      // Directly update document in cache if possible
      queryClient.setQueryData(
        documentKeys.detail(variables.document_id),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            analyzed: true,
            analysis_status: 'completed',
            last_analyzed: new Date().toISOString(),
          };
        }
      );
    },
  });
}

// Document delete mutation hook
export function useDocumentDelete() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (documentId: number) => deleteDocument(documentId),
    onSuccess: (_, documentId) => {
      // Invalidate document lists
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      
      // Remove the document from cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(documentId) });
      
      // Update any document lists in the cache
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: any) => {
          if (!oldData || !oldData.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.filter((doc: LegalDocument) => doc.id !== documentId),
            total: oldData.total - 1,
          };
        }
      );
    },
  });
}

// Document entities query hook
export function useDocumentEntities(
  documentId: number,
  entityType?: string,
  limit = 50,
  offset = 0,
  sortBy = 'relevance',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery({
    queryKey: [...documentKeys.entities(documentId), { entityType, limit, offset, sortBy, sortOrder }],
    queryFn: () => getDocumentEntities(documentId, entityType, limit, offset, sortBy, sortOrder),
    enabled: documentId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - entities rarely change
  });
}

// Document key terms query hook
export function useDocumentKeyTerms(
  documentId: number,
  minRelevance?: number,
  minFrequency?: number,
  limit = 50,
  offset = 0,
  sortBy = 'relevance',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery({
    queryKey: [...documentKeys.keyTerms(documentId), { minRelevance, minFrequency, limit, offset, sortBy, sortOrder }],
    queryFn: () => getDocumentKeyTerms(documentId, minRelevance, minFrequency, limit, offset, sortBy, sortOrder),
    enabled: documentId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - key terms rarely change
  });
}

// Document search query hook
export function useDocumentSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => searchDocuments(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Batch upload mutation hook
export function useBatchUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: BatchUploadParams) => batchUploadDocuments(params),
    onSuccess: (data) => {
      // After batch upload, start polling for status
      queryClient.invalidateQueries({ queryKey: documentKeys.batchStatus(data.batch_id) });
      
      // Also invalidate document lists as they will change soon
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
    retry: 1, // Only retry once for large uploads
  });
}

// Batch status query hook with automatic polling
export function useBatchStatus(batchId: string) {
  return useQuery<BatchStatusResponse>({
    queryKey: documentKeys.batchStatus(batchId),
    queryFn: () => getBatchStatus(batchId),
    enabled: !!batchId,
    // Poll more frequently for active batches
    refetchInterval: (query: Query<BatchStatusResponse, Error>) => {
      // If complete or failed, stop polling
      if (query.state.data?.status === 'completed' || query.state.data?.status === 'failed') {
        return false;
      }
      // Otherwise poll every 3 seconds
      return 3000;
    },
    staleTime: 0, // Always refetch when requested
    // Stop polling when component unmounts
    refetchIntervalInBackground: false,
    // Use placeholderData instead of keepPreviousData
    placeholderData: (previousData: BatchStatusResponse | undefined) => previousData,
    // Prevent excessive back-to-back requests
    retry: false,
  });
}

// Batch export mutation hook
export function useBatchExport() {
  return useMutation({
    mutationFn: (params: BatchExportParams) => exportBatchDocuments(params),
  });
}

// Batch analyze mutation hook
export function useBatchAnalyze() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: BatchAnalyzeParams) => batchAnalyzeDocuments(params),
    onSuccess: (data, variables) => {
      // Start polling batch status
      queryClient.invalidateQueries({ queryKey: documentKeys.batchStatus(data.batch_id) });
      
      // Invalidate any affected document queries
      if (variables.document_ids) {
        variables.document_ids.forEach(id => {
          queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
        });
      }
      
      // Invalidate document lists as they will have updated status
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    }
  });
}
