import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { type, data, timestamp } = await request.json();
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    // Create filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `notification-tests-${date}.log`;
    const filepath = path.join(logsDir, filename);
    
    // Format log entry
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      type,
      data,
      formattedMessage: `[${new Date().toISOString()}] ${type}: ${JSON.stringify(data, null, 2)}`
    };
    
    // Append to file
    await fs.appendFile(filepath, JSON.stringify(logEntry) + '\n');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test result logged',
      file: filename 
    });
  } catch (error) {
    console.error('Error writing test log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to write log' },
      { status: 500 }
    );
  }
}