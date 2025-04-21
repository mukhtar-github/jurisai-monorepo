/**
 * React Query hooks for search functionality
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import {
  semanticSearch,
  lexicalSearch,
  hybridSearch,
  findSimilarDocuments,
  getSearchSuggestions,
} from '../api/search';
import type { 
  DocumentSearchParams, 
  SearchResultResponse,
  SimilarDocumentsResponse,
  SearchSuggestionsResponse
} from '../api/types';

// Search query keys for better cache management
const searchKeys = {
  all: ['search'] as const,
  semantic: (params: DocumentSearchParams) => [...searchKeys.all, 'semantic', params] as const,
  lexical: (params: DocumentSearchParams) => [...searchKeys.all, 'lexical', params] as const,
  hybrid: (params: DocumentSearchParams) => [...searchKeys.all, 'hybrid', params] as const,
  similar: (documentId: number, limit?: number) => [...searchKeys.all, 'similar', documentId, limit] as const,
  suggestions: (query: string, limit?: number) => [...searchKeys.all, 'suggestions', query, limit] as const,
};

// Semantic search hook
export function useSemanticSearch(params: DocumentSearchParams) {
  return useQuery<SearchResultResponse>({
    queryKey: searchKeys.semantic(params),
    queryFn: () => semanticSearch(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previousData: SearchResultResponse | undefined) => previousData,
  });
}

// Lexical search hook
export function useLexicalSearch(params: DocumentSearchParams) {
  return useQuery<SearchResultResponse>({
    queryKey: searchKeys.lexical(params),
    queryFn: () => lexicalSearch(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData: SearchResultResponse | undefined) => previousData,
  });
}

// Hybrid search hook
export function useHybridSearch(params: DocumentSearchParams) {
  return useQuery<SearchResultResponse>({
    queryKey: searchKeys.hybrid(params),
    queryFn: () => hybridSearch(params),
    enabled: !!params.query && params.query.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData: SearchResultResponse | undefined) => previousData,
  });
}

// Similar documents hook
export function useSimilarDocuments(documentId: number, limit = 5) {
  return useQuery<SimilarDocumentsResponse>({
    queryKey: searchKeys.similar(documentId, limit),
    queryFn: () => findSimilarDocuments(documentId, limit),
    enabled: documentId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Search suggestions hook - NEW
export function useSearchSuggestions(query: string, limit = 5) {
  return useQuery<SearchSuggestionsResponse>({
    queryKey: searchKeys.suggestions(query, limit),
    queryFn: () => getSearchSuggestions(query, limit),
    enabled: !!query && query.length >= 2, // Only trigger when 2+ characters typed
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Debounce rapid typing by fetching only after a brief pause
    refetchOnWindowFocus: false,
  });
}
