/**
 * React Query hooks for document summarization
 */
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  summarizeDocument,
  summarizeText,
  focusedSummary,
} from '../api/summarization';

// Document summarization query hook
export function useDocumentSummary(documentId: number, maxLength?: number) {
  return useQuery({
    queryKey: ['document-summary', documentId, maxLength],
    queryFn: () => summarizeDocument(documentId, maxLength),
    enabled: documentId > 0,
  });
}

// Text summarization mutation hook
export function useTextSummarization() {
  return useMutation({
    mutationFn: ({ text, maxLength }: { text: string; maxLength?: number }) => 
      summarizeText(text, maxLength),
  });
}

// Focused summary query hook
export function useFocusedSummary(documentId: number, aspects: string[]) {
  return useQuery({
    queryKey: ['focused-summary', documentId, aspects],
    queryFn: () => focusedSummary(documentId, aspects),
    enabled: documentId > 0 && aspects.length > 0,
  });
}
