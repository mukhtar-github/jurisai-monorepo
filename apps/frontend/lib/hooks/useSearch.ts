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
import type { DocumentSearchParams } from '../api/types';

// Semantic search hook
export function useSemanticSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['semantic-search', params],
    queryFn: () => semanticSearch(params),
    enabled: !!params.query,
  });
}

// Lexical search hook
export function useLexicalSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['lexical-search', params],
    queryFn: () => lexicalSearch(params),
    enabled: !!params.query,
  });
}

// Hybrid search hook
export function useHybridSearch(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['hybrid-search', params],
    queryFn: () => hybridSearch(params),
    enabled: !!params.query,
  });
}

// Similar documents hook
export function useSimilarDocuments(documentId: number, limit = 5) {
  return useQuery({
    queryKey: ['similar-documents', documentId, limit],
    queryFn: () => findSimilarDocuments(documentId, limit),
    enabled: documentId > 0,
  });
}

// Search suggestions hook
export function useSearchSuggestions(query: string, limit = 5) {
  return useQuery({
    queryKey: ['search-suggestions', query, limit],
    queryFn: () => getSearchSuggestions(query, limit),
    enabled: query.length > 2, // Only search if at least 3 characters
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
  });
}
