'use client';

import React, { useState } from 'react';
import { useSystemStatus, useMigrationManager } from '@/lib/hooks/useSystemStatus';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// OpenAI test response type
interface OpenAITestResponse {
  success: boolean;
  model: string;
  message: string;
  response_text?: string;
  error?: string;
}

/**
 * SystemStatusPanel - A component to display system status and migration information
 * 
 * This can be used in admin interfaces or for debugging purposes
 */
export function SystemStatusPanel() {
  const [migrationAction, setMigrationAction] = useState<'check' | 'apply' | 'verify' | 'fix'>('check');
  const { data: systemStatus, isLoading, isError, error, refetch } = useSystemStatus();
  const { mutate: manageMigration, isPending, isSuccess, data: migrationResult } = useMigrationManager();
  
  // Add OpenAI test query
  const { 
    data: openaiTestResult, 
    isLoading: isTestingOpenAI, 
    isError: isOpenAIError, 
    error: openaiError,
    refetch: testOpenAI 
  } = useQuery<OpenAITestResponse>({
    queryKey: ['openaiTest'],
    queryFn: async () => {
      const response = await apiClient.get('/summarization/test');
      return response.data;
    },
    enabled: false, // Don't run automatically
  });

  const handleMigrationAction = () => {
    manageMigration({ action: migrationAction });
  };

  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">System Status</h2>
      
      {isLoading && <div className="text-gray-500">Loading system status...</div>}
      
      {isError && (
        <div className="text-red-500">
          <p>Error loading system status</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      )}
      
      {systemStatus && (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Overall Status:</span>
            <span className={systemStatus.status === 'ok' ? 'text-green-600' : 'text-red-600'}>
              {systemStatus.status}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Database Connection:</span>
            <span className={systemStatus.database.connected ? 'text-green-600' : 'text-red-600'}>
              {systemStatus.database.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Migration Status:</span>
            <span 
              className={
                systemStatus.database.migrationStatus === 'complete' 
                  ? 'text-green-600' 
                  : systemStatus.database.migrationStatus === 'partial' 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }
            >
              {systemStatus.database.migrationStatus}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">System Version:</span>
            <span>{systemStatus.system.version}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Uptime:</span>
            <span>{systemStatus.system.uptime}</span>
          </div>
          
          {/* New section for OpenAI integration test */}
          <div className="mt-4 pt-3 border-t">
            <h3 className="font-medium mb-2">OpenAI Integration</h3>
            <div className="flex flex-col space-y-3">
              <button
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={() => testOpenAI()}
                disabled={isTestingOpenAI}
              >
                {isTestingOpenAI ? 'Testing...' : 'Test OpenAI Integration'}
              </button>
              
              {openaiTestResult && (
                <div className={`p-3 rounded text-sm ${openaiTestResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="font-semibold">
                    {openaiTestResult.success ? '✓ OpenAI Integration Working' : '✗ OpenAI Integration Failed'}
                  </p>
                  <p className="mt-1">{openaiTestResult.message}</p>
                  <p className="mt-1">Model: {openaiTestResult.model}</p>
                  
                  {openaiTestResult.response_text && (
                    <div className="mt-2">
                      <p className="font-medium">Response:</p>
                      <div className="bg-white p-2 rounded mt-1">
                        {openaiTestResult.response_text}
                      </div>
                    </div>
                  )}
                  
                  {openaiTestResult.error && (
                    <div className="mt-2">
                      <p className="font-medium text-red-700">Error:</p>
                      <div className="bg-white p-2 rounded mt-1 text-red-500">
                        {openaiTestResult.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {systemStatus.database.missing_tables && systemStatus.database.missing_tables.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-red-600">Missing Tables:</p>
              <ul className="list-disc pl-5 text-sm">
                {systemStatus.database.missing_tables.map(table => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            </div>
          )}
          
          {systemStatus.database.tables && (
            <details className="mt-2">
              <summary className="font-medium cursor-pointer">Available Tables ({systemStatus.database.tables.length})</summary>
              <ul className="list-disc pl-5 text-sm mt-1 max-h-40 overflow-y-auto">
                {systemStatus.database.tables.map(table => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
            </details>
          )}
          
          <div className="mt-4 pt-3 border-t">
            <h3 className="font-medium mb-2">Migration Management</h3>
            <div className="flex space-x-3">
              <select 
                className="border rounded px-2 py-1 text-sm"
                value={migrationAction}
                onChange={(e) => setMigrationAction(e.target.value as any)}
                disabled={isPending}
              >
                <option value="check">Check Status</option>
                <option value="verify">Verify Tables</option>
                <option value="fix">Fix Sequence</option>
                <option value="apply">Apply Migrations</option>
              </select>
              
              <button
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleMigrationAction}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : 'Execute'}
              </button>
              
              <button
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}
      
      {migrationResult && (
        <div className={`mt-4 p-3 rounded text-sm ${migrationResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <h4 className="font-semibold">Migration Result:</h4>
          <p className="mt-1">{migrationResult.message}</p>
          
          {migrationResult.details && (
            <>
              {migrationResult.details.stdout && (
                <details className="mt-2">
                  <summary className="font-medium cursor-pointer">Output</summary>
                  <pre className="text-xs mt-1 bg-white p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {migrationResult.details.stdout}
                  </pre>
                </details>
              )}
              
              {migrationResult.details.stderr && (
                <details className="mt-2">
                  <summary className="font-medium cursor-pointer text-red-700">Errors</summary>
                  <pre className="text-xs mt-1 bg-white p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap text-red-600">
                    {migrationResult.details.stderr}
                  </pre>
                </details>
              )}
              
              {migrationResult.details.missing_tables && migrationResult.details.missing_tables.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Missing Tables:</p>
                  <ul className="list-disc pl-5 text-sm">
                    {migrationResult.details.missing_tables.map((table: string) => (
                      <li key={table}>{table}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
