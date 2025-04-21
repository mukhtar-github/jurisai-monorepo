'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface BatchStatus {
  batch_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  documents: {
    total: number;
    processed: number;
    failed: number;
    analyzed: number;
  };
  started_at: string | null;
  completed_at: string | null;
  document_ids: number[];
}

export default function BatchStatusPage() {
  const { batchId } = useParams();
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(5000); // 5 seconds

  // API URL (would normally be in env variables)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch batch status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/documents/batch-status/${batchId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
      
      // Stop auto-refreshing if the batch is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setRefreshInterval(null);
      }
    } catch (err) {
      console.error('Failed to fetch batch status:', err);
      setError('Failed to load batch status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Set up polling
  useEffect(() => {
    fetchStatus();
    
    // Set up auto-refresh if needed
    let intervalId: NodeJS.Timeout | null = null;
    
    if (refreshInterval !== null) {
      intervalId = setInterval(fetchStatus, refreshInterval);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [batchId, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!status || !status.documents.total) return 0;
    return Math.round((status.documents.processed / status.documents.total) * 100);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Status badge color
  const getStatusColor = () => {
    if (!status) return 'bg-gray-200';
    
    switch (status.status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Batch Processing Status</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/documents" className="btn btn-primary">
            Back to Documents
          </Link>
        </div>
      </div>

      {loading && !status ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading batch status...</div>
        </div>
      ) : error ? (
        <div className="card bg-red-50 text-red-700 p-4">{error}</div>
      ) : !status ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No batch information found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="card p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium">Batch {status.batch_id}</h2>
                <div className="flex items-center mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                    {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                  </span>
                </div>
              </div>
              {status.status === 'in_progress' && (
                <div className="text-sm text-gray-500">
                  Auto-refreshing every 5 seconds
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {calculateProgress()}%</span>
                <span>{status.documents.processed} of {status.documents.total} processed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Total Documents</div>
                <div className="text-xl font-semibold">{status.documents.total}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Processed</div>
                <div className="text-xl font-semibold text-green-600">{status.documents.processed}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Failed</div>
                <div className="text-xl font-semibold text-red-600">{status.documents.failed}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Analyzed</div>
                <div className="text-xl font-semibold text-blue-600">{status.documents.analyzed}</div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Started at:</span> {formatDate(status.started_at)}
              </div>
              <div>
                <span className="text-gray-500">Completed at:</span> {formatDate(status.completed_at)}
              </div>
            </div>
          </div>

          {/* Document actions */}
          {status.status === 'completed' && status.documents.processed > 0 && (
            <div className="card p-6">
              <h3 className="font-medium mb-4">Document Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href={`/documents?ids=${status.document_ids.join(',')}`}
                  className="btn btn-secondary"
                >
                  View Documents
                </Link>
                <Link 
                  href={`/documents/batch-export?ids=${status.document_ids.join(',')}`}
                  className="btn btn-secondary"
                >
                  Export Documents
                </Link>
                <Link 
                  href={`/documents/batch-analyze?ids=${status.document_ids.join(',')}`}
                  className="btn btn-secondary"
                >
                  Analyze Documents
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
