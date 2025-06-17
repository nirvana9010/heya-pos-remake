// Script to create a test booking via the API
// Run this in the browser console while on the calendar page

async function createTestBooking() {
  // Get auth token
  const token = localStorage.getItem('merchant_token') || sessionStorage.getItem('merchant_token');
  
  if (!token) {
    console.error('No auth token found. Please log in first.');
    return;
  }
  
  // Create a booking for today at 2 PM
  const today = new Date();
  today.setHours(14, 0, 0, 0);
  
  const bookingData = {
    customerId: 'test-customer-id', // This might need to be a real customer ID
    serviceId: 'test-service-id', // This might need to be a real service ID
    staffId: '4cf5b69e-5d15-4ef2-8149-72e3bc28d44f', // Emma Wilson
    startTime: today.toISOString(),
    duration: 60,
    status: 'CONFIRMED',
    amount: 100,
    notes: 'Test booking for drag and drop'
  };
  
  try {
    console.log('Creating test booking...', bookingData);
    
    const response = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Booking created successfully! Refresh the calendar to see it.');
      console.log('Booking ID:', result.id || result.data?.id);
    } else {
      console.error('❌ Failed to create booking:', result);
    }
  } catch (error) {
    console.error('❌ Error creating booking:', error);
  }
}

// First, let's check what customers and services exist
async function checkRequiredData() {
  const token = localStorage.getItem('merchant_token') || sessionStorage.getItem('merchant_token');
  
  if (!token) {
    console.error('No auth token found. Please log in first.');
    return;
  }
  
  try {
    // Get customers
    const customersResponse = await fetch('/api/v1/customers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers = await customersResponse.json();
    console.log('Available customers:', customers.slice(0, 3));
    
    // Get services
    const servicesResponse = await fetch('/api/v1/services', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const services = await servicesResponse.json();
    console.log('Available services:', services.slice(0, 3));
    
    // Get staff
    const staffResponse = await fetch('/api/v1/staff', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const staff = await staffResponse.json();
    console.log('Available staff:', staff);
    
    return { customers, services, staff };
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Run this to create a booking with real IDs
async function createRealBooking() {
  const data = await checkRequiredData();
  
  if (!data || !data.customers?.length || !data.services?.length) {
    console.error('No customers or services found. Please create them first.');
    return;
  }
  
  const token = localStorage.getItem('merchant_token') || sessionStorage.getItem('merchant_token');
  const today = new Date();
  today.setHours(14, 0, 0, 0);
  
  const bookingData = {
    customerId: data.customers[0].id,
    serviceId: data.services[0].id,
    staffId: data.staff[0]?.id || '4cf5b69e-5d15-4ef2-8149-72e3bc28d44f',
    startTime: today.toISOString(),
    duration: data.services[0].duration || 60,
    status: 'CONFIRMED',
    amount: data.services[0].price || 100,
    notes: 'Test booking for drag and drop testing'
  };
  
  try {
    console.log('Creating booking with real data:', bookingData);
    
    const response = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Booking created! Refresh the page to see it.');
      // Reload the page to show the new booking
      setTimeout(() => window.location.reload(), 1000);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check data first, then create booking
console.log('Checking for existing customers and services...');
createRealBooking();