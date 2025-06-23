import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Mock test scenarios
    const scenarios = [
      {
        name: 'New Booking Flow',
        description: 'Customer books a service, receives confirmation email/SMS',
        steps: ['Customer selects service', 'Booking created', 'Email sent', 'SMS sent', 'UI notification shown']
      },
      {
        name: 'Booking Modification',
        description: 'Customer changes appointment time, notifications sent',
        steps: ['Customer requests change', 'Booking updated', 'Notification sent to customer', 'Staff notified']
      },
      {
        name: 'Cancellation & Refund',
        description: 'Customer cancels, refund processed, notifications sent',
        steps: ['Cancellation requested', 'Booking cancelled', 'Refund initiated', 'Confirmation sent']
      },
      {
        name: 'Reminder Sequence',
        description: 'Automated reminders 24h and 2h before appointment',
        steps: ['24h reminder scheduled', '24h reminder sent', '2h reminder scheduled', '2h reminder sent']
      }
    ];
    
    return NextResponse.json({ success: true, scenarios });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load test scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/test-notifications/test-scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to run test scenarios' },
      { status: 500 }
    );
  }
}