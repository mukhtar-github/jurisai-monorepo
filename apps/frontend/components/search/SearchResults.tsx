'use client';

import { useState } from 'react';
import { SearchResultResponse, DocumentSearchParams } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

interface SearchResultsProps {
  searchResults?: SearchResultResponse;
  isLoading: boolean;
  isError: boolean;
  searchParams: DocumentSearchParams;
  onPageChange: (newOffset: number) => void;
  onSortChange: (sortField: string, sortOrder: 'asc' | 'desc') => void;
}

const SearchResults = ({
  searchResults,
  isLoading,
  isError,
  searchParams,
  onPageChange,
  onSortChange,
}: SearchResultsProps) => {
  const [sortField, setSortField] = useState<string>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // No results state
  if (!isLoading && !isError && (!searchResults || searchResults.results.length === 0)) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">No results found</h3>
        <p className="mt-2 text-gray-600">
          Try broadening your search terms or adjusting your filters.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-8 flex items-center justify-center space-x-2">
        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500"></div>
        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500 delay-100"></div>
        <div className="h-4 w-4 animate-pulse rounded-full bg-primary-500 delay-200"></div>
        <span className="ml-2 text-gray-600">Searching...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-lg font-medium text-red-800">Search Error</h3>
        <p className="mt-2 text-red-600">
          There was an error processing your search. Please try again.
        </p>
      </div>
    );
  }

  // Handle sort change
  const handleSortChange = (field: string) => {
    const newOrder = field === sortField && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortOrder(newOrder);
    onSortChange(field, newOrder);
  };

  // Calculate pagination
  const currentPage = Math.floor(searchParams.offset! / searchParams.limit!) + 1;
  const totalPages = Math.ceil(searchResults!.total / searchParams.limit!);
  
  // Generate page numbers array for pagination
  const pageNumbers = [];
  const maxPageButtons = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="mt-6">
      {/* Search results stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <div className="mb-2 md:mb-0">
          <span className="text-sm text-gray-600">
            Showing {searchParams.offset! + 1}-
            {Math.min(searchParams.offset! + searchParams.limit!, searchResults!.total)} of{' '}
            {searchResults!.total} results
          </span>
          <span className="ml-2 text-sm text-gray-500">
            ({searchResults!.execution_time.toFixed(2)}s)
          </span>
        </div>
        
        {/* Sort options */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          {[
            { id: 'score', label: 'Relevance' },
            { id: 'date', label: 'Date' },
            { id: 'title', label: 'Title' },
          ].map((sort) => (
            <button
              key={sort.id}
              onClick={() => handleSortChange(sort.id)}
              className={`rounded-md px-3 py-1 text-sm ${
                sortField === sort.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {sort.label}
              {sortField === sort.id && (
                <span className="ml-1">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Applied filters summary */}
      {Object.entries(searchResults!.filters_applied).length > 0 && (
        <div className="mb-4 rounded-md bg-gray-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filters:</span>
            {Object.entries(searchResults!.filters_applied).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-800"
              >
                {key.replace('_', ' ')}: {value.toString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-6">
        {searchResults!.results.map((result, index) => (
          <div 
            key={`result-${result.document.id}-${index}`}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  <a href={`/documents/${result.document.id}`} className="hover:text-primary-600">
                    {result.document.title}
                  </a>
                </h3>
                
                {/* Relevance score visualization */}
                <div className="ml-4 flex items-center">
                  <div className="flex h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${result.score * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                <span className="mr-4">
                  Type: {result.document.document_type}
                </span>
                <span className="mr-4">
                  Jurisdiction: {result.document.jurisdiction}
                </span>
                {result.document.publication_date && (
                  <span>
                    Published: {formatDate(result.document.publication_date)}
                  </span>
                )}
                <span className="ml-auto">
                  {result.document.word_count.toLocaleString()} words
                </span>
              </div>
              
              {/* Highlighted text snippets */}
              {result.highlights && result.highlights.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.highlights.map((highlight, i) => (
                    <p 
                      key={`highlight-${i}`}
                      className="text-sm text-gray-600"
                      dangerouslySetInnerHTML={{
                        __html: highlight
                          .replace(/<em>/g, '<span class="bg-yellow-100 font-medium">')
                          .replace(/<\/em>/g, '</span>')
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Match type badge */}
              {result.match_type && (
                <div className="mt-3">
                  <span className={`
                    inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${result.match_type === 'semantic' ? 'bg-blue-100 text-blue-800' : 
                      result.match_type === 'lexical' ? 'bg-green-100 text-green-800' : 
                      'bg-purple-100 text-purple-800'
                    }
                  `}>
                    {result.match_type} match
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(0)}
              disabled={currentPage === 1}
              className={`rounded-md border p-2 ${
                currentPage === 1
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">First</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={() => onPageChange(Math.max(0, searchParams.offset! - searchParams.limit!))}
              disabled={currentPage === 1}
              className={`rounded-md border p-2 ${
                currentPage === 1
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange((page - 1) * searchParams.limit!)}
                className={`rounded-md border px-3 py-2 ${
                  currentPage === page
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => onPageChange(Math.min(searchParams.offset! + searchParams.limit!, (totalPages - 1) * searchParams.limit!))}
              disabled={currentPage === totalPages}
              className={`rounded-md border p-2 ${
                currentPage === totalPages
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <button
              onClick={() => onPageChange((totalPages - 1) * searchParams.limit!)}
              disabled={currentPage === totalPages}
              className={`rounded-md border p-2 ${
                currentPage === totalPages
                  ? 'cursor-not-allowed border-gray-200 text-gray-400'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Last</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
