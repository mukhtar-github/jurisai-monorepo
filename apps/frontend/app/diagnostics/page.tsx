'use client';

import React from 'react';
import { SystemStatusPanel } from '@/components/diagnostics/SystemStatusPanel';
import { SummarizationDebugger } from '@/components/summarization/SummarizationDebugger';

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>
      
      <div className="mb-8">
        <p className="mb-4">
          This page provides diagnostic tools to help troubleshoot issues in the JurisAI application.
          Use these tools to verify system status, check database connections, and test API functionality.
        </p>
        
        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <p>• For quick diagnostics in any page, press <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Alt+Shift+D</kbd> to open the debug panel</p>
          <p>• Use the <a href="/api-test" className="text-blue-600 hover:underline">API Test page</a> to verify connectivity to individual endpoints</p>
          <p>• Check our <a href="https://github.com/yourusername/jurisai-monorepo/wiki/Troubleshooting" className="text-blue-600 hover:underline">Troubleshooting Guide</a> for common issues and solutions</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-3">System Status</h2>
          <SystemStatusPanel />
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-3">Debug Panel</h2>
          <div className="p-4 border rounded-lg shadow">
            <p className="mb-4">
              The debug panel provides additional diagnostic tools and can be toggled on any page with <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Alt+Shift+D</kbd>.
            </p>
            
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => {
                // Simulate Alt+Shift+D keypress to open the debugger
                const event = new KeyboardEvent('keydown', {
                  altKey: true,
                  shiftKey: true,
                  key: 'd'
                });
                window.dispatchEvent(event);
              }}
            >
              Open Debug Panel
            </button>
          </div>
        </div>
      </div>
      
      {/* Always render the SummarizationDebugger but initially hidden */}
      <div className="hidden">
        <SummarizationDebugger />
      </div>
    </div>
  );
}
