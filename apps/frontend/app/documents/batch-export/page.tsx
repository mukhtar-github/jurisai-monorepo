'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// This component will use the useSearchParams hook
function BatchExportContent() {
  const searchParams = useSearchParams();
  const documentIds = searchParams.get('ids') || '';
  const router = useRouter();
  
  const [exportFormat, setExportFormat] = useState('json');
  const [includeOptions, setIncludeOptions] = useState({
    metadata: true,
    content: true,
    entities: false,
    key_terms: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API URL (would normally be in env variables)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleCheckboxChange = (field: keyof typeof includeOptions) => {
    setIncludeOptions({
      ...includeOptions,
      [field]: !includeOptions[field]
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!documentIds) {
      setError('No documents selected for export');
      return;
    }
    
    setIsExporting(true);
    setError(null);
    
    try {
      // Create export request
      const response = await fetch(`${API_URL}/documents/batch-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: documentIds.split(','),
          format: exportFormat,
          include_metadata: includeOptions.metadata,
          include_content: includeOptions.content,
          include_entities: includeOptions.entities,
          include_key_terms: includeOptions.key_terms
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to export documents');
      }
      
      // Handle file download (for browser)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Generate filename based on format
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `document-export-${timestamp}.${exportFormat === 'json' ? 'json' : exportFormat === 'csv' ? 'csv' : 'txt'}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Navigate back to documents page after successful export
      router.push('/documents');
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export documents');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Batch Document Export</h1>
        <Link href="/documents" className="btn btn-secondary">
          Back to Documents
        </Link>
      </div>
      
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected document count */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              <span className="font-bold">{documentIds ? documentIds.split(',').length : 0}</span> documents selected for export
            </p>
          </div>
          
          {/* Export format */}
          <div className="space-y-2">
            <label className="label font-medium">Export Format</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                  className="radio"
                />
                <span>JSON</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="radio"
                />
                <span>CSV</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="format"
                  value="txt"
                  checked={exportFormat === 'txt'}
                  onChange={() => setExportFormat('txt')}
                  className="radio"
                />
                <span>Text</span>
              </label>
            </div>
          </div>
          
          {/* Include options */}
          <div className="space-y-2">
            <label className="label font-medium">Include in Export</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeOptions.metadata}
                  onChange={() => handleCheckboxChange('metadata')}
                  className="checkbox"
                />
                <span>Metadata</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeOptions.content}
                  onChange={() => handleCheckboxChange('content')}
                  className="checkbox"
                />
                <span>Document Content</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeOptions.entities}
                  onChange={() => handleCheckboxChange('entities')}
                  className="checkbox"
                />
                <span>Extracted Entities</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeOptions.key_terms}
                  onChange={() => handleCheckboxChange('key_terms')}
                  className="checkbox"
                />
                <span>Key Terms</span>
              </label>
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {/* Submit buttons */}
          <div className="flex justify-end space-x-3">
            <Link href="/documents" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isExporting || !documentIds}
            >
              {isExporting ? 'Exporting...' : 'Export Documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Wrap the main component with Suspense to fix the error
export default function BatchExportPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading batch export options...</div>}>
      <BatchExportContent />
    </Suspense>
  );
}
