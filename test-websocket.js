const io = require('socket.io-client');

// Test token - you'll need to replace this with a valid JWT token
const TOKEN = process.env.JWT_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error('Please provide a JWT token as argument or set JWT_TOKEN env var');
  process.exit(1);
}

console.log('Connecting to WebSocket with token:', TOKEN.substring(0, 20) + '...');

const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: TOKEN
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket!');
  console.log('Socket ID:', socket.id);
  
  // Test ping
  socket.emit('ping');
  
  // Subscribe to channels
  socket.emit('subscribe', { channel: 'booking_created' });
  socket.emit('subscribe', { channel: 'booking_updated' });
});

socket.on('connected', (data) => {
  console.log('✅ Received connected event:', data);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  if (error.type === 'TransportError') {
    console.error('Transport error details:', error);
  }
});

// Listen for responses
socket.on('pong', (data) => {
  console.log('🏓 Pong received:', data);
});

socket.on('subscribed', (data) => {
  console.log('📢 Subscribed to channel:', data);
});

socket.on('error', (data) => {
  console.error('❌ Error from server:', data);
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('📬 Notification received:', data);
});

socket.on('booking_created', (data) => {
  console.log('📅 Booking created:', data);
});

socket.on('booking_updated', (data) => {
  console.log('📝 Booking updated:', data);
});

// Keep the script running
console.log('Listening for events... Press Ctrl+C to exit');
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  socket.close();
  process.exit(0);
});