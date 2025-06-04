#!/usr/bin/env npx ts-node

/**
 * Loyalty System Test Script
 * 
 * Tests the complete loyalty system implementation:
 * - Visits-based (punch card) loyalty
 * - Points-based loyalty
 * - Program management
 * - Earning and redemption
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Test credentials
const MERCHANT_USERNAME = 'HAMILTON';
const MERCHANT_PASSWORD = 'demo123';

let authToken: string;
let customerId: string;

// Helper function to log results
function log(message: string, data?: any) {
  console.log(`\n${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Helper function to make API calls
async function apiCall(method: string, path: string, data?: any, useAuth = true) {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (useAuth && authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios({
      method,
      url: `${API_URL}${path}`,
      data,
      headers,
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function runTests() {
  try {
    // 1. Login to get auth token
    log('1. Logging in as merchant...');
    const loginResponse = await apiCall('POST', '/auth/merchant/login', {
      username: MERCHANT_USERNAME,
      password: MERCHANT_PASSWORD,
    }, false);
    authToken = loginResponse.token;
    log('Login successful', { merchantId: loginResponse.merchantId });

    // 2. Get current loyalty program
    log('2. Getting current loyalty program...');
    const currentProgram = await apiCall('GET', '/loyalty/program');
    log('Current program:', currentProgram);

    // 3. Update to visits-based (punch card) system
    log('3. Updating to visits-based punch card system...');
    const updatedProgram = await apiCall('POST', '/loyalty/program', {
      type: 'VISITS',
      visitsRequired: 10,
      visitRewardType: 'FREE',
      visitRewardValue: 100,
      name: 'Punch Card Rewards',
      description: 'Get your 10th visit free!',
      isActive: true,
    });
    log('Updated program:', updatedProgram);

    // 4. Create a test customer
    log('4. Creating test customer...');
    const customer = await apiCall('POST', '/customers', {
      firstName: 'Test',
      lastName: 'Customer',
      email: `test${Date.now()}@example.com`,
      phone: '+61400123456',
      mobile: '+61400123456',
    });
    customerId = customer.id;
    log('Customer created:', { 
      id: customer.id, 
      name: `${customer.firstName} ${customer.lastName}`,
      loyaltyVisits: customer.loyaltyVisits,
    });

    // 5. Check customer loyalty status
    log('5. Checking customer loyalty status...');
    const loyaltyStatus = await apiCall('GET', `/loyalty/customers/${customerId}`);
    log('Customer loyalty status:', loyaltyStatus);

    // 6. Create and complete a booking to earn a visit
    log('6. Creating a booking...');
    const booking = await apiCall('POST', '/bookings', {
      customerId,
      locationId: 'cmbcxfd9z0007vopjy4jj9igu', // Hamilton Beauty Spa location
      services: [{
        serviceId: 'cmbcxfdhs0009vopjwkgdv0g1', // Basic Facial
        staffId: 'cmbcxfdq10017vopjyuqsjt8f', // Emma Johnson
      }],
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      notes: 'Test booking for loyalty',
    });
    log('Booking created:', { id: booking.id, status: booking.status });

    // 7. Complete the booking to trigger loyalty
    log('7. Completing booking to earn loyalty visit...');
    const completedBooking = await apiCall('PATCH', `/bookings/${booking.id}`, {
      status: 'COMPLETED',
    });
    log('Booking completed:', { id: completedBooking.id, status: completedBooking.status });

    // 8. Check updated loyalty status
    log('8. Checking updated loyalty status...');
    const updatedLoyalty = await apiCall('GET', `/loyalty/customers/${customerId}`);
    log('Updated loyalty status:', updatedLoyalty);

    // 9. Manually adjust visits for testing
    log('9. Manually adjusting visits to 9...');
    const adjustment = await apiCall('POST', '/loyalty/adjust', {
      customerId,
      visits: 8, // Add 8 more visits to make it 9 total
      reason: 'Testing redemption threshold',
    });
    log('Adjustment result:', adjustment);

    // 10. Check loyalty status again
    log('10. Checking loyalty status after adjustment...');
    const nearReward = await apiCall('GET', `/loyalty/customers/${customerId}`);
    log('Near reward status:', nearReward);

    // 11. Test points-based system
    log('11. Switching to points-based system...');
    const pointsProgram = await apiCall('POST', '/loyalty/program', {
      type: 'POINTS',
      pointsPerDollar: 1,
      pointsValue: 0.01, // $0.01 per point
      name: 'Beauty Points',
      description: 'Earn 1 point per $1 spent',
      isActive: true,
    });
    log('Points program:', pointsProgram);

    // 12. Check customer points
    log('12. Checking customer points...');
    const pointsStatus = await apiCall('GET', `/loyalty/customers/${customerId}`);
    log('Points status:', pointsStatus);

    // Test quick check endpoint
    log('13. Testing quick check endpoint...');
    const quickCheck = await apiCall('GET', `/loyalty/check/${customerId}`);
    log('Quick check result:', quickCheck);

    log('\n✅ All loyalty system tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();