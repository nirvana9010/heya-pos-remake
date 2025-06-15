import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function testPaymentEndpoint() {
  try {
    // First, login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token');

    // Set up headers with token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Get bookings
    console.log('\n2. Fetching bookings...');
    const bookingsResponse = await axios.get(`${API_URL}/bookings`, { 
      headers,
      params: { limit: 10 }
    });
    
    const bookings = bookingsResponse.data.data || bookingsResponse.data;
    console.log(`✓ Found ${bookings.length} bookings`);

    // Find an unpaid booking
    const unpaidBooking = bookings.find((b: any) => 
      (b.status === 'CONFIRMED' || b.status === 'PENDING') && 
      (!b.paidAmount || b.paidAmount === 0)
    );

    if (!unpaidBooking) {
      console.log('✗ No unpaid bookings found');
      return;
    }

    console.log(`✓ Found unpaid booking: ${unpaidBooking.id}`);
    console.log('  Booking details:', {
      id: unpaidBooking.id,
      status: unpaidBooking.status,
      totalAmount: unpaidBooking.totalAmount,
      paidAmount: unpaidBooking.paidAmount
    });

    // Create order from booking
    console.log('\n3. Creating order from booking...');
    try {
      const orderResponse = await axios.post(
        `${API_URL}/payments/orders/from-booking/${unpaidBooking.id}`,
        {},
        { headers }
      );
      
      const order = orderResponse.data;
      console.log('✓ Order created successfully:', {
        id: order.id,
        orderNumber: order.orderNumber,
        state: order.state,
        balanceDue: order.balanceDue,
        totalAmount: order.totalAmount
      });

      // Lock the order if it's in DRAFT state
      if (order.state === 'DRAFT') {
        console.log('\n4. Locking order...');
        const lockResponse = await axios.post(
          `${API_URL}/payments/orders/${order.id}/state`,
          { state: 'LOCKED' },
          { headers }
        );
        console.log('✓ Order locked successfully');
      }

      // Process payment
      console.log(`\n${order.state === 'DRAFT' ? '5' : '4'}. Processing payment...`);
      const paymentResponse = await axios.post(
        `${API_URL}/payments/process`,
        {
          orderId: order.id,
          amount: order.balanceDue,
          method: 'CASH',
          metadata: {
            cashReceived: order.balanceDue
          }
        },
        { headers }
      );

      console.log('✓ Payment processed successfully:', paymentResponse.data);

    } catch (error: any) {
      console.error('✗ Error in payment flow:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testPaymentEndpoint();