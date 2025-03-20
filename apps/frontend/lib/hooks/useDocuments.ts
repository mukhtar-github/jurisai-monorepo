/**
 * React Query hooks for document management
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
} from '../api/types';

// Document list query hook
export function useDocumentList(params: DocumentListParams = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => listDocuments(params),
  });
}

// Document detail query hook
export function useDocument(documentId: number, includeContent = true, includeMetadata = false) {
  return useQuery({
    queryKey: ['document', documentId, includeContent, includeMetadata],
    queryFn: () => getDocument(documentId, includeContent, includeMetadata),
    enabled: documentId > 0,
  });
}

// Document upload mutation hook
export function useDocumentUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: DocumentUploadParams) => uploadDocument(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// Document analysis mutation hook
export function useDocumentAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: DocumentAnalysisParams) => analyzeDocument(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.document_id] });
      
      if (variables.analysis_type === 'entities') {
        queryClient.invalidateQueries({ queryKey: ['document-entities', variables.document_id] });
      } else if (variables.analysis_type === 'key_terms') {
        queryClient.invalidateQueries({ queryKey: ['document-key-terms', variables.document_id] });
      }
    },
  });
}

// Document delete mutation hook
export function useDocumentDelete() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (documentId: number) => deleteDocument(documentId),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.removeQueries({ queryKey: ['document', documentId] });
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
    queryKey: ['document-entities', documentId, entityType, limit, offset, sortBy, sortOrder],
    queryFn: () => getDocumentEntities(documentId, entityType, limit, offset, sortBy, sortOrder),
    enabled: documentId > 0,
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
    queryKey: ['document-key-terms', documentId, minRelevance, minFrequency, limit, offset, sortBy, sortOrder],
    queryFn: () => getDocumentKeyTerms(documentId, minRelevance, minFrequency, limit, offset, sortBy, sortOrder),
    enabled: documentId > 0,
  });
}

// Document search query hook
export function useDocumentSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['document-search', params],
    queryFn: () => searchDocuments(params),
    enabled: !!params.query,
  });
}

// Batch upload mutation hook
export function useBatchUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: BatchUploadParams) => batchUploadDocuments(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// Batch status query hook
export function useBatchStatus(batchId: string) {
  return useQuery({
    queryKey: ['batch-status', batchId],
    queryFn: () => getBatchStatus(batchId),
    enabled: !!batchId,
    refetchInterval: (data) => {
      // Auto-refresh every 2 seconds until the batch is complete
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
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
    onSuccess: (_, variables) => {
      // Invalidate the documents that were analyzed
      variables.document_ids.forEach((documentId) => {
        queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        
        if (variables.analysis_types.includes('entities')) {
          queryClient.invalidateQueries({ queryKey: ['document-entities', documentId] });
        }
        
        if (variables.analysis_types.includes('key_terms')) {
          queryClient.invalidateQueries({ queryKey: ['document-key-terms', documentId] });
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
