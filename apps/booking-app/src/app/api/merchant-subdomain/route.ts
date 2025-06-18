import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the merchant subdomain from the header set by middleware
  const merchantSubdomain = request.headers.get('x-merchant-subdomain');
  
  return NextResponse.json({
    subdomain: merchantSubdomain || null,
    detectionMode: process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE || 'path'
  });
}