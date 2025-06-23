import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Get date from query params or use today
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const filename = `notification-tests-${date}.log`;
    const filepath = path.join(logsDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const logs = content
        .trim()
        .split('\n')
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      
      return NextResponse.json({ 
        success: true, 
        logs,
        file: filename,
        count: logs.length
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ 
          success: true, 
          logs: [],
          file: filename,
          count: 0,
          message: 'No logs found for this date'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading test logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read logs' },
      { status: 500 }
    );
  }
}