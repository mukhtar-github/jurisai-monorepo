'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHybridSearch, useLexicalSearch, useSemanticSearch } from '@/lib/hooks/useSearch';
import { useDocumentList } from '@/lib/hooks/useDocuments';
import SearchForm from '@/components/search/SearchForm';
import SearchResults from '@/components/search/SearchResults';
import { DocumentSearchParams } from '@/lib/api/types';

// This component contains the useSearchParams hook
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get available filters for the search form
  const { data: documentsData } = useDocumentList({
    limit: 1, // Just to get the filters
  });
  
  // Default search parameters
  const [searchState, setSearchState] = useState<DocumentSearchParams>({
    query: searchParams.get('q') || '',
    document_type: searchParams.get('document_type') || undefined,
    jurisdiction: searchParams.get('jurisdiction') || undefined,
    entity_type: searchParams.get('entity_type') || undefined,
    search_strategy: (searchParams.get('strategy') as 'semantic' | 'lexical' | 'hybrid') || 'hybrid',
    limit: parseInt(searchParams.get('limit') || '20'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  // Get appropriate search hook based on strategy
  const semanticSearchQuery = useSemanticSearch({
    ...searchState,
    search_strategy: 'semantic',
  });
  
  const lexicalSearchQuery = useLexicalSearch({
    ...searchState,
    search_strategy: 'lexical',
  });
  
  const hybridSearchQuery = useHybridSearch({
    ...searchState,
    search_strategy: 'hybrid',
  });

  // Select the appropriate search results based on the strategy
  const activeSearchQuery = 
    searchState.search_strategy === 'semantic'
      ? semanticSearchQuery
      : searchState.search_strategy === 'lexical'
      ? lexicalSearchQuery
      : hybridSearchQuery;

  // Handle search submission
  const handleSearch = (params: DocumentSearchParams) => {
    // Update state
    setSearchState(params);
    
    // Update URL params for bookmarkable/shareable searches
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.set('q', params.query);
    if (params.document_type) queryParams.set('document_type', params.document_type);
    if (params.jurisdiction) queryParams.set('jurisdiction', params.jurisdiction);
    if (params.entity_type) queryParams.set('entity_type', params.entity_type);
    if (params.search_strategy) queryParams.set('strategy', params.search_strategy);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    
    // Update URL without full page reload
    router.push(`/search?${queryParams.toString()}`);
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    const updatedParams = { ...searchState, offset: newOffset };
    handleSearch(updatedParams);
  };

  // Handle sort change
  const handleSortChange = (sortField: string, sortOrder: 'asc' | 'desc') => {
    // Here we would normally update the sort params and refetch
    // For now we'll just show a console message since API might not support all sorts
    console.log(`Sorting by ${sortField} in ${sortOrder} order`);
    
    // Ideally, update the search params and refetch:
    // const updatedParams = { 
    //   ...searchState, 
    //   sort_by: sortField, 
    //   sort_order: sortOrder 
    // };
    // handleSearch(updatedParams);
  };

  // Parse query params on mount
  useEffect(() => {
    if (searchParams.get('q')) {
      setSearchState({
        query: searchParams.get('q') || '',
        document_type: searchParams.get('document_type') || undefined,
        jurisdiction: searchParams.get('jurisdiction') || undefined,
        entity_type: searchParams.get('entity_type') || undefined,
        search_strategy: (searchParams.get('strategy') as 'semantic' | 'lexical' | 'hybrid') || 'hybrid',
        limit: parseInt(searchParams.get('limit') || '20'),
        offset: parseInt(searchParams.get('offset') || '0'),
      });
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Advanced Legal Document Search</h1>
        <p className="text-gray-600">
          Search across your legal document repository using semantic, lexical, or hybrid search strategies.
        </p>
      </div>
      
      <div className="mb-8">
        <SearchForm
          initialSearchParams={searchState}
          onSearch={handleSearch}
          availableDocumentTypes={documentsData?.filters.document_types || []}
          availableJurisdictions={documentsData?.filters.jurisdictions || []}
        />
      </div>
      
      {searchState.query.length > 0 && (
        <SearchResults
          searchResults={activeSearchQuery.data}
          isLoading={activeSearchQuery.isLoading}
          isError={activeSearchQuery.isError}
          searchParams={searchState}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
        />
      )}

      {/* Search strategy explainer cards */}
      {!searchState.query.length && (
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-medium text-blue-800">Semantic Search</h3>
            <p className="text-blue-600">
              Uses AI to understand the meaning behind your query and find conceptually related documents, even if they don't contain the exact keywords.
            </p>
            <div className="mt-4 text-sm text-blue-700">
              Best for: Conceptual questions and finding related materials
            </div>
          </div>
          
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-medium text-green-800">Lexical Search</h3>
            <p className="text-green-600">
              Performs traditional keyword matching to find documents containing the exact terms in your query.
            </p>
            <div className="mt-4 text-sm text-green-700">
              Best for: Finding specific terms, phrases, or citations
            </div>
          </div>
          
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-medium text-purple-800">Hybrid Search</h3>
            <p className="text-purple-600">
              Combines the power of semantic and lexical search to deliver the most comprehensive results.
            </p>
            <div className="mt-4 text-sm text-purple-700">
              Best for: General research and exploratory searches
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component wrapped with Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
