const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long';

// Create a test token
const merchantId = process.argv[2] || '43810c09-215d-434f-8862-b864f751934d'; // Default to Ngan Nails
const payload = {
  sub: 'test-user-id-123',
  merchantId: merchantId,
  email: 'test@example.com',
  type: 'merchant'
};

const token = jwt.sign(payload, SECRET, {
  expiresIn: '1h'
});

console.log('Test JWT Token:');
console.log(token);
console.log('\nPayload:', payload);