'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// Inner component with useSearchParams
function BatchAnalyzeContent() {
  const searchParams = useSearchParams();
  const documentIds = searchParams.get('ids') || '';
  const router = useRouter();
  
  const [analyzeOptions, setAnalyzeOptions] = useState({
    entities: true,
    key_terms: true,
    summaries: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API URL (would normally be in env variables)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleCheckboxChange = (field: keyof typeof analyzeOptions) => {
    setAnalyzeOptions({
      ...analyzeOptions,
      [field]: !analyzeOptions[field]
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!documentIds) {
      setError('No documents selected for analysis');
      return;
    }
    
    // Check if at least one analysis option is selected
    if (!analyzeOptions.entities && !analyzeOptions.key_terms && !analyzeOptions.summaries) {
      setError('Please select at least one analysis option');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Create analysis request
      const response = await fetch(`${API_URL}/documents/batch-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: documentIds.split(','),
          extract_entities: analyzeOptions.entities,
          extract_key_terms: analyzeOptions.key_terms,
          generate_summaries: analyzeOptions.summaries
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze documents');
      }
      
      const result = await response.json();
      
      // Redirect to batch status page to monitor analysis progress
      if (result.batch_id) {
        router.push(`/documents/batch-status/${result.batch_id}`);
      } else {
        // If no batch ID is returned, go back to documents page
        router.push('/documents');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze documents');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Batch Document Analysis</h1>
        <Link href="/documents" className="btn btn-secondary">
          Back to Documents
        </Link>
      </div>
      
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected document count */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              <span className="font-bold">{documentIds ? documentIds.split(',').length : 0}</span> documents selected for analysis
            </p>
          </div>
          
          {/* Analysis options */}
          <div className="space-y-4">
            <label className="label font-medium">Analysis Options</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={analyzeOptions.entities}
                  onChange={() => handleCheckboxChange('entities')}
                  className="checkbox"
                />
                <div>
                  <span className="font-medium">Extract Entities</span>
                  <p className="text-sm text-gray-500">Identify legal entities, dates, people, and organizations</p>
                </div>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={analyzeOptions.key_terms}
                  onChange={() => handleCheckboxChange('key_terms')}
                  className="checkbox"
                />
                <div>
                  <span className="font-medium">Extract Key Terms</span>
                  <p className="text-sm text-gray-500">Identify important legal terminology and concepts</p>
                </div>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={analyzeOptions.summaries}
                  onChange={() => handleCheckboxChange('summaries')}
                  className="checkbox"
                />
                <div>
                  <span className="font-medium">Generate Summaries</span>
                  <p className="text-sm text-gray-500">Create concise summaries of document content</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Note about processing time */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-1">Note</h3>
            <p className="text-sm text-yellow-700">
              Analysis will be performed in the background. Larger documents and bigger batches may take longer to process.
              You'll be redirected to a status page where you can monitor progress.
            </p>
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
              disabled={isAnalyzing || !documentIds}
            >
              {isAnalyzing ? 'Starting Analysis...' : 'Analyze Documents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Wrapper component with Suspense
export default function BatchAnalyzePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading batch analyze options...</div>}>
      <BatchAnalyzeContent />
    </Suspense>
  );
}
