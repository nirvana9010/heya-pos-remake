#!/usr/bin/env node

// Script to validate and clean FRONTEND_URLS for Railway deployment
// Usage: node scripts/validate-frontend-urls.js "url1,url2,url3"

const input = process.argv[2];

if (!input) {
  console.log('Usage: node scripts/validate-frontend-urls.js "url1,url2,url3"');
  console.log('Example: node scripts/validate-frontend-urls.js "https://booking.heyapos.com/,https://merchant.heyapos.com"');
  process.exit(1);
}

console.log('Validating FRONTEND_URLS...\n');
console.log('Input:', input);
console.log('');

const urls = input.split(',').map(url => url.trim());
const cleaned = [];
const issues = [];

urls.forEach((url, index) => {
  const original = url;
  let cleanUrl = url;
  
  // Remove trailing slash
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
    issues.push(`URL ${index + 1}: Removed trailing slash from "${original}"`);
  }
  
  // Check for common issues
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    issues.push(`URL ${index + 1}: Missing protocol (http:// or https://) in "${original}"`);
  }
  
  if (cleanUrl.includes(' ')) {
    issues.push(`URL ${index + 1}: Contains spaces in "${original}"`);
  }
  
  cleaned.push(cleanUrl);
});

console.log('Issues found:');
if (issues.length === 0) {
  console.log('✓ No issues found!');
} else {
  issues.forEach(issue => console.log('- ' + issue));
}

console.log('\nCleaned FRONTEND_URLS (copy this to Railway):');
console.log('----------------------------------------');
console.log(cleaned.join(','));
console.log('----------------------------------------');

// Additional validation
console.log('\nValidation:');
cleaned.forEach((url, index) => {
  try {
    const parsed = new URL(url);
    console.log(`✓ ${index + 1}. ${url} (valid URL)`);
  } catch (e) {
    console.log(`✗ ${index + 1}. ${url} (INVALID URL: ${e.message})`);
  }
});