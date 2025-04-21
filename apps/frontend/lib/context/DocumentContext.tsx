/**
 * Context provider for document state management
 */
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { LegalDocument } from '../api/types';

interface DocumentContextType {
  // Selected document
  selectedDocument: LegalDocument | null;
  setSelectedDocument: (document: LegalDocument | null) => void;
  
  // Selected documents (for batch operations)
  selectedDocuments: LegalDocument[];
  setSelectedDocuments: (documents: LegalDocument[]) => void;
  addToSelection: (document: LegalDocument) => void;
  removeFromSelection: (documentId: number) => void;
  clearSelection: () => void;
  isSelected: (documentId: number) => boolean;
  
  // Recent documents
  recentDocuments: LegalDocument[];
  addRecentDocument: (document: LegalDocument) => void;
  clearRecentDocuments: () => void;
  
  // Filter state
  filters: {
    documentType: string | null;
    jurisdiction: string | null;
    hasSummary: boolean | null;
    hasEntities: boolean | null;
    hasKeyTerms: boolean | null;
  };
  setFilters: (filters: {
    documentType?: string | null;
    jurisdiction?: string | null;
    hasSummary?: boolean | null;
    hasEntities?: boolean | null;
    hasKeyTerms?: boolean | null;
  }) => void;
  clearFilters: () => void;
}

const DocumentContext = createContext<DocumentContextType>({
  selectedDocument: null,
  setSelectedDocument: () => {},
  
  selectedDocuments: [],
  setSelectedDocuments: () => {},
  addToSelection: () => {},
  removeFromSelection: () => {},
  clearSelection: () => {},
  isSelected: () => false,
  
  recentDocuments: [],
  addRecentDocument: () => {},
  clearRecentDocuments: () => {},
  
  filters: {
    documentType: null,
    jurisdiction: null,
    hasSummary: null,
    hasEntities: null,
    hasKeyTerms: null,
  },
  setFilters: () => {},
  clearFilters: () => {},
});

export const useDocumentContext = () => useContext(DocumentContext);

interface DocumentProviderProps {
  children: ReactNode;
}

export const DocumentProvider = ({ children }: DocumentProviderProps) => {
  // Selected document
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  
  // Selected documents for batch operations
  const [selectedDocuments, setSelectedDocumentsState] = useState<LegalDocument[]>([]);
  
  const setSelectedDocuments = (documents: LegalDocument[]) => {
    setSelectedDocumentsState(documents);
  };
  
  const addToSelection = (document: LegalDocument) => {
    setSelectedDocumentsState((prev) => {
      if (prev.some((doc) => doc.id === document.id)) {
        return prev;
      }
      return [...prev, document];
    });
  };
  
  const removeFromSelection = (documentId: number) => {
    setSelectedDocumentsState((prev) => prev.filter((doc) => doc.id !== documentId));
  };
  
  const clearSelection = () => {
    setSelectedDocumentsState([]);
  };
  
  const isSelected = (documentId: number) => {
    return selectedDocuments.some((doc) => doc.id === documentId);
  };
  
  // Recent documents with localStorage persistence
  const [recentDocuments, setRecentDocuments] = useState<LegalDocument[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jurisai_recent_documents');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  
  const addRecentDocument = (document: LegalDocument) => {
    setRecentDocuments((prev) => {
      // Remove if already exists
      const filtered = prev.filter((doc) => doc.id !== document.id);
      // Add to beginning and limit to 10 items
      const updated = [document, ...filtered].slice(0, 10);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('jurisai_recent_documents', JSON.stringify(updated));
      }
      
      return updated;
    });
  };
  
  const clearRecentDocuments = () => {
    setRecentDocuments([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jurisai_recent_documents');
    }
  };
  
  // Filter state
  const [filters, setFiltersState] = useState({
    documentType: null as string | null,
    jurisdiction: null as string | null,
    hasSummary: null as boolean | null,
    hasEntities: null as boolean | null,
    hasKeyTerms: null as boolean | null,
  });
  
  const setFilters = (newFilters: {
    documentType?: string | null;
    jurisdiction?: string | null;
    hasSummary?: boolean | null;
    hasEntities?: boolean | null;
    hasKeyTerms?: boolean | null;
  }) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };
  
  const clearFilters = () => {
    setFiltersState({
      documentType: null,
      jurisdiction: null,
      hasSummary: null,
      hasEntities: null,
      hasKeyTerms: null,
    });
  };
  
  const value = {
    selectedDocument,
    setSelectedDocument,
    
    selectedDocuments,
    setSelectedDocuments,
    addToSelection,
    removeFromSelection,
    clearSelection,
    isSelected,
    
    recentDocuments,
    addRecentDocument,
    clearRecentDocuments,
    
    filters,
    setFilters,
    clearFilters,
  };
  
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};
