#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function checkOwnerStaff() {
  try {
    // First login
    const loginResponse = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const token = loginResponse.data.token;
    
    // Get staff list
    const staffResponse = await axios.get(`${API_URL}/staff`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('All Staff Members:');
    console.log('==================');
    staffResponse.data.forEach(staff => {
      console.log(`- ${staff.firstName} ${staff.lastName} (${staff.role}) - Access Level: ${staff.accessLevel}`);
      if (staff.permissions?.includes('*')) {
        console.log('  ⭐ Has full permissions (owner-level access)');
      }
    });
    
    // Check for owner-level staff
    // Access level 3 = owner (based on Staff interface: 1=employee, 2=manager, 3=owner)
    const ownerStaff = staffResponse.data.filter(s => 
      s.role === 'OWNER' || 
      s.accessLevel === 3 || 
      s.permissions?.includes('*')
    );
    
    console.log('\n\nOwner-Level Staff:');
    console.log('==================');
    if (ownerStaff.length > 0) {
      ownerStaff.forEach(owner => {
        console.log(`✅ ${owner.firstName} ${owner.lastName}`);
        console.log(`   - Role: ${owner.role}`);
        console.log(`   - Access Level: ${owner.accessLevel}`);
        console.log(`   - Has PIN: ${owner.pin ? 'Yes (hidden)' : 'No'}`);
      });
    } else {
      console.log('❌ No owner-level staff found');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkOwnerStaff();