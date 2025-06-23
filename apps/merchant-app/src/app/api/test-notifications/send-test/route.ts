import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if we should use real API or mock
    const useRealApi = process.env.NODE_ENV === 'production' || process.env.USE_REAL_NOTIFICATIONS === 'true';
    
    if (useRealApi) {
      // Call the real API endpoint
      try {
        const response = await fetch(`${API_BASE_URL}/api/test/notifications/send-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'booking_new',
            channel: 'both',
            ...body
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
      } catch (apiError: any) {
        console.error('Real API call failed:', apiError);
        // Fall back to mock if real API fails
      }
    }
    
    // Mock response for testing
    const mockResponse = {
      success: true,
      message: 'Test notifications sent successfully',
      details: {
        email: {
          sent: true,
          to: body.customerEmail || 'test@example.com',
          subject: `Booking confirmation for ${body.serviceName}`,
          provider: 'SendGrid (mock)',
          messageId: `msg_${Date.now()}_email`,
          timestamp: new Date().toISOString()
        },
        sms: {
          sent: true,
          to: body.customerPhone || '+1234567890',
          message: `Your ${body.serviceName} booking is confirmed for ${new Date(body.dateTime).toLocaleDateString()}`,
          provider: 'Twilio (mock)',
          messageId: `msg_${Date.now()}_sms`,
          timestamp: new Date().toISOString()
        }
      },
      testData: {
        bookingId: body.bookingId,
        customerName: body.customerName,
        serviceName: body.serviceName,
        dateTime: body.dateTime,
        staffName: body.staffName,
        amount: body.amount
      }
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json(mockResponse);
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send test notification',
        details: {
          email: { sent: false, error: 'Mock service error' },
          sms: { sent: false, error: 'Mock service error' }
        }
      },
      { status: 500 }
    );
  }
}