const fetch = require('node-fetch');

async function debugPublicStaff() {
  const res = await fetch('http://localhost:3000/api/public/staff');
  const data = await res.json();
  
  console.log('Public staff endpoint response:');
  console.log('Total staff:', data.data?.length);
  
  console.log('\nTest staff:');
  data.data?.filter(s => s.name.includes('Test')).forEach(s => {
    console.log(`  Name: "${s.name}" ID: ${s.id}`);
  });
}

debugPublicStaff().catch(console.error);