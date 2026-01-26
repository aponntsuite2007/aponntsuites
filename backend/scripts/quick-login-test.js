const axios = require('axios');
axios.post('http://localhost:9998/api/v1/auth/login', {
  identifier: 'admin@isi.com',
  password: 'admin123',
  companySlug: 'isi'
}).then(r => console.log('Login OK:', r.data.user?.email || 'success'))
  .catch(e => console.log('Error:', e.response?.data?.error || e.message));
