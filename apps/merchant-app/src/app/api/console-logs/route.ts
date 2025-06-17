import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json();
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    // Write logs to console.log file
    const logFile = path.join(logsDir, 'browser-console.log');
    
    // Format logs
    const formattedLogs = logs.map((log: any) => 
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n') + '\n';
    
    // Append to file
    await fs.appendFile(logFile, formattedLogs);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save console logs:', error);
    return NextResponse.json({ error: 'Failed to save logs' }, { status: 500 });
  }
}