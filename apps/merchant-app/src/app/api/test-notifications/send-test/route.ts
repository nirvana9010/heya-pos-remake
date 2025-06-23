import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock response for testing
    // In a real implementation, this would call your email/SMS service
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