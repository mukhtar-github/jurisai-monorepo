'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Define types
interface LegalDocument {
  id: string;
  title: string;
  document_type: string;
  jurisdiction: string;
  publication_date: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  const searchParams = useSearchParams();
  const documentIds = searchParams.get('ids');


  // API URL (would normally be in env variables)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchDocuments();
    
    // Check if document IDs were passed in URL params
    if (documentIds) {
      const ids = documentIds.split(',');
      setSelectedDocuments(ids);
      setShowBatchActions(ids.length > 0);
    }
  }, [documentIds]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/documents`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again later.');
      // For development: Show sample data when API is not available
      setDocuments([
        {
          id: '1',
          title: 'Nigerian Constitution',
          document_type: 'Constitution',
          jurisdiction: 'Nigeria',
          publication_date: '1999-05-29',
          created_at: '2023-01-01T00:00:00',
        },
        {
          id: '2',
          title: 'Company and Allied Matters Act',
          document_type: 'Act',
          jurisdiction: 'Nigeria',
          publication_date: '2020-08-07',
          created_at: '2023-01-02T00:00:00',
        },
        {
          id: '3',
          title: 'Investment and Securities Act',
          document_type: 'Act',
          jurisdiction: 'Nigeria',
          publication_date: '2007-05-25',
          created_at: '2023-01-03T00:00:00',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter((doc) => {
    // If document IDs are provided and this document is not in the list, filter it out
    if (documentIds && !documentIds.split(',').includes(doc.id)) {
      return false;
    }
    
    return (
      doc.title.toLowerCase().includes(filter.toLowerCase()) &&
      (documentType === '' || doc.document_type === documentType) &&
      (jurisdiction === '' || doc.jurisdiction === jurisdiction)
    );
  });
  
  // Toggle document selection
  const toggleDocumentSelection = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      setSelectedDocuments(selectedDocuments.filter(id => id !== docId));
    } else {
      setSelectedDocuments([...selectedDocuments, docId]);
    }
  };
  
  // Toggle batch actions visibility
  const toggleBatchActions = () => {
    setShowBatchActions(!showBatchActions);
    if (!showBatchActions && selectedDocuments.length === 0) {
      // If turning on batch mode but no documents are selected, select all visible ones
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    } else if (!showBatchActions) {
      // If turning off batch mode, clear selections
      setSelectedDocuments([]);
    }
  };
  
  // Select or deselect all documents
  const toggleSelectAll = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Legal Documents</h1>
        <div className="flex flex-col md:flex-row gap-2">
          <button 
            onClick={toggleBatchActions}
            className={`btn ${showBatchActions ? 'btn-success' : 'btn-secondary'}`}
          >
            {showBatchActions ? 'Batch Mode: ON' : 'Batch Mode: OFF'}
          </button>
          <Link href="/documents/upload" className="btn btn-primary">
            Upload Document
          </Link>
          <Link href="/documents/batch-upload" className="btn btn-primary">
            Batch Upload
          </Link>
        </div>
      </div>
      
      {/* Batch actions */}
      {showBatchActions && selectedDocuments.length > 0 && (
        <div className="card p-4 mb-6 bg-blue-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-medium">{selectedDocuments.length}</span> documents selected
              <button 
                onClick={toggleSelectAll} 
                className="ml-4 text-blue-600 text-sm hover:underline"
              >
                {selectedDocuments.length === filteredDocuments.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link 
                href={`/documents/batch-export?ids=${selectedDocuments.join(',')}`}
                className="btn btn-sm btn-secondary"
              >
                Export Selected
              </Link>
              <Link 
                href={`/documents/batch-analyze?ids=${selectedDocuments.join(',')}`}
                className="btn btn-sm btn-secondary"
              >
                Analyze Selected
              </Link>
            </div>
          </div>
        </div>
      )

      {/* Search and filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              type="text"
              className="input"
              placeholder="Search documents..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="docType">
              Document Type
            </label>
            <select
              id="docType"
              className="select"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Constitution">Constitution</option>
              <option value="Act">Act</option>
              <option value="Regulation">Regulation</option>
              <option value="Case Law">Case Law</option>
              <option value="Treaty">Treaty</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="jurisdiction">
              Jurisdiction
            </label>
            <select
              id="jurisdiction"
              className="select"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="">All Jurisdictions</option>
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="Kenya">Kenya</option>
              <option value="South Africa">South Africa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading documents...</div>
        </div>
      ) : error ? (
        <div className="card bg-red-50 text-red-700 p-4">{error}</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">No documents found matching your criteria.</p>
          <button onClick={fetchDocuments} className="btn btn-secondary">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                {showBatchActions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input 
                      type="checkbox" 
                      checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jurisdiction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  {showBatchActions && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/documents/${doc.id}`} className="text-blue-600 hover:underline font-medium">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.document_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.jurisdiction}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.publication_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link href={`/documents/${doc.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                      <span className="text-gray-300">|</span>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
