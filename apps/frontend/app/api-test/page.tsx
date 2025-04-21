'use client';

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import { 
  checkApiHealth, 
  getApiFullHealth,
  listDocuments
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

// Define test endpoints
const API_TESTS = [
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    description: 'Basic API health check'
  },
  {
    name: 'Full Health Check',
    endpoint: '/health/full',
    method: 'GET',
    description: 'Comprehensive health check with database and AI services'
  },
  {
    name: 'System Status',
    endpoint: '/system/status',
    method: 'GET',
    description: 'Diagnostic system status including database migration status'
  },
  {
    name: 'Feature Validation',
    endpoint: '/system/features',
    method: 'GET',
    description: 'Check status of all system features'
  },
  {
    name: 'OpenAI Integration',
    endpoint: '/summarization/test?query=Test the OpenAI integration',
    method: 'GET',
    description: 'Test OpenAI integration through the summarization endpoint'
  },
  {
    name: 'Documents List',
    endpoint: '/documents',
    method: 'GET',
    description: 'List available documents'
  },
  {
    name: 'User Profile',
    endpoint: '/users/me',
    method: 'GET',
    description: 'Get current user profile'
  },
  {
    name: 'Authentication',
    endpoint: '/auth/status',
    method: 'GET',
    description: 'Check authentication status'
  }
];

// Result type for API tests
interface TestResult {
  name: string;
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  details?: any;
}

export default function ApiTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [expandedResults, setExpandedResults] = useState<{[key: string]: boolean}>({});

  // Use React Query for health check
  const healthCheck = useQuery({
    queryKey: ['apiHealthCheck'],
    queryFn: checkApiHealth,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
    enabled: false, // Don't run automatically
  });

  // Use React Query for full health check
  const fullHealthCheck = useQuery({
    queryKey: ['apiFullHealthCheck'],
    queryFn: getApiFullHealth,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
    enabled: false, // Don't run automatically
  });

  // Use React Query for document list
  const documentsList = useQuery({
    queryKey: ['apiTestDocumentsList'],
    queryFn: () => listDocuments({ limit: 5 }),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
    enabled: false, // Don't run automatically
  });

  // Toggle expanded view for a result
  const toggleExpanded = (name: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Function to run a specific test
  const runTest = useCallback(async (test: typeof API_TESTS[0]) => {
    // Mark this test as pending
    setResults(prev => [
      ...prev.filter(r => r.name !== test.name),
      { name: test.name, endpoint: test.endpoint, status: 'pending' }
    ]);

    try {
      const startTime = performance.now();
      let response;

      // Use the appropriate React Query hook based on the test
      if (test.endpoint === '/health') {
        await healthCheck.refetch();
        response = { status: healthCheck.isSuccess ? 200 : 500, data: { status: healthCheck.data ? 'healthy' : 'unhealthy' } };
      } else if (test.endpoint === '/health/full') {
        await fullHealthCheck.refetch();
        response = { status: 200, data: fullHealthCheck.data };
      } else if (test.endpoint === '/documents') {
        await documentsList.refetch();
        response = { status: 200, data: documentsList.data };
      } else {
        // For other endpoints, use axios directly
        response = await apiClient.get(test.endpoint, { 
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          } 
        });
      }

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Update the results
      setResults(prev => [
        ...prev.filter(r => r.name !== test.name),
        {
          name: test.name,
          endpoint: test.endpoint,
          status: 'success',
          responseTime,
          statusCode: response.status,
          details: response.data
        }
      ]);
    } catch (error: any) {
      // Handle different error types
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status || 0;

      setResults(prev => [
        ...prev.filter(r => r.name !== test.name),
        {
          name: test.name,
          endpoint: test.endpoint,
          status: 'error',
          statusCode,
          error: errorMessage
        }
      ]);
    }
  }, [healthCheck, fullHealthCheck, documentsList]);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunningTests(true);
    setResults([]);
    
    // Run tests sequentially to avoid rate limiting
    for (const test of API_TESTS) {
      await runTest(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunningTests(false);
  }, [runTest]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">API Connectivity Test</h1>
      <p className="mb-4">
        This page tests connectivity to various backend API endpoints to ensure the application is properly configured.
      </p>
      
      <div className="flex gap-4 mb-6">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={runAllTests}
          disabled={isRunningTests}
        >
          {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>
      
      <div className="space-y-4">
        {API_TESTS.map(test => {
          const result = results.find(r => r.name === test.name);
          const isExpanded = expandedResults[test.name] || false;
          
          return (
            <div 
              key={test.name} 
              className="border rounded-lg p-4 bg-white shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{test.name}</h3>
                  <p className="text-gray-600 text-sm">{test.endpoint} ({test.method})</p>
                  <p className="text-gray-500 text-xs mt-1">{test.description}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {result && (
                    <div className="flex items-center">
                      {result.status === 'pending' && (
                        <div className="text-amber-500 flex items-center">
                          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Testing
                        </div>
                      )}
                      
                      {result.status === 'success' && (
                        <div className="text-green-600 flex items-center">
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          {result.responseTime}ms
                        </div>
                      )}
                      
                      {result.status === 'error' && (
                        <div className="text-red-600 flex items-center">
                          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                          {result.statusCode || 'Error'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 transition"
                    onClick={() => runTest(test)}
                    disabled={isRunningTests}
                  >
                    Test
                  </button>
                  
                  {result && result.status !== 'pending' && (
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => toggleExpanded(test.name)}
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}
                </div>
              </div>
              
              {result && result.status !== 'pending' && isExpanded && (
                <div className="mt-4 border-t pt-4">
                  {result.status === 'success' ? (
                    <div>
                      <div className="mb-2 text-sm">
                        <span className="font-medium">Status Code:</span> {result.statusCode}
                      </div>
                      <div className="mb-2 text-sm">
                        <span className="font-medium">Response Time:</span> {result.responseTime}ms
                      </div>
                      <div>
                        <span className="font-medium text-sm">Response:</span>
                        <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-red-600 mb-2 text-sm">
                        <span className="font-medium">Error:</span> {result.error}
                      </div>
                      {result.statusCode && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Status Code:</span> {result.statusCode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
