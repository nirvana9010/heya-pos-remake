import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Use absolute path
    const logFile = '/home/nirvana9010/projects/heya-pos-remake/heya-pos/logs/app-debug.log';
    const logEntry = JSON.stringify(data, null, 2) + '\n---\n';
    
    await fs.appendFile(logFile, logEntry);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log error:', error);
    return NextResponse.json({ error: 'Failed to save log', details: error }, { status: 500 });
  }
}