const { spawn } = require('child_process');
const path = require('path');

console.log('Starting merchant app...');

const merchantApp = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps/merchant-app'),
  stdio: 'inherit'
});

merchantApp.on('error', (err) => {
  console.error('Failed to start merchant app:', err);
});

merchantApp.on('close', (code) => {
  console.log(`Merchant app exited with code ${code}`);
});

// Test connection after 10 seconds
setTimeout(() => {
  const http = require('http');
  const req = http.get('http://localhost:3002/', (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('✅ Merchant app is responding!');
  });
  
  req.on('error', (err) => {
    console.log('❌ Connection failed:', err.message);
  });
}, 10000);