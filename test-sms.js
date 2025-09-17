// Test SMS script using Twilio
require('dotenv').config({ path: './apps/api/.env' });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio Configuration:');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'Not set');
console.log('From Number:', fromNumber);

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing Twilio credentials!');
  process.exit(1);
}

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

async function sendTestSMS() {
  try {
    console.log('\nSending SMS to +61422627624...');
    
    const message = await client.messages.create({
      body: 'Test SMS from Heya POS: Your booking is confirmed for tomorrow at 2:00 PM. This is a test message.',
      from: fromNumber,
      to: '+61422627624'
    });
    
    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('To:', message.to);
    console.log('From:', message.from);
    
  } catch (error) {
    console.error('❌ Failed to send SMS:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.moreInfo) {
      console.error('More info:', error.moreInfo);
    }
  }
}

sendTestSMS();