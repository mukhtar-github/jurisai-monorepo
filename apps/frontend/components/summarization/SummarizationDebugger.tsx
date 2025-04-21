'use client';

import React, { useState, useEffect } from 'react';

interface SystemStatus {
  database?: {
    connected: boolean;
    migrationStatus: string;
    version: string;
    tables?: string[];
  };
  system?: {
    status: string;
    uptime: string;
    version: string;
  };
  error?: string;
}

interface MigrationResult {
  success: boolean;
  message: string;
  details?: {
    action?: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
  };
}

/**
 * Debugging component for summarization issues
 * This helps diagnose production problems without requiring a redeploy
 */
export function SummarizationDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'check' | 'apply' | 'verify' | 'fix'>('check');

  // Check if detailed logging is already enabled
  useEffect(() => {
    const loggingEnabled = localStorage.getItem('jurisai_detailed_logging') === 'true';
    setIsLoggingEnabled(loggingEnabled);
    
    // Simple check if user might be an admin (this is just for UI purposes)
    // The actual authorization is enforced on the backend
    const userRole = localStorage.getItem('jurisai_user_role');
    setIsAdmin(userRole === 'admin');
  }, []);

  // Toggle visibility with special key combo (Alt+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check system status
  const checkSystemStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system/migration-status');
      if (!response.ok) {
        throw new Error(`Failed to check system status: ${response.status}`);
      }
      const data = await response.json();
      setSystemStatus(data);
      console.log('System status:', data);
    } catch (error) {
      console.error('Error checking system status:', error);
      setSystemStatus({ error: error instanceof Error ? error.message : 'Unknown error checking system status' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enable detailed logging
  const handleEnableLogging = () => {
    localStorage.setItem('jurisai_detailed_logging', 'true');
    localStorage.setItem('jurisai_logging_expiry', String(Date.now() + 3600000)); // 1 hour
    console.info('✅ Detailed error logging enabled for 60 minutes');
    setIsLoggingEnabled(true);
  };

  // Test API connection directly
  const testApiConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.status}`);
      }
      const data = await response.json();
      console.log('API health check:', data);
      alert(`API Connection Success: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Error testing API connection:', error);
      alert(`API Connection Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run a test summarization
  const testSummarization = async () => {
    setIsLoading(true);
    const testText = `IN THE SUPREME COURT OF NIGERIA
HOLDEN AT ABUJA
APPEAL NO: SC/433/2018
BETWEEN:
AIRTEL NETWORKS LIMITED........................APPELLANT
AND
ANNE MMADUABUCHI & ORS.........................RESPONDENTS`;

    try {
      console.log('Testing summarization with text:', testText);
      const response = await fetch('/api/summarization/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          max_length: 200,
          use_ai: true
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Summarization failed: ${response.status} - ${JSON.stringify(responseData)}`);
      }
      
      console.log('Summarization test result:', responseData);
      alert(`Summarization Success: "${responseData.summary.substring(0, 100)}..."`);
    } catch (error) {
      console.error('Error testing summarization:', error);
      alert(`Summarization Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manage database migrations
  const manageMigrations = async () => {
    if (!isAdmin) {
      alert('This function requires admin privileges.');
      return;
    }
    
    setIsLoading(true);
    setMigrationResult(null);
    
    try {
      // Get API token (this should be properly implemented based on your auth system)
      const authToken = localStorage.getItem('jurisai_auth_token');
      
      // First, get the backend URL to call the direct endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jurisai-monorepo-production.up.railway.app';
      
      console.log(`Running migration action: ${selectedAction}`);
      const response = await fetch(`${apiUrl}/system/migrations?action=${selectedAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Migration operation failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      
      console.log('Migration result:', data);
      setMigrationResult(data);
      
      // Refresh system status after migration
      if (data.success) {
        await checkSystemStatus();
      }
    } catch (error) {
      console.error('Error managing migrations:', error);
      setMigrationResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error managing migrations'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg z-50 border border-gray-300 w-96 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">JurisAI Debugger</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={checkSystemStatus}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Check System Status'}
          </button>
          
          <button 
            onClick={testApiConnection}
            disabled={isLoading}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Test API Connection'}
          </button>
        </div>
        
        <button 
          onClick={testSummarization}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Test Summarization'}
        </button>
        
        {!isLoggingEnabled && (
          <button 
            onClick={handleEnableLogging}
            className="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Enable Detailed Logging (1 hour)
          </button>
        )}
        
        {isLoggingEnabled && (
          <div className="text-sm p-2 bg-yellow-100 rounded">
            📋 Detailed logging is enabled 
          </div>
        )}

        {systemStatus && (
          <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
            <h4 className="font-semibold">System Status:</h4>
            {systemStatus.error ? (
              <div className="text-red-500">{systemStatus.error}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                  <div className="font-medium">Database:</div>
                  <div className={`${systemStatus.database?.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {systemStatus.database?.connected ? 'Connected' : 'Disconnected'}
                  </div>
                  
                  <div className="font-medium">Migrations:</div>
                  <div className={`${
                    systemStatus.database?.migrationStatus === 'complete' 
                      ? 'text-green-600' 
                      : systemStatus.database?.migrationStatus === 'partial' 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {systemStatus.database?.migrationStatus}
                  </div>
                  
                  <div className="font-medium">System:</div>
                  <div>{systemStatus.system?.status}</div>
                  
                  <div className="font-medium">Uptime:</div>
                  <div>{systemStatus.system?.uptime}</div>
                </div>

                {systemStatus.database?.tables && systemStatus.database.tables.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Tables:</div>
                    <div className="text-xs mt-1 bg-gray-200 p-1 rounded max-h-20 overflow-y-auto">
                      {systemStatus.database.tables.join(', ')}
                    </div>
                  </div>
                )}
                
                {/* Database Migration Management */}
                {isAdmin && systemStatus.database?.connected && (
                  <div className="mt-4 border-t pt-2">
                    <h5 className="font-medium">Database Migration Management:</h5>
                    <div className="mt-2">
                      <select 
                        value={selectedAction}
                        onChange={(e) => setSelectedAction(e.target.value as any)}
                        className="w-full p-2 border rounded mb-2 text-sm"
                        disabled={isLoading}
                      >
                        <option value="check">Check Migration Status</option>
                        <option value="verify">Verify Database Schema</option>
                        <option value="apply">Apply Pending Migrations</option>
                        <option value="fix">Fix Migration Sequence Issues</option>
                      </select>
                      
                      <button
                        onClick={manageMigrations}
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 text-sm"
                      >
                        {isLoading ? 'Processing...' : 'Execute Migration Action'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Migration Result */}
        {migrationResult && (
          <div className={`mt-3 p-3 rounded text-sm ${migrationResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <h4 className="font-semibold">Migration Result:</h4>
            <div className="mt-1">{migrationResult.message}</div>
            
            {migrationResult.details?.stdout && (
              <div className="mt-2">
                <h5 className="font-medium">Output:</h5>
                <pre className="text-xs mt-1 bg-gray-200 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {migrationResult.details.stdout}
                </pre>
              </div>
            )}
            
            {migrationResult.details?.stderr && (
              <div className="mt-2">
                <h5 className="font-medium">Errors:</h5>
                <pre className="text-xs mt-1 bg-gray-200 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap text-red-600">
                  {migrationResult.details.stderr}
                </pre>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          Press Alt+Shift+D to toggle this debugger
        </div>
      </div>
    </div>
  );
}
