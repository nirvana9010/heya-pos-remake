import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo purposes
let dashboardData = {
  totalSent: 0,
  emailSent: 0,
  smsSent: 0,
  recentNotifications: [] as any[]
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      ...dashboardData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

// Update dashboard data when notifications are sent
export async function POST(request: NextRequest) {
  try {
    const { type, channel } = await request.json();
    
    dashboardData.totalSent++;
    if (channel === 'email') dashboardData.emailSent++;
    if (channel === 'sms') dashboardData.smsSent++;
    
    dashboardData.recentNotifications.unshift({
      type,
      channel,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 20 notifications
    dashboardData.recentNotifications = dashboardData.recentNotifications.slice(0, 20);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}