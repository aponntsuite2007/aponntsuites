// Test news endpoint
const http = require('http');

const TOKEN = process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYzNTE4Mjg0LTg1ODUtNDU0Yi04NTNhLTYwYjY4OWVmMDNiZSIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJBRE1fMSIsImNvbXBhbnlfaWQiOjEsImlhdCI6MTc2NjU3Mjk1NiwiZXhwIjoxNzY2NjU5MzU2fQ.uHVnup0zZ1KTaE3FyXyjRVBt29yFC340pDDxGrTqSbI';

const options = {
  hostname: 'localhost',
  port: 9998,
  path: '/api/voice-platform/news',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

console.log('Testing GET /api/voice-platform/news...\n');

const req = http.request(options, (res) => {
  let data = '';

  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        console.log(`\n✅ SUCCESS: ${response.count} news found`);
      } else {
        console.log('\n❌ FAILED:', response.error);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.error('Raw data:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();
