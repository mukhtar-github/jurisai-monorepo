'use client';

import { useState } from 'react';
import { 
  useVectorIndexStatus, 
  useRebuildVectorIndex, 
  useIndexRebuildStatus, 
  useGenerateDocumentEmbeddings 
} from '@/lib/hooks/useRAG';
import { formatDate } from '@/lib/utils';

interface VectorIndexManagerProps {
  availableDocumentTypes?: string[];
  availableJurisdictions?: string[];
}

const VectorIndexManager = ({
  availableDocumentTypes = [],
  availableJurisdictions = [],
}: VectorIndexManagerProps) => {
  const [rebuildFilters, setRebuildFilters] = useState<{
    document_types: string[];
    jurisdictions: string[];
  }>({
    document_types: [],
    jurisdictions: [],
  });
  
  const [rebuildJobId, setRebuildJobId] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');

  // Vector index status
  const { 
    data: indexStatus, 
    isLoading: isLoadingStatus, 
    isError: isStatusError,
    refetch: refetchStatus
  } = useVectorIndexStatus();

  // Rebuild vector index
  const rebuildMutation = useRebuildVectorIndex();

  // Generate embeddings for a specific document
  const generateEmbeddings = useGenerateDocumentEmbeddings();

  // Get job status if we have a job ID
  const { 
    data: jobStatus, 
    isLoading: isLoadingJobStatus 
  } = useIndexRebuildStatus(rebuildJobId);

  // Handle filter toggle for rebuild
  const handleFilterToggle = (
    type: 'document_types' | 'jurisdictions',
    value: string,
    checked: boolean
  ) => {
    setRebuildFilters((prev) => {
      const current = prev[type];
      const updated = checked
        ? [...current, value]
        : current.filter((v) => v !== value);
      
      return {
        ...prev,
        [type]: updated,
      };
    });
  };

  // Start rebuilding the vector index
  const handleRebuildIndex = async () => {
    try {
      const filters: {
        document_types?: string[];
        jurisdictions?: string[];
      } = {};
      
      if (rebuildFilters.document_types.length > 0) {
        filters.document_types = rebuildFilters.document_types;
      }
      
      if (rebuildFilters.jurisdictions.length > 0) {
        filters.jurisdictions = rebuildFilters.jurisdictions;
      }
      
      const result = await rebuildMutation.mutateAsync(filters);
      setRebuildJobId(result.job_id);
    } catch (error) {
      console.error('Failed to start rebuild job:', error);
    }
  };

  // Generate embeddings for a specific document
  const handleGenerateEmbeddings = async () => {
    const id = parseInt(documentId);
    if (isNaN(id) || id <= 0) return;
    
    try {
      await generateEmbeddings.mutateAsync({
        document_id: id,
        chunk_size: 1000,
        chunk_overlap: 200,
      });
      
      // Refresh index status
      refetchStatus();
      setDocumentId('');
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Index Status Card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-lg font-medium text-gray-900">Vector Index Status</h3>
        </div>
        
        <div className="p-4">
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading index status...</span>
            </div>
          ) : isStatusError ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Unable to fetch index status</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>There was an error loading the vector index status.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">Total Documents</p>
                  <p className="mt-1 text-3xl font-semibold text-blue-900">
                    {indexStatus?.total_documents.toLocaleString()}
                  </p>
                </div>
                
                <div className="rounded-md bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">Total Chunks</p>
                  <p className="mt-1 text-3xl font-semibold text-green-900">
                    {indexStatus?.total_chunks.toLocaleString()}
                  </p>
                </div>
                
                <div className="rounded-md bg-indigo-50 p-4">
                  <p className="text-sm font-medium text-indigo-800">Embedding Model</p>
                  <p className="mt-1 text-lg font-semibold text-indigo-900">
                    {indexStatus?.model_info.name}
                  </p>
                  <p className="text-xs text-indigo-700">
                    {indexStatus?.model_info.dimensions} dimensions
                  </p>
                </div>
                
                <div className="rounded-md bg-purple-50 p-4">
                  <p className="text-sm font-medium text-purple-800">Last Updated</p>
                  <p className="mt-1 text-lg font-semibold text-purple-900">
                    {indexStatus?.last_updated ? formatDate(indexStatus.last_updated) : 'Never'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Document types breakdown */}
                <div className="rounded-md border border-gray-200 p-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Document Types</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {indexStatus?.document_types.map((type) => (
                          <tr key={type.document_type}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {type.document_type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                              {type.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Jurisdictions breakdown */}
                <div className="rounded-md border border-gray-200 p-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">Jurisdictions</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jurisdiction
                          </th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {indexStatus?.jurisdictions.map((jurisdiction) => (
                          <tr key={jurisdiction.jurisdiction}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {jurisdiction.jurisdiction}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                              {jurisdiction.count.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rebuild Index Card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-lg font-medium text-gray-900">Manage Vector Index</h3>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {/* Single document embedding */}
            <div className="rounded-md border border-gray-200 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">Generate Embeddings for Document</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Enter document ID"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="block w-64 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
                <button
                  onClick={handleGenerateEmbeddings}
                  disabled={generateEmbeddings.isPending || !documentId}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generateEmbeddings.isPending ? 'Processing...' : 'Generate'}
                </button>
              </div>
              {generateEmbeddings.isError && (
                <p className="mt-2 text-sm text-red-600">
                  Failed to generate embeddings. Please check the document ID and try again.
                </p>
              )}
              {generateEmbeddings.isSuccess && (
                <p className="mt-2 text-sm text-green-600">
                  Embeddings generated successfully!
                </p>
              )}
            </div>
            
            {/* Rebuild index */}
            <div className="rounded-md border border-gray-200 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">Rebuild Vector Index</h4>
              
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Document type filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Filter by Document Type
                  </label>
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
                    {availableDocumentTypes.map((type) => (
                      <div key={type} className="flex items-center">
                        <input
                          id={`rebuild-doctype-${type}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={rebuildFilters.document_types.includes(type)}
                          onChange={(e) => handleFilterToggle('document_types', type, e.target.checked)}
                        />
                        <label htmlFor={`rebuild-doctype-${type}`} className="ml-2 text-sm text-gray-700">
                          {type}
                        </label>
                      </div>
                    ))}
                    {availableDocumentTypes.length === 0 && (
                      <p className="text-xs text-gray-500 py-1">No document types available</p>
                    )}
                  </div>
                </div>
                
                {/* Jurisdiction filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Filter by Jurisdiction
                  </label>
                  <div className="mt-1 max-h-32 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
                    {availableJurisdictions.map((jurisdiction) => (
                      <div key={jurisdiction} className="flex items-center">
                        <input
                          id={`rebuild-jurisdiction-${jurisdiction}`}
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={rebuildFilters.jurisdictions.includes(jurisdiction)}
                          onChange={(e) => handleFilterToggle('jurisdictions', jurisdiction, e.target.checked)}
                        />
                        <label htmlFor={`rebuild-jurisdiction-${jurisdiction}`} className="ml-2 text-sm text-gray-700">
                          {jurisdiction}
                        </label>
                      </div>
                    ))}
                    {availableJurisdictions.length === 0 && (
                      <p className="text-xs text-gray-500 py-1">No jurisdictions available</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={handleRebuildIndex}
                    disabled={rebuildMutation.isPending || rebuildJobId !== ''}
                    className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rebuildMutation.isPending ? 'Starting rebuild...' : 'Rebuild Index'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    {rebuildFilters.document_types.length === 0 && rebuildFilters.jurisdictions.length === 0
                      ? 'This will rebuild the entire vector index for all documents'
                      : 'Rebuilding only for the selected filters'}
                  </p>
                </div>
                
                {/* Job status */}
                {rebuildJobId && jobStatus && (
                  <div className="rounded-md bg-blue-50 px-4 py-2">
                    <div className="flex items-center">
                      {jobStatus.status === 'running' || jobStatus.status === 'pending' ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      ) : jobStatus.status === 'completed' ? (
                        <svg className="mr-2 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="mr-2 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          {jobStatus.status === 'running' ? 'Rebuilding index...' :
                           jobStatus.status === 'pending' ? 'Waiting to start...' :
                           jobStatus.status === 'completed' ? 'Rebuild complete!' :
                           'Rebuild failed'}
                        </p>
                        {(jobStatus.status === 'running' || jobStatus.status === 'pending') && (
                          <div className="mt-1">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-blue-200">
                              <div
                                className="h-full bg-blue-600"
                                style={{ width: `${jobStatus.progress * 100}%` }}
                              ></div>
                            </div>
                            <p className="mt-1 text-xs text-blue-700">
                              {Math.round(jobStatus.progress * 100)}% complete
                            </p>
                          </div>
                        )}
                        {jobStatus.error && (
                          <p className="mt-1 text-xs text-red-600">{jobStatus.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorIndexManager;
