/**
 * Test: API de billing con autenticación staff correcta
 */
const http = require('http');

const BASE_URL = 'http://localhost:9998';

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, data: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    console.log('🚀 Test: API Billing con autenticación staff\n');

    // 1. Staff login
    console.log('1️⃣ Login staff...');
    const loginRes = await request('POST', '/api/aponnt/staff/login', {
        email: 'admin@aponnt.com',
        password: 'admin123'
    });

    if (!loginRes.data.token) {
        console.log('❌ Login fallido. Probando crear staff temporal...');

        // Try to get quotes first without auth to test if server is running
        const healthCheck = await request('GET', '/api/v1/health');
        console.log('Health check:', healthCheck.status);

        // Let's try to login using the dashboard login
        const dashLogin = await request('POST', '/api/aponnt/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (dashLogin.data.token) {
            console.log('✅ Dashboard login exitoso');
            var token = dashLogin.data.token;
        } else {
            console.log('❌ Dashboard login también falló:', dashLogin.data);
            return;
        }
    } else {
        console.log('✅ Staff login exitoso');
        var token = loginRes.data.token;
    }

    // 2. Get pre-invoices
    console.log('\n2️⃣ Obteniendo pre-facturas...');
    const preInvoicesRes = await request('GET', '/api/aponnt/billing/pre-invoices', null, token);

    console.log('   Status:', preInvoicesRes.status);
    if (preInvoicesRes.status === 200) {
        const data = preInvoicesRes.data;
        console.log('   Success:', data.success);
        console.log('   Total:', data.total || (data.data && data.data.length));
        if (data.data && data.data.length > 0) {
            console.log('\n   Pre-facturas encontradas:');
            data.data.slice(0, 5).forEach(pi => {
                console.log(`   - ID: ${pi.id}, Code: ${pi.pre_invoice_code}, Status: ${pi.status}`);
                console.log(`     Company: ${pi.company_name || pi.cliente_razon_social}`);
                console.log(`     Total: $${pi.total}`);
            });
        } else {
            console.log('   ⚠️ No hay pre-facturas');
        }
    } else {
        console.log('   ❌ Error:', preInvoicesRes.data);
    }

    // 3. Get dashboard stats
    console.log('\n3️⃣ Obteniendo stats del dashboard...');
    const statsRes = await request('GET', '/api/aponnt/billing/dashboard/stats', null, token);

    console.log('   Status:', statsRes.status);
    if (statsRes.status === 200) {
        console.log('   Stats:', JSON.stringify(statsRes.data, null, 2));
    } else {
        console.log('   ❌ Error:', statsRes.data);
    }

    console.log('\n✅ Test completado');
}

test().catch(console.error);
