import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const url = `${apiUrl}/v1/public/merchant-info?subdomain=hamilton`;
    
    console.log('[Backend Fetch Test] Fetching from:', url);
    
    const response = await fetch(url, {
      headers: {
        'X-Merchant-Subdomain': 'hamilton',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'API request failed',
        status: response.status,
        statusText: response.statusText
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      apiUrl,
      data
    });
  } catch (error) {
    console.error('[Backend Fetch Test] Error:', error);
    return NextResponse.json({
      error: 'Fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error?.constructor?.name
    }, { status: 500 });
  }
}