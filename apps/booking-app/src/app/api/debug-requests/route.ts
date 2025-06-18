import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers = Object.fromEntries(request.headers.entries());
  const url = new URL(request.url);
  
  return NextResponse.json({
    url: request.url,
    pathname: url.pathname,
    headers,
    merchantSubdomain: headers['x-merchant-subdomain'] || null,
  });
}