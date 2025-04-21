import { NextResponse } from 'next/server';

/**
 * API route to check database migration status
 * This is useful for verifying production deployments
 */
export async function GET() {
  try {
    // Use the production API URL with the properly formatted protocol
    const apiUrl = 'https://jurisai-monorepo-production.up.railway.app';
    
    console.log(`[API Proxy] Checking database migration status: ${apiUrl}/system/status`);
    
    // Make the request to the backend system status endpoint
    const response = await fetch(`${apiUrl}/system/status`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't cache the response
    });
    
    // If the response is not OK, throw an error
    if (!response.ok) {
      console.error(`[API Proxy] System status check failed with status: ${response.status}`);
      return NextResponse.json(
        { 
          error: "System status check failed", 
          status: response.status,
          message: "Unable to check system status"
        }, 
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    console.log(`[API Proxy] System status check successful: ${JSON.stringify(data)}`);
    
    // Check for database info in the system status
    const databaseInfo = data.database || data.db || {};
    const migrationStatus = {
      database: {
        connected: databaseInfo.connected || databaseInfo.status === 'connected' || false,
        migrationStatus: databaseInfo.migrations || databaseInfo.migrationStatus || 'unknown',
        version: databaseInfo.version || databaseInfo.dbVersion || 'unknown',
        tables: databaseInfo.tables || []
      },
      system: {
        status: data.status || 'unknown',
        uptime: data.uptime || 'unknown',
        version: data.version || data.apiVersion || 'unknown',
      }
    };
    
    // Return the response
    return NextResponse.json(migrationStatus);
  } catch (error) {
    console.error('[API Proxy] System status check error:', error);
    return NextResponse.json(
      { 
        error: "System status check failed", 
        message: error instanceof Error ? error.message : "Unknown error",
        migrationStatus: 'unknown'
      }, 
      { status: 500 }
    );
  }
}
