import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_MERCHANT_DETECTION_MODE: process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}