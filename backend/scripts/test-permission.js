const axios = require('axios');
const mongoose = require('mongoose');

async function testPermission() {
  try {
    // 1. Login as Admin
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@mha.gov.in',
      password: 'password123'
    });
    
    const token = loginRes.data.data.accessToken;
    const documentId = '6a8c1106092bb87765d1335d'; // ID from user's logs
    
    // 2. Fetch users to get a valid user ID
    const usersRes = await axios.get('http://localhost:5000/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const reviewer = usersRes.data.data.users.find(u => u.email === 'reviewer@mha.gov.in');
    
    // 3. Try to grant permission
    try {
      const grantRes = await axios.post(`http://localhost:5000/api/v1/documents/${documentId}/permissions/grant`, {
        userId: reviewer._id,
        permission: 'VIEW'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('SUCCESS:', grantRes.data);
    } catch (err) {
      console.log('ERROR STATUS:', err.response?.status);
      console.log('ERROR DATA:', JSON.stringify(err.response?.data, null, 2));
    }
    
  } catch (err) {
    console.log('SETUP ERROR:', err.response ? err.response.data : err.message);
  }
}

testPermission();
