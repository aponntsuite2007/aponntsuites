const fetch = require('node-fetch');

async function testLogin() {
    const response = await fetch('http://localhost:9998/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: 'RRHH-002',
            password: 'admin123',
            companySlug: 'isi'
        })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
}

testLogin();
