// Run this in the browser console to check auth state
console.log('=== AUTH STATE CHECK ===');
console.log('Access Token:', localStorage.getItem('access_token')?.substring(0, 50) + '...');
console.log('Refresh Token:', localStorage.getItem('refresh_token')?.substring(0, 50) + '...');
console.log('User:', localStorage.getItem('user'));
console.log('Merchant:', localStorage.getItem('merchant'));
console.log('Merchant ID:', localStorage.getItem('merchantId'));

// Decode the JWT token to see what's in it
const token = localStorage.getItem('access_token');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('\nToken Payload:', payload);
    console.log('Token Expiry:', new Date(payload.exp * 1000));
  } catch (e) {
    console.error('Failed to decode token:', e);
  }
}

// Check cookies
console.log('\nCookies:');
document.cookie.split(';').forEach(cookie => {
  if (cookie.includes('auth') || cookie.includes('token')) {
    console.log(cookie.trim());
  }
});