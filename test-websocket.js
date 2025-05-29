const io = require('socket.io-client');
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'http://localhost:3000';

async function testWebSocket() {
  console.log('Testing WebSocket functionality...\n');
  
  // First, get auth token
  let token = null;
  try {
    const login = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    token = login.data.token;
    console.log('✓ Authenticated successfully');
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
    return;
  }
  
  // Connect to WebSocket
  const socket = io(WS_URL, {
    auth: {
      token
    },
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('✓ WebSocket connected');
    console.log('  Socket ID:', socket.id);
    
    // Subscribe to calendar updates
    socket.emit('subscribe:calendar', {
      merchantId: 'cmb6b3ina0003vo6xs5lzeeqz',
      locationId: 'cmb6b3iox0007vo6xiv7cms3d'
    });
    console.log('✓ Subscribed to calendar updates');
  });
  
  socket.on('booking:created', (data) => {
    console.log('📅 Booking created event received:', data);
  });
  
  socket.on('booking:updated', (data) => {
    console.log('📅 Booking updated event received:', data);
  });
  
  socket.on('booking:deleted', (data) => {
    console.log('📅 Booking deleted event received:', data);
  });
  
  socket.on('error', (error) => {
    console.error('✗ WebSocket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('✗ WebSocket disconnected:', reason);
  });
  
  // Keep the connection open for 10 seconds to test real-time updates
  console.log('\nListening for real-time updates for 10 seconds...');
  setTimeout(() => {
    socket.disconnect();
    console.log('\nWebSocket test completed');
    process.exit(0);
  }, 10000);
}

testWebSocket().catch(console.error);