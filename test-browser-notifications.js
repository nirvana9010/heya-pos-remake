// Browser test script to debug notification behavior
// Run this in browser console

const testBrowserNotifications = () => {
  console.log('\n=== Testing Browser Notifications ===\n');
  
  // Check localStorage
  const shownNotifications = localStorage.getItem('shownBrowserNotifications');
  console.log('Stored shown notifications:', shownNotifications ? JSON.parse(shownNotifications) : 'None');
  
  // Check notification permission
  console.log('Browser notification permission:', window.Notification ? Notification.permission : 'Not supported');
  
  // Monitor notification context
  if (window.__notificationDebug) {
    console.log('\nCurrent notification state:');
    console.log('  Total notifications:', window.__notificationDebug.notifications.length);
    console.log('  Unread notifications:', window.__notificationDebug.unreadCount);
    console.log('  Previous IDs:', Array.from(window.__notificationDebug.prevIds || []));
    console.log('  Shown browser notifications:', Array.from(window.__notificationDebug.shownIds || []));
  } else {
    console.log('\nAdd this debug code to notifications-context.tsx:');
    console.log(`
    // Add after the useEffect that shows browser notifications
    useEffect(() => {
      window.__notificationDebug = {
        notifications,
        unreadCount,
        prevIds: prevNotificationIdsRef.current,
        shownIds: shownBrowserNotificationsRef.current
      };
    }, [notifications, unreadCount]);
    `);
  }
  
  // Test creating a notification
  console.log('\n--- Testing Browser Notification ---');
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      const testNotif = new Notification('Test Notification', {
        body: 'This is a test browser notification',
        icon: '/favicon.ico',
        tag: 'test-' + Date.now()
      });
      setTimeout(() => testNotif.close(), 3000);
      console.log('✅ Test notification created (will close in 3s)');
    } else if (Notification.permission === 'denied') {
      console.log('❌ Notifications are blocked. Enable them in browser settings.');
    } else {
      console.log('⚠️ Need to request notification permission first');
      Notification.requestPermission().then(permission => {
        console.log('Permission result:', permission);
      });
    }
  } else {
    console.log('❌ Browser notifications not supported');
  }
  
  // Clear stored notifications
  console.log('\nTo clear stored shown notifications, run:');
  console.log('  localStorage.removeItem("shownBrowserNotifications")');
  
  // Monitor for new notifications
  console.log('\n--- Monitoring for New Notifications ---');
  console.log('Create/cancel/complete a booking and watch for console logs...');
};

testBrowserNotifications();