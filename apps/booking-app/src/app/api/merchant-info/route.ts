import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subdomain = searchParams.get('subdomain');
  
  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
  }
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const url = `${apiUrl}/v1/public/merchant-info?subdomain=${subdomain}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Merchant-Subdomain': subdomain,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: 'API request failed', 
        details: error 
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Merchant Info Proxy] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch merchant info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}