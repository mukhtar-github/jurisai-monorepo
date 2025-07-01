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
  owner_id?: number;
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

// Search response types
export interface SearchResultResponse {
  results: {
    document: LegalDocument;
    score: number;
    highlights?: string[];
    match_type?: string;
  }[];
  total: number;
  query: string;
  filters_applied: Record<string, string | boolean>;
  execution_time: number;
}

export interface SimilarDocumentsResponse {
  source_document: {
    id: number;
    title: string;
  };
  similar_documents: {
    document: LegalDocument;
    similarity_score: number;
  }[];
  total: number;
}

export interface SearchSuggestionsResponse {
  query: string;
  suggestions: string[];
  document_types?: string[];
  entity_types?: string[];
  total: number;
}

// RAG (Retrieval-Augmented Generation) types
export interface DocumentEmbeddingParams {
  document_id: number;
  model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface EmbeddingResponse {
  document_id: number;
  embedding_id: string;
  chunk_count: number;
  model: string;
  status: string;
  processing_time: number;
}

export interface SimilaritySearchParams {
  query: string;
  top_k?: number;
  filter?: {
    document_types?: string[];
    jurisdictions?: string[];
    date_range?: {
      start_date?: string;
      end_date?: string;
    };
  };
  threshold?: number;
}

export interface SimilaritySearchResponse {
  results: {
    document: LegalDocument;
    similarity: number;
    chunk_text: string;
    chunk_id: string;
  }[];
  total: number;
  processing_time: number;
}

/**
 * RAG query parameters
 */
export interface RAGQueryParams {
  query: string;
  context_docs?: number[];
  max_docs?: number;
  max_length?: number;
  focus_areas?: string[];
  document_ids?: number[];
  model?: string;
  temperature?: number;
  filter?: {
    document_types?: string[];
    jurisdictions?: string[];
  };
  response_format?: 'text' | 'json' | 'markdown';
  include_sources?: boolean;
}

/**
 * RAG query response
 */
export interface RAGQueryResponse {
  query?: string;
  response: string;
  source_documents?: {
    document: LegalDocument;
    relevance: number;
    chunk_text: string;
  }[];
  sources?: {
    document_id: number;
    title?: string;
    metadata?: string;
  }[];
  processing_time: number;
  model?: string;
}

export interface VectorIndexStatusResponse {
  total_documents: number;
  total_chunks: number;
  last_updated: string;
  document_types: { document_type: string; count: number }[];
  jurisdictions: { jurisdiction: string; count: number }[];
  model_info: {
    name: string;
    dimensions: number;
  };
}

// RBAC (Role-Based Access Control) types
/**
 * Permission model
 */
export interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/**
 * Role model
 */
export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

/**
 * User model with roles
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string; // Legacy role (admin/user)
  roles: Role[]; // RBAC roles
  created_at: string;
  updated_at: string;
}

/**
 * Role creation/update parameters
 */
export interface RoleParams {
  name: string;
  description: string;
  permission_ids?: number[];
}

/**
 * Permission creation/update parameters
 */
export interface PermissionParams {
  resource: string;
  action: string;
  description: string;
}

/**
 * User role update parameters
 */
export interface UserRoleUpdateParams {
  role: string; // Legacy role (admin/user)
}

/**
 * Role assignment parameters
 */
export interface RoleAssignmentParams {
  role_id: number;
}

/**
 * System features status response
 */
export interface SystemFeaturesResponse {
  status: string;
  features: {
    [key: string]: {
      name: string;
      status: string;
      description: string;
      version: string | null;
    };
  };
}

// Agent Task types
export interface AgentTask {
  task_id: string;
  agent_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  document_id?: number;
  user_id?: number;
  parameters?: Record<string, any>;
  results?: Record<string, any>;
  confidence?: number;
  error_message?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AgentTaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_type: string;
  result?: Record<string, any>;
  confidence?: number;
  processing_time_ms?: number;
  created_at?: string;
  completed_at?: string;
}

export interface DocumentAnalysisRequest {
  parameters?: {
    max_summary_length?: number;
    focus_area?: string;
    preserve_citations?: boolean;
    [key: string]: any;
  };
}

export interface DocumentAnalysisResponse {
  task_id?: string;
  status: 'processing' | 'completed';
  agent_enabled: boolean;
  message: string;
  result?: {
    summary?: string;
    document_type?: string;
    word_count?: number;
    analysis_type?: string;
    [key: string]: any;
  };
}

export interface AgentTaskListParams {
  status_filter?: string;
  agent_type?: string;
  limit?: number;
}

export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface AgentsStatusResponse {
  status: string;
  data: {
    [agentType: string]: {
      enabled: boolean;
      description: string;
      features: Record<string, boolean>;
    };
  };
}

export interface UserDocument {
  id: number;
  title: string;
  document_type?: string;
  created_at?: string;
  word_count?: number;
  has_summary: boolean;
}
