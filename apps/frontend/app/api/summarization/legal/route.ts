import { NextRequest, NextResponse } from 'next/server';

/**
 * API route handler for legal document summarization
 * This proxies the request to the backend API
 */
export async function POST(request: NextRequest) {
  try {
    // Use the production API URL with the properly formatted protocol
    const apiUrl = 'https://jurisai-monorepo-production.up.railway.app';
    
    // Get the request body
    const body = await request.json();
    console.log(`[API Proxy] Forwarding legal summarization request to: ${apiUrl}/summarization/legal`);
    
    // Make the request to the backend
    const response = await fetch(`${apiUrl}/summarization/legal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store', // Don't cache the response
    });
    
    // If the response is not OK, throw an error
    if (!response.ok) {
      console.error(`[API Proxy] Legal summarization failed with status: ${response.status}`);
      
      // Try to get error details
      let errorDetails = {};
      try {
        errorDetails = await response.json();
      } catch (e) {
        // Ignore if we can't parse the error response
      }
      
      return NextResponse.json(
        { 
          error: "Legal summarization failed", 
          status: response.status,
          message: "Failed to summarize legal document",
          details: errorDetails
        }, 
        { status: response.status }
      );
    }
    
    // Get the response data
    const data = await response.json();
    console.log(`[API Proxy] Legal summarization successful`);
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Legal summarization error:', error);
    return NextResponse.json(
      { 
        error: "Legal summarization failed", 
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}
