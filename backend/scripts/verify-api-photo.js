const http = require('http');
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjQ1NTIzMDEsImV4cCI6MTc2NDYzODcwMX0.UILDquRl3q5B07MM7u6O4lUWcMUOuHSk1ccS0yebkvM';
const USER_ID = '766de495-e4f3-4e91-a509-1a495c52e15c';

http.get(`http://localhost:9998/api/v1/users/${USER_ID}`, {
  headers: { 'Authorization': `Bearer ${TOKEN}` }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('=== RESPUESTA API /api/v1/users/:id ===');
      console.log('Status:', res.statusCode);
      console.log('Raw keys:', Object.keys(json).slice(0, 20));

      // Handle different response structures
      const user = json.user || json;
      console.log('\nUser data:');
      console.log('employeeId:', user.employeeId);
      console.log('firstName:', user.firstName);
      console.log('lastName:', user.lastName);
      console.log('biometric_photo_url:', user.biometric_photo_url || '❌ NO INCLUIDO');
      console.log('biometric_photo_date:', user.biometric_photo_date || 'N/A');
      console.log('biometric_photo_expiration:', user.biometric_photo_expiration || 'N/A');

      // Also check camelCase versions
      console.log('\nCamelCase versions:');
      console.log('biometricPhotoUrl:', user.biometricPhotoUrl || 'N/A');
    } catch(e) {
      console.log('Error parsing:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', e => console.log('Error:', e.message));
