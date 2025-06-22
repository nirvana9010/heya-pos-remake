// Test script to simulate drag and drop in the browser console
// Copy and paste this into the browser console when on the calendar page

async function testDragDrop() {
  console.log('=== Starting Drag and Drop Test ===');
  
  // First, let's create a test booking if there are none
  const testBooking = {
    id: 'test-booking-123',
    customerName: 'Test Customer',
    serviceName: 'Test Service',
    staffId: '4cf5b69e-5d15-4ef2-8149-72e3bc28d44f', // Emma Wilson
    staffName: 'Emma Wilson',
    startTime: new Date('2025-06-17T10:00:00'),
    endTime: new Date('2025-06-17T11:00:00'),
    duration: 60,
    status: 'confirmed',
    isPaid: false,
    amount: 100,
    customerPhone: '0400000000',
    serviceIcon: 'scissors',
    color: '#7C3AED'
  };

  // Find the calendar component and check if we can access its state
  console.log('Looking for React components...');
  
  // Try to find the drag and drop context
  const dndElements = document.querySelectorAll('[data-rfd-draggable-id], [data-dnd-draggable-id], [draggable="true"]');
  console.log('Found draggable elements:', dndElements.length);
  
  // Look for droppable slots
  const droppableSlots = document.querySelectorAll('[data-droppable-id], [data-rfd-droppable-id], .droppable-slot');
  console.log('Found droppable slots:', droppableSlots.length);
  
  // Check for booking elements
  const bookingElements = document.querySelectorAll('.booking-card, [class*="booking"], [data-booking-id]');
  console.log('Found booking elements:', bookingElements.length);
  
  // Try to trigger handleDragEnd directly if we can access React internals
  try {
    // This is a hack to access React fiber
    const getReactFiber = (dom) => {
      const key = Object.keys(dom).find(key => key.startsWith('__reactFiber'));
      return dom[key];
    };
    
    const calendarDiv = document.querySelector('.calendar-scroll-container, [class*="calendar"]');
    if (calendarDiv) {
      const fiber = getReactFiber(calendarDiv);
      console.log('Found React fiber:', !!fiber);
      
      // Try to find the component instance
      let current = fiber;
      while (current) {
        if (current.memoizedProps && (current.memoizedProps.onDragEnd || current.memoizedProps.handleDragEnd)) {
          console.log('Found drag handler in props!');
          break;
        }
        current = current.return;
      }
    }
  } catch (e) {
    console.log('Could not access React internals:', e.message);
  }
  
  // Alternative: directly call the API
  console.log('\n=== Testing API directly ===');
  
  // Get the auth token from localStorage or cookies
  const token = localStorage.getItem('merchant_token') || sessionStorage.getItem('merchant_token');
  console.log('Auth token found:', !!token);
  
  // Test reschedule API
  const testReschedule = async () => {
    try {
      const response = await fetch('/api/v1/bookings/test-booking-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          startTime: new Date('2025-06-17T15:45:00').toISOString(),
          staffId: '4cf5b69e-5d15-4ef2-8149-72e3bc28d44f'
        })
      });
      
      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('API Response:', data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };
  
  await testReschedule();
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testDragDrop();