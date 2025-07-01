// This script should be added to the merchant app to monitor polling
// Add this to a test page or component in the merchant app

const testNotificationPolling = () => {
  console.log('\n=== Testing Notification Polling ===\n');
  
  // Track polling events
  let pollCount = 0;
  let lastPollTime = Date.now();
  
  // Override fetch to monitor API calls
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0];
    
    // Check if this is a notification API call
    if (url && url.includes('/notifications')) {
      pollCount++;
      const timeSinceLastPoll = Date.now() - lastPollTime;
      lastPollTime = Date.now();
      
      console.log(`[Poll #${pollCount}] Fetching notifications`);
      console.log(`  Time since last poll: ${timeSinceLastPoll}ms`);
      console.log(`  URL: ${url}`);
      console.log(`  Timestamp: ${new Date().toISOString()}`);
    }
    
    // Call original fetch
    const response = await originalFetch(...args);
    
    // Log response for notification calls
    if (url && url.includes('/notifications')) {
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        console.log(`  Response: ${data.data ? data.data.length : 0} notifications`);
        if (data.data && data.data.length > 0) {
          console.log(`  Latest notification:`, data.data[0]);
        }
      } catch (e) {
        console.log('  Could not parse response');
      }
    }
    
    return response;
  };
  
  console.log('Monitoring started. Watch console for polling activity...');
  console.log('Expected: Should see polls every 5 seconds');
  
  // Monitor for 1 minute
  setTimeout(() => {
    console.log('\n=== Polling Summary ===');
    console.log(`Total polls in 1 minute: ${pollCount}`);
    console.log(`Expected polls: ~12 (every 5 seconds)`);
    console.log(`Status: ${pollCount >= 10 ? '✅ Polling working' : '❌ Polling may not be working'}`);
    
    // Restore original fetch
    window.fetch = originalFetch;
    console.log('\nMonitoring stopped. fetch() restored.');
  }, 60000);
};

// Export for use in React component
if (typeof module !== 'undefined') {
  module.exports = testNotificationPolling;
} else {
  console.log('Run testNotificationPolling() in browser console to start monitoring');
}