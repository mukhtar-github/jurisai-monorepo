/**
 * React Query hooks for document summarization
 */
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  summarizeDocument,
  summarizeText,
  summarizeLegalDocument,
  focusedSummary,
  SummaryResponse
} from '../api/summarization';

interface DocumentSummaryOptions {
  maxLength?: number;
  minLength?: number;
  focusArea?: string;
  useAi?: boolean;
}

// Document summarization query hook
export function useDocumentSummary(
  documentId: number, 
  options?: DocumentSummaryOptions
) {
  return useQuery({
    queryKey: ['document-summary', documentId, options],
    queryFn: () => summarizeDocument(documentId, options),
    enabled: documentId > 0,
  });
}

interface TextSummarizationInput {
  text: string;
  maxLength?: number;
  minLength?: number;
  focusArea?: string;
  useAi?: boolean;
}

// Text summarization mutation hook
export function useTextSummarization() {
  return useMutation({
    mutationFn: ({ text, ...options }: TextSummarizationInput) => 
      summarizeText(text, options),
  });
}

interface LegalDocumentSummarizationInput {
  text: string;
  maxLength?: number;
  focusArea?: string;
  extractKeyPoints?: boolean;
  preserveCitations?: boolean;
}

// Legal document summarization mutation hook
export function useLegalDocumentSummarization() {
  return useMutation({
    mutationFn: ({ text, ...options }: LegalDocumentSummarizationInput) => 
      summarizeLegalDocument(text, options),
  });
}

interface DocumentUploadSummarizeInput {
  document_id?: number;
  file: File;
  title: string;
  document_type: string;
  jurisdiction: string;
  maxLength?: number;
  focusArea?: string;
  extractKeyPoints?: boolean;
  preserveCitations?: boolean;
}

// Document upload and summarize hook
export function useSummarizeDocument() {
  return useMutation({
    mutationFn: async (params: DocumentUploadSummarizeInput) => {
      // First upload the document if it's a new one
      if (!params.document_id) {
        try {
          const formData = new FormData();
          formData.append('file', params.file);
          formData.append('title', params.title);
          formData.append('document_type', params.document_type);
          formData.append('jurisdiction', params.jurisdiction);
          formData.append('process_with_ai', 'true');
          
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload document');
          }
          
          const data = await response.json();
          params.document_id = data.id;
        } catch (error) {
          console.error('Error uploading document:', error);
          throw new Error('Failed to upload document. Please try again.');
        }
      }
      
      // Read the file content for specialized summarization
      const fileContent = await params.file.text();
      
      // Use legal document summarization with all advanced features
      return summarizeLegalDocument(fileContent, {
        maxLength: params.maxLength,
        focusArea: params.focusArea,
        extractKeyPoints: params.extractKeyPoints,
        preserveCitations: params.preserveCitations,
      });
    },
  });
}

// Focused summary query hook (deprecated)
export function useFocusedSummary(documentId: number, aspects: string[]) {
  console.warn('useFocusedSummary is deprecated. Use useDocumentSummary with focusArea option instead.');
  return useQuery({
    queryKey: ['focused-summary', documentId, aspects],
    queryFn: () => focusedSummary(documentId, aspects),
    enabled: documentId > 0 && aspects.length > 0,
  });
}
