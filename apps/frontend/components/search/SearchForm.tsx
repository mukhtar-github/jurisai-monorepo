'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHybridSearch, useSearchSuggestions } from '@/lib/hooks/useSearch';
import { DocumentSearchParams } from '@/lib/api/types';
import debounce from 'lodash/debounce';

interface SearchFormProps {
  initialSearchParams?: DocumentSearchParams;
  onSearch?: (params: DocumentSearchParams) => void;
  availableDocumentTypes?: string[];
  availableJurisdictions?: string[];
}

const DEFAULT_SEARCH_PARAMS: DocumentSearchParams = {
  query: '',
  search_strategy: 'hybrid',
  limit: 20,
  offset: 0,
};

const SearchForm = ({
  initialSearchParams = DEFAULT_SEARCH_PARAMS,
  onSearch,
  availableDocumentTypes = [],
  availableJurisdictions = [],
}: SearchFormProps) => {
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>(initialSearchParams);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Debounced suggestions query to prevent excessive API calls
  const debouncedQuery = useCallback(
    debounce((query: string) => {
      if (query.length >= 2) {
        setSearchParams(prev => ({ ...prev, query }));
      }
    }, 300),
    []
  );
  
  // Get search suggestions as user types
  const { data: suggestionData } = useSearchSuggestions(searchParams.query);
  
  // Handle input change with debounce
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    // Update UI immediately
    setSearchParams(prev => ({ ...prev, query }));
    // Debounced search suggestions
    debouncedQuery(query);
    
    if (query.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    setSearchParams(prev => ({ ...prev, query: suggestion }));
    setShowSuggestions(false);
  };
  
  // Handle parameter changes
  const handleParamChange = (param: keyof DocumentSearchParams, value: string | number | boolean | undefined) => {
    setSearchParams(prev => ({ ...prev, [param]: value }));
  };
  
  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchParams);
    }
  };

  // Handle search strategy change
  const handleStrategyChange = (strategy: 'semantic' | 'lexical' | 'hybrid') => {
    setSearchParams(prev => ({ ...prev, search_strategy: strategy }));
  };
  
  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedQuery.cancel();
    };
  }, [debouncedQuery]);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main search input with suggestions */}
        <div className="relative">
          <div className="flex">
            <input
              type="text"
              value={searchParams.query}
              onChange={handleQueryChange}
              placeholder="Search legal documents..."
              className="w-full rounded-l-lg border border-gray-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onFocus={() => searchParams.query.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button
              type="submit"
              className="rounded-r-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Search
            </button>
          </div>
          
          {/* Search suggestions dropdown */}
          {showSuggestions && suggestionData?.suggestions && suggestionData.suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
              <ul className="max-h-60 overflow-auto py-1">
                {suggestionData.suggestions.map((suggestion, index) => (
                  <li
                    key={`suggestion-${index}`}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Advanced filters (collapsible) */}
        <details className="rounded-md border border-gray-300 p-4">
          <summary className="cursor-pointer font-medium">Advanced Filters</summary>
          
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Document Type Filter */}
            <div>
              <label htmlFor="document_type" className="block text-sm font-medium text-gray-700">
                Document Type
              </label>
              <select
                id="document_type"
                value={searchParams.document_type || ''}
                onChange={(e) => handleParamChange('document_type', e.target.value || undefined)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              >
                <option value="">All Document Types</option>
                {availableDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Jurisdiction Filter */}
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
                Jurisdiction
              </label>
              <select
                id="jurisdiction"
                value={searchParams.jurisdiction || ''}
                onChange={(e) => handleParamChange('jurisdiction', e.target.value || undefined)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              >
                <option value="">All Jurisdictions</option>
                {availableJurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction} value={jurisdiction}>
                    {jurisdiction}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Entity Type Filter */}
            <div>
              <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700">
                Entity Type
              </label>
              <input
                type="text"
                id="entity_type"
                value={searchParams.entity_type || ''}
                onChange={(e) => handleParamChange('entity_type', e.target.value || undefined)}
                placeholder="e.g., Person, Organization"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              />
            </div>
            
            {/* Results limit */}
            <div>
              <label htmlFor="limit" className="block text-sm font-medium text-gray-700">
                Results Per Page
              </label>
              <select
                id="limit"
                value={searchParams.limit || 20}
                onChange={(e) => handleParamChange('limit', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            {/* Search Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Search Strategy</label>
              <div className="mt-1 flex space-x-4">
                {(['semantic', 'lexical', 'hybrid'] as const).map((strategy) => (
                  <label key={strategy} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={searchParams.search_strategy === strategy}
                      onChange={() => handleStrategyChange(strategy)}
                      className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm capitalize">{strategy}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {searchParams.search_strategy === 'semantic' && 'Finds conceptually related documents using AI'}
                {searchParams.search_strategy === 'lexical' && 'Finds exact keyword matches in documents'}
                {searchParams.search_strategy === 'hybrid' && 'Combines semantic and lexical search for best results'}
              </p>
            </div>
          </div>
        </details>
      </form>
    </div>
  );
};

export default SearchForm;
