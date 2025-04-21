import { NextResponse } from 'next/server';

/**
 * API route handler for health check
 * This proxies the request to the backend API
 */
export async function GET() {
  try {
    // Use the production API URL with the properly formatted protocol
    const apiUrl = 'https://jurisai-monorepo-production.up.railway.app';
    
    console.log(`[API Proxy] Forwarding health check request to: ${apiUrl}/health/`);
    
    // Make the request to the backend
    const response = await fetch(`${apiUrl}/health/`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't cache the response
    });
    
    // If the response is not OK, throw an error
    if (!response.ok) {
      console.error(`[API Proxy] Health check failed with status: ${response.status}`);
      return NextResponse.json(
        { 
          error: "Health check failed", 
          status: response.status,
          message: "Unable to connect to backend API"
        }, 
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    console.log(`[API Proxy] Health check successful: ${JSON.stringify(data)}`);
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Health check error:', error);
    return NextResponse.json(
      { 
        error: "Health check failed", 
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}
