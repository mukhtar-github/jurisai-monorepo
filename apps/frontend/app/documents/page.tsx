'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDocumentList, useDocumentDelete, useBatchAnalyze } from '../../lib/hooks';
import { useDocumentContext } from '../../lib/context/DocumentContext';
import type { LegalDocument } from '../../lib/api/types';

// This component contains the useSearchParams hook
function DocumentsContent() {
  const [filter, setFilter] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [showBatchActions, setShowBatchActions] = useState(false);

  const searchParams = useSearchParams();
  const documentIds = searchParams.get('ids');

  // Use our custom hooks
  const { 
    data: documentsData, 
    isLoading: loading, 
    error: queryError,
    refetch
  } = useDocumentList({
    document_type: documentType || undefined,
    jurisdiction: jurisdiction || undefined,
  });

  const { 
    selectedDocuments, 
    setSelectedDocuments, 
    addToSelection, 
    removeFromSelection, 
    clearSelection, 
    isSelected 
  } = useDocumentContext();

  const { mutate: deleteDocument } = useDocumentDelete();
  const { mutate: batchAnalyze } = useBatchAnalyze();

  useEffect(() => {
    // Check if document IDs were passed in URL params
    if (documentIds) {
      const ids = documentIds.split(',').map(id => parseInt(id, 10));
      setSelectedDocumentIds(ids);
      setShowBatchActions(ids.length > 0);
    }
  }, [documentIds]);

  const handleSelectDocument = (document: LegalDocument) => {
    if (isSelected(document.id)) {
      removeFromSelection(document.id);
    } else {
      addToSelection(document);
    }
    updateSelectedIds();
  };

  const updateSelectedIds = () => {
    const ids = selectedDocuments.map(doc => doc.id);
    setSelectedDocumentIds(ids);
    setShowBatchActions(ids.length > 0);
  };

  const handleSelectAll = () => {
    if (documentsData?.items && selectedDocuments.length < documentsData.items.length) {
      setSelectedDocuments(documentsData.items);
    } else {
      clearSelection();
    }
    updateSelectedIds();
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument(documentId, {
        onSuccess: () => {
          refetch();
        }
      });
    }
  };

  const handleBatchAnalyze = () => {
    batchAnalyze({
      document_ids: selectedDocumentIds,
      analysis_types: ['entities', 'key_terms', 'summary']
    }, {
      onSuccess: () => {
        alert('Batch analysis started successfully!');
      },
      onError: (error) => {
        alert(`Error starting batch analysis: ${error}`);
      }
    });
  };

  const filteredDocuments = documentsData?.items?.filter(doc => 
    doc.title.toLowerCase().includes(filter.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(filter.toLowerCase()) ||
    doc.jurisdiction.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  const error = queryError ? (queryError as Error).message : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Legal Documents</h1>
        <Link href="/documents/batch-upload">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Upload Documents
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full p-2 border rounded"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <select
            className="w-full p-2 border rounded"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">All Document Types</option>
            {documentsData?.filters?.document_types?.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <select
            className="w-full p-2 border rounded"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            <option value="">All Jurisdictions</option>
            {documentsData?.filters?.jurisdictions?.map((jur) => (
              <option key={jur} value={jur}>{jur}</option>
            ))}
          </select>
        </div>
      </div>

      {showBatchActions && (
        <div className="bg-gray-100 p-4 rounded-lg flex flex-col md:flex-row gap-2">
          <span className="font-semibold">{selectedDocumentIds.length} documents selected</span>
          <div className="flex gap-2 ml-auto">
            <Link href={`/documents/batch-analyze?ids=${selectedDocumentIds.join(',')}`}>
              <button className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
                Analyze
              </button>
            </Link>
            <Link href={`/documents/batch-export?ids=${selectedDocumentIds.join(',')}`}>
              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                Export
              </button>
            </Link>
            <button 
              onClick={() => clearSelection()}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Error and Loading States */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading documents...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">
                  <input 
                    type="checkbox" 
                    checked={documentsData?.items && selectedDocuments.length === documentsData.items.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="py-2 px-4 text-left">Title</th>
                <th className="py-2 px-4 text-left">Type</th>
                <th className="py-2 px-4 text-left">Jurisdiction</th>
                <th className="py-2 px-4 text-left">Date</th>
                <th className="py-2 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No documents found
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <input 
                        type="checkbox" 
                        checked={isSelected(doc.id)}
                        onChange={() => handleSelectDocument(doc)}
                      />
                    </td>
                    <td className="py-2 px-4 font-medium">
                      <Link href={`/documents/${doc.id}`}>
                        <span className="text-blue-600 hover:underline">{doc.title}</span>
                      </Link>
                    </td>
                    <td className="py-2 px-4">{doc.document_type}</td>
                    <td className="py-2 px-4">{doc.jurisdiction}</td>
                    <td className="py-2 px-4">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-4">
                      <div className="flex space-x-2">
                        <Link href={`/documents/${doc.id}/analyze`}>
                          <button className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">
                            Analyze
                          </button>
                        </Link>
                        <Link href={`/documents/${doc.id}/export`}>
                          <button className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                            Export
                          </button>
                        </Link>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)} 
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && documentsData?.total && documentsData.total > 0 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-gray-500">
            Showing {filteredDocuments.length} of {documentsData.total} documents
          </p>
          <div className="flex space-x-2">
            <button 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              disabled={documentsData.skip === 0}
              onClick={() => {
                /* Implement pagination */
              }}
            >
              Previous
            </button>
            <button 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              disabled={(documentsData.skip + documentsData.limit) >= documentsData.total}
              onClick={() => {
                /* Implement pagination */
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main component wrapped with Suspense
export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading documents...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
