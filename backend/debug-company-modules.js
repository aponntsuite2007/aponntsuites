const http = require('http');

async function makeRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 9999,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function test() {
    // 1. Login
    console.log('1️⃣ Intentando login...');
    const loginResponse = await makeRequest('/api/v1/auth/login', 'POST', {
        identifier: 'admin',
        password: 'admin123',
        companyId: 11
    });

    if (loginResponse.statusCode !== 200) {
        console.error('❌ Login falló:', loginResponse);
        return;
    }

    const token = loginResponse.body.token;
    console.log('✅ Login OK, token obtenido\n');

    // 2. Test company modules
    console.log('2️⃣ Probando /api/v1/company-modules/my-modules...');
    const modulesResponse = await makeRequest('/api/v1/company-modules/my-modules', 'GET', null, token);

    console.log(`Status: ${modulesResponse.statusCode}`);
    console.log('Response:', JSON.stringify(modulesResponse.body, null, 2));
}

test().catch(console.error);
