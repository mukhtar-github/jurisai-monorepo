'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  generateDocumentEmbeddings,
  performSimilaritySearch,
  executeRAGQuery,
  getVectorIndexStatus,
  rebuildVectorIndex,
  getIndexRebuildStatus,
  generateDocumentSummary,
  extractDocumentInformation,
} from '../api/rag';
import type {
  DocumentEmbeddingParams,
  EmbeddingResponse,
  SimilaritySearchParams,
  SimilaritySearchResponse,
  RAGQueryParams,
  RAGQueryResponse,
  VectorIndexStatusResponse,
} from '../api/types';

// Query keys for RAG operations
const ragKeys = {
  all: ['rag'] as const,
  vectorIndex: ['rag', 'vectorIndex'] as const,
  rebuildStatus: (jobId: string) => ['rag', 'rebuildStatus', jobId] as const,
  documentEmbedding: (documentId: number) => ['rag', 'embedding', documentId] as const,
  similarity: (params: SimilaritySearchParams) => ['rag', 'similarity', params] as const,
  ragQuery: (params: RAGQueryParams) => ['rag', 'query', params] as const,
  documentSummary: (documentId: number) => ['rag', 'summary', documentId] as const,
  documentInformation: (documentId: number, types: string[]) => 
    ['rag', 'information', documentId, types] as const,
};

/**
 * Hook to get the status of the vector index
 */
export function useVectorIndexStatus() {
  return useQuery({
    queryKey: ragKeys.vectorIndex,
    queryFn: getVectorIndexStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to rebuild the vector index
 */
export function useRebuildVectorIndex() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rebuildVectorIndex,
    onSuccess: () => {
      // Invalidate the vector index status query
      queryClient.invalidateQueries({ queryKey: ragKeys.vectorIndex });
    },
  });
}

/**
 * Hook to check the status of a vector index rebuild job
 */
export function useIndexRebuildStatus(jobId: string) {
  return useQuery({
    queryKey: ragKeys.rebuildStatus(jobId),
    queryFn: () => getIndexRebuildStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      // In React Query v4, we need to access the data property differently
      const data = query.state.data;
      if (data) {
        if (data.status === 'running' || data.status === 'pending') {
          return 2000; // 2 seconds
        }
      }
      return false; // Stop polling once complete
    },
  });
}

/**
 * Hook to generate embeddings for a document
 */
export function useGenerateDocumentEmbeddings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: generateDocumentEmbeddings,
    onSuccess: (data) => {
      // Invalidate the vector index status
      queryClient.invalidateQueries({ queryKey: ragKeys.vectorIndex });
    },
  });
}

/**
 * Hook to perform similarity search
 */
export function useSimilaritySearch(params: SimilaritySearchParams) {
  return useQuery<SimilaritySearchResponse>({
    queryKey: ragKeys.similarity(params),
    queryFn: () => performSimilaritySearch(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: (previousData: SimilaritySearchResponse | undefined) => previousData,
  });
}

/**
 * Hook to execute a RAG query
 */
export function useRAGQuery(params: RAGQueryParams) {
  return useQuery<RAGQueryResponse>({
    queryKey: ragKeys.ragQuery(params),
    queryFn: () => executeRAGQuery(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - queries are expensive
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previousData: RAGQueryResponse | undefined) => previousData,
  });
}

/**
 * Hook for one-off RAG queries (executes immediately without caching)
 */
export function useOneTimeRAGQuery() {
  return useMutation({
    mutationFn: executeRAGQuery,
  });
}

/**
 * Hook to generate a summary for a document using RAG
 */
export function useGenerateDocumentSummary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ documentId, options }: { documentId: number; options?: { max_length?: number; focus_areas?: string[] } }) =>
      generateDocumentSummary(documentId, options),
    onSuccess: (_, variables) => {
      // Update document in the cache to indicate it has a summary
      queryClient.invalidateQueries({ 
        queryKey: ['documents', variables.documentId] 
      });
    },
  });
}

/**
 * Hook to extract information from a document using RAG
 */
export function useExtractDocumentInformation<TData = any>() {
  return useMutation<TData, Error, { 
    documentId: number; 
    extractionTypes: ('entities' | 'dates' | 'citations' | 'definitions' | 'custom')[] 
  }>({
    mutationFn: ({ documentId, extractionTypes }) => 
      extractDocumentInformation(documentId, extractionTypes) as Promise<TData>,
  });
}
