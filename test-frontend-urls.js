// Test script to verify FRONTEND_URLS parsing
const testUrls = "https://heya-pos-merchant.vercel.app,https://heya-pos-booking.vercel.app,https://heya-pos-admin.vercel.app,https://booking.heyapos.com,https://merchant.heyapos.com,https://admin.heyapos.com";

console.log("Testing FRONTEND_URLS parsing:");
console.log("==============================");
console.log("Raw string:", testUrls);
console.log("\nParsed URLs:");
const urls = testUrls.split(',').map(url => url.trim());
urls.forEach((url, index) => {
  console.log(`${index + 1}. "${url}"`);
});

console.log("\nChecking for 'https://booking.heyapos.com':");
console.log("Is included?", urls.includes('https://booking.heyapos.com'));

// Test what happens with spaces
console.log("\n\nTesting with spaces around commas:");
const urlsWithSpaces = "https://heya-pos-merchant.vercel.app, https://booking.heyapos.com";
const parsedWithSpaces = urlsWithSpaces.split(',').map(url => url.trim());
console.log("Parsed:", parsedWithSpaces);