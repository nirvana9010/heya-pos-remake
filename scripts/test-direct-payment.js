const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let token = '';

// Colors for console output
const colors = {
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function authenticate() {
  try {
    log('1. Authenticating as merchant...', 'yellow');
    const response = await axios.post(`${API_URL}/v1/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    token = response.data.token || response.data.access_token;
    log('✓ Authenticated successfully', 'green');
    return true;
  } catch (error) {
    log('Failed to authenticate', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testDirectOrderCreation() {
  try {
    // Get location first
    const locationsResponse = await axios.get(`${API_URL}/v1/locations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const locations = Array.isArray(locationsResponse.data) 
      ? locationsResponse.data 
      : (locationsResponse.data.data || []);
    
    if (!locations.length) {
      log('No locations found', 'red');
      return;
    }
    
    const location = locations[0];
    log(`Using location: ${location.name || location.id}`, 'green');
    
    // Get customer
    const customersResponse = await axios.get(`${API_URL}/v1/customers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const customers = Array.isArray(customersResponse.data) 
      ? customersResponse.data 
      : (customersResponse.data.data || []);
    
    if (!customers.length) {
      log('No customers found', 'red');
      return;
    }
    
    const customer = customers[0];
    log(`Using customer: ${customer.firstName} ${customer.lastName}`, 'green');
    
    // Get staff to create order with
    const staffResponse = await axios.get(`${API_URL}/v1/staff`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const staffList = Array.isArray(staffResponse.data) 
      ? staffResponse.data 
      : (staffResponse.data.data || []);
    
    if (!staffList.length) {
      log('No staff found', 'red');
      return;
    }
    
    const staff = staffList[0];
    log(`Using staff: ${staff.firstName} ${staff.lastName}`, 'green');
    
    // Create a direct order (not from booking) - need to make the API call with the right headers
    log('\nCreating direct order...', 'yellow');
    
    // First, we need to set the location context
    const orderResponse = await axios.post(`${API_URL}/v1/payments/orders`, {
      customerId: customer.id
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Location-Id': location.id  // Try setting location in header
      }
    });
    
    const order = orderResponse.data;
    log(`✓ Created order ID: ${order.id}`, 'green');
    log(`Order state: ${order.state}`, 'blue');
    
    // Get services to add to order
    const servicesResponse = await axios.get(`${API_URL}/v1/services`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const services = Array.isArray(servicesResponse.data) 
      ? servicesResponse.data 
      : (servicesResponse.data.data || []);
    
    if (services.length) {
      const service = services[0];
      
      // Add item to order
      log('\nAdding service to order...', 'yellow');
      await axios.post(`${API_URL}/v1/payments/orders/${order.id}/items`, {
        items: [{
          itemType: 'SERVICE',
          itemId: service.id,
          description: service.name,
          quantity: 1,
          unitPrice: service.price
        }]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      log(`✓ Added ${service.name} ($${service.price})`, 'green');
    }
    
    // Get updated order
    const updatedOrderResponse = await axios.get(`${API_URL}/v1/payments/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const updatedOrder = updatedOrderResponse.data;
    log(`\nOrder total: $${updatedOrder.totalAmount}`, 'blue');
    log(`Order state: ${updatedOrder.state}`, 'blue');
    
    // Lock the order
    log('\nLocking order...', 'yellow');
    await axios.post(`${API_URL}/v1/payments/orders/${order.id}/state`, {
      state: 'LOCKED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    log('✓ Order locked', 'green');
    
    // Process payment
    log('\nProcessing payment...', 'yellow');
    const paymentResponse = await axios.post(`${API_URL}/v1/payments/process`, {
      orderId: order.id,
      method: 'CASH',
      amount: updatedOrder.totalAmount,
      tipAmount: 5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    log('✓ Payment processed successfully', 'green');
    log(`Payment ID: ${paymentResponse.data.payment.id}`, 'blue');
    log(`Payment status: ${paymentResponse.data.payment.status}`, 'blue');
    log(`Payment processed at: ${paymentResponse.data.payment.processedAt}`, 'blue');
    
    // Check reports
    log('\n=== CHECKING REPORTS ===', 'blue');
    const reportsResponse = await axios.get(`${API_URL}/v1/reports/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = reportsResponse.data;
    log(`Daily Revenue: $${data.revenue.revenue.daily}`, 'green');
    log(`Monthly Revenue: $${data.revenue.revenue.monthly}`, 'green');
    
    // Check revenue trend for today
    const trendResponse = await axios.get(`${API_URL}/v1/reports/revenue-trend?days=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (trendResponse.data && trendResponse.data.length > 0) {
      log(`\nToday's revenue from trend: $${trendResponse.data[0].revenue}`, 'green');
    }
    
  } catch (error) {
    log('Error in test', 'red');
    console.error(error.response?.data || error.message);
  }
}

async function runTest() {
  if (!await authenticate()) {
    return;
  }
  
  await testDirectOrderCreation();
}

runTest().catch(console.error);