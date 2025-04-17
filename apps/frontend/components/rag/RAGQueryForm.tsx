'use client';

import { useState, useRef } from 'react';
import { useRAGQuery, useOneTimeRAGQuery } from '@/lib/hooks/useRAG';
import { RAGQueryParams } from '@/lib/api/types';
import Markdown from 'react-markdown';
// PDF functionality disabled for MVP
// import { 
//   generateRAGQueryPDF, 
//   downloadPDF 
// } from '@/lib/services/pdfService';
import { 
  showSuccess, 
  showError 
} from '@/lib/services/notificationService';

interface RAGQueryFormProps {
  initialDocumentIds?: number[];
  availableDocumentTypes?: string[];
  availableJurisdictions?: string[];
}

const RAGQueryForm = ({
  initialDocumentIds = [],
  availableDocumentTypes = [],
  availableJurisdictions = [],
}: RAGQueryFormProps) => {
  const [queryParams, setQueryParams] = useState<RAGQueryParams>({
    query: '',
    max_length: 1000,
    focus_areas: [],
    document_ids: initialDocumentIds || [],
    context_docs: initialDocumentIds || [],
    max_docs: 5,
    temperature: 0.7,
    filter: {
      document_types: [],
      jurisdictions: [],
    },
    response_format: 'markdown',
    include_sources: true,
  });

  const [executeQuery, setExecuteQuery] = useState(false);
  
  // For one-time query execution (without caching)
  const oneTimeQuery = useOneTimeRAGQuery();

  // For querying with caching
  const ragQuery = useRAGQuery(
    executeQuery ? queryParams : { ...queryParams, query: '' }
  );

  // Clear cached query results when params change
  const handleQueryParamChange = (
    param: keyof RAGQueryParams,
    value: any
  ) => {
    setQueryParams((prev) => ({ ...prev, [param]: value }));
    setExecuteQuery(false);
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: 'document_types' | 'jurisdictions',
    value: string,
    checked: boolean
  ) => {
    setQueryParams((prev) => {
      const currentValues = prev.filter?.[filterType] || [];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value);

      return {
        ...prev,
        filter: {
          ...prev.filter,
          [filterType]: newValues,
        },
      };
    });
    setExecuteQuery(false);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryParams.query.trim()) return;
    setExecuteQuery(true);
  };

  // Handle one-time query execution
  const handleOneTimeQuery = () => {
    if (!queryParams.query.trim()) return;
    oneTimeQuery.mutate(queryParams);
  };

  // Display results
  const result = executeQuery
    ? ragQuery.data
    : oneTimeQuery.data;
    
  const isLoading = executeQuery
    ? ragQuery.isPending
    : oneTimeQuery.isPending;
    
  const isError = executeQuery
    ? ragQuery.isError
    : oneTimeQuery.isError;

  // Add refs for content to download
  const responseContentRef = useRef<HTMLDivElement>(null);

  // Add function to download content as PDF
  // const handleDownloadPDF = async () => {
  //   if (!responseContentRef.current || !result) return;
    
  //   try {
  //     // Display loading state
  //     const button = document.getElementById('download-pdf-button');
  //     if (button) {
  //       button.textContent = 'Generating PDF...';
  //       button.setAttribute('disabled', 'true');
  //     }
      
  //     // Generate PDF using our dedicated service
  //     const pdf = await generateRAGQueryPDF(
  //       responseContentRef.current,
  //       queryParams.query,
  //       result
  //     );
      
  //     // Download the PDF with a properly formatted filename
  //     const filename = `jurisai-legal-query-response`;
  //     downloadPDF(pdf, filename);
      
  //     // Show success notification
  //     showSuccess('PDF successfully generated and downloaded');
      
  //     // Reset button state
  //     if (button) {
  //       button.textContent = 'Download as PDF';
  //       button.removeAttribute('disabled');
  //     }
  //   } catch (error) {
  //     console.error('Error generating PDF:', error);
      
  //     // Show error notification
  //     showError('Failed to generate PDF. Please try again.');
      
  //     // Reset button state
  //     const button = document.getElementById('download-pdf-button');
  //     if (button) {
  //       button.textContent = 'Download as PDF';
  //       button.removeAttribute('disabled');
  //     }
  //   }
  // };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="rounded-md border border-gray-300 bg-white shadow-sm">
          {/* Query input */}
          <div className="p-4">
            <label
              htmlFor="query"
              className="block text-sm font-medium text-gray-700"
            >
              Legal Query
            </label>
            <div className="mt-1">
              <textarea
                id="query"
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                placeholder="Ask a legal question or request analysis..."
                value={queryParams.query}
                onChange={(e) =>
                  handleQueryParamChange('query', e.target.value)
                }
              />
            </div>
          </div>

          {/* Advanced options (collapsible) */}
          <details className="border-t border-gray-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Advanced Options
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Document filters */}
              <div>
                <fieldset>
                  <legend className="text-xs font-medium text-gray-700">
                    Document Types
                  </legend>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {availableDocumentTypes.map((type) => (
                      <div key={type} className="flex items-center">
                        <input
                          id={`doc-type-${type}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={
                            queryParams.filter?.document_types?.includes(type) ||
                            false
                          }
                          onChange={(e) =>
                            handleFilterChange(
                              'document_types',
                              type,
                              e.target.checked
                            )
                          }
                        />
                        <label
                          htmlFor={`doc-type-${type}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div>
                <fieldset>
                  <legend className="text-xs font-medium text-gray-700">
                    Jurisdictions
                  </legend>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {availableJurisdictions.map((jurisdiction) => (
                      <div key={jurisdiction} className="flex items-center">
                        <input
                          id={`jurisdiction-${jurisdiction}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={
                            queryParams.filter?.jurisdictions?.includes(
                              jurisdiction
                            ) || false
                          }
                          onChange={(e) =>
                            handleFilterChange(
                              'jurisdictions',
                              jurisdiction,
                              e.target.checked
                            )
                          }
                        />
                        <label
                          htmlFor={`jurisdiction-${jurisdiction}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {jurisdiction}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Model parameters */}
              <div>
                <label
                  htmlFor="max_docs"
                  className="block text-xs font-medium text-gray-700"
                >
                  Max Documents to Consider
                </label>
                <select
                  id="max_docs"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  value={queryParams.max_docs}
                  onChange={(e) =>
                    handleQueryParamChange('max_docs', Number(e.target.value))
                  }
                >
                  {[3, 5, 10, 15, 20].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="temperature"
                  className="block text-xs font-medium text-gray-700"
                >
                  Temperature: {queryParams.temperature}
                </label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  className="mt-1 w-full"
                  value={queryParams.temperature}
                  onChange={(e) =>
                    handleQueryParamChange(
                      'temperature',
                      parseFloat(e.target.value)
                    )
                  }
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="response_format"
                  className="block text-xs font-medium text-gray-700"
                >
                  Response Format
                </label>
                <select
                  id="response_format"
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  value={queryParams.response_format}
                  onChange={(e) =>
                    handleQueryParamChange(
                      'response_format',
                      e.target.value as 'text' | 'json' | 'markdown'
                    )
                  }
                >
                  <option value="text">Plain text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
          </details>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={handleOneTimeQuery}
              disabled={isLoading || !queryParams.query.trim()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Execute Once
            </button>
            <button
              type="submit"
              disabled={isLoading || !queryParams.query.trim()}
              className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Generate Response'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6 rounded-md border border-gray-300 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-lg font-medium text-gray-900">Response</h3>
            <p className="text-sm text-gray-500">
              Generated in {result.processing_time.toFixed(2)}s using{' '}
              {result.model}
            </p>
          </div>
          <div className="p-4">
            {queryParams.response_format === 'markdown' ? (
              <div className="prose max-w-none">
                {/* Add download button */}
                {/* {result && result.response && (
                  <div className="mb-4 flex justify-end">
                    <button
                      id="download-pdf-button"
                      // onClick={handleDownloadPDF}
                      className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="mr-2 h-4 w-4" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                      Download as PDF
                    </button>
                  </div>
                )} */}
                
                {/* Update ref to include both response and sources in the PDF content */}
                <div className="markdown-content" ref={responseContentRef}>
                  {result.response ? 
                    <div>
                      <Markdown>{result.response}</Markdown>
                    </div> : null
                  }
                </div>
              </div>
            ) : queryParams.response_format === 'json' ? (
              <pre className="overflow-auto rounded-md bg-gray-50 p-4 text-sm">
                {result.response}
              </pre>
            ) : (
              <p className="whitespace-pre-wrap">{result.response}</p>
            )}
          </div>

          {/* Source documents */}
          {((result.source_documents && result.source_documents.length > 0) || 
            (result.sources && result.sources.length > 0)) && (
            <div className="border-t border-gray-200 px-4 py-3">
              <h4 className="text-sm font-medium text-gray-700">
                Sources ({result.source_documents?.length || result.sources?.length || 0})
              </h4>
              <div className="mt-2 space-y-3">
                {/* Handle legacy source_documents format */}
                {result.source_documents?.map((source, idx) => (
                  <div
                    key={`legacy-source-${idx}`}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <h5 className="text-sm font-medium text-gray-900">
                        <a
                          href={`/documents/${source.document.id}`}
                          className="hover:text-primary-600"
                        >
                          {source.document.title}
                        </a>
                      </h5>
                      <span className="text-xs text-gray-500">
                        Relevance: {(source.relevance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {source.chunk_text.length > 150
                        ? `${source.chunk_text.substring(0, 150)}...`
                        : source.chunk_text}
                    </p>
                  </div>
                ))}
                
                {/* Handle new sources format */}
                {result.sources?.map((source, idx) => (
                  <div
                    key={`source-${idx}`}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <h5 className="text-sm font-medium text-gray-900">
                        <a
                          href={`/documents/${source.document_id}`}
                          className="hover:text-primary-600"
                        >
                          {source.title || `Document #${source.document_id}`}
                        </a>
                      </h5>
                    </div>
                    {source.metadata && (
                      <p className="mt-1 text-xs text-gray-600">
                        {source.metadata}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error processing your query
              </h3>
              <p className="mt-2 text-sm text-red-700">
                There was an error generating a response. Please try again or
                contact support if the issue persists.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGQueryForm;
