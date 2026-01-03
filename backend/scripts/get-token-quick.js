// Quick script to get auth token
const http = require('http');

const loginData = JSON.stringify({
  identifier: 'administrador',
  password: 'admin123',
  companySlug: 'aponnt-empresa-demo'
});

const options = {
  hostname: 'localhost',
  port: 9998,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Full response:', JSON.stringify(response, null, 2));
      if (response.success && response.token) {
        console.log('\nTOKEN:', response.token);
      } else if (response.token) {
        console.log('\nTOKEN:', response.token);
      } else {
        console.error('Error:', response.error || 'No token received');
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

req.write(loginData);
req.end();
