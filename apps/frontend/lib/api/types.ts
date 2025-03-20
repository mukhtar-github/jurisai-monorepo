/**
 * Type definitions for JurisAI API
 */

// Document types
export interface LegalDocument {
  id: number;
  title: string;
  content: string;
  document_type: string;
  jurisdiction: string;
  publication_date?: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  summary?: string;
  metadata?: Record<string, any>;
  has_entities?: boolean;
  has_key_terms?: boolean;
  has_summary?: boolean;
}

export interface DocumentEntity {
  id: number;
  document_id: number;
  text: string;
  entity_type: string;
  relevance: number;
  start_pos?: number;
  end_pos?: number;
  created_at: string;
}

export interface DocumentKeyTerm {
  id: number;
  document_id: number;
  term: string;
  frequency: number;
  relevance: number;
  created_at: string;
}

// Document list parameters
export interface DocumentListParams {
  document_type?: string;
  jurisdiction?: string;
  has_summary?: boolean;
  has_entities?: boolean;
  has_key_terms?: boolean;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Document upload parameters
export interface DocumentUploadParams {
  file: File;
  title: string;
  document_type: string;
  jurisdiction: string;
  publication_date?: string;
  process_with_ai?: boolean;
  auto_analyze?: boolean;
}

// Document analysis parameters
export interface DocumentAnalysisParams {
  document_id: number;
  analysis_type: 'entities' | 'summary' | 'key_terms';
}

// Search parameters
export interface DocumentSearchParams {
  query: string;
  document_type?: string;
  jurisdiction?: string;
  entity_type?: string;
  key_term?: string;
  search_strategy?: 'semantic' | 'lexical' | 'hybrid';
  limit?: number;
  offset?: number;
}

// Batch upload parameters
export interface BatchUploadParams {
  files: File[];
  document_type: string;
  jurisdiction: string;
  process_with_ai?: boolean;
  auto_analyze?: boolean;
}

// Batch analyze parameters
export interface BatchAnalyzeParams {
  document_ids: number[];
  analysis_types: ('entities' | 'key_terms' | 'summary')[];
}

// Batch export parameters
export interface BatchExportParams {
  document_ids: number[];
  export_format: 'json' | 'csv' | 'txt';
  include_content?: boolean;
  include_metadata?: boolean;
  include_entities?: boolean;
  include_key_terms?: boolean;
}

// Response types
export interface DocumentListResponse {
  items: LegalDocument[];
  total: number;
  filters: {
    document_types: string[];
    jurisdictions: string[];
  };
  skip: number;
  limit: number;
}

export interface DocumentAnalysisResponse {
  document_id: number;
  analysis_type: string;
  results: any;
  processing_time: number;
}

export interface BatchUploadResponse {
  batch_id: string;
  status: string;
  message: string;
  file_count: number;
}

export interface BatchStatusResponse {
  batch_id: string;
  status: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  start_time: string;
  end_time?: string;
  documents: {
    id: number;
    title: string;
    status: string;
    error?: string;
  }[];
}

export interface DocumentEntitiesResponse {
  document_id: number;
  entities: DocumentEntity[];
  total: number;
  entity_types: string[];
}

export interface DocumentKeyTermsResponse {
  document_id: number;
  key_terms: DocumentKeyTerm[];
  total: number;
  stats: {
    avg_relevance: number;
    max_frequency: number;
  };
}
