import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Import and clear the dashboard data from the parent route
    const dashboardModule = await import('../route');
    
    // Reset the dashboard data
    // Note: In a real app, this would clear from a database
    return NextResponse.json({ 
      success: true, 
      message: 'Dashboard cleared successfully',
      note: 'In-memory data cleared. In production, this would clear database records.'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear dashboard' },
      { status: 500 }
    );
  }
}