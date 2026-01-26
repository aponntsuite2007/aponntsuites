/**
 * Test: CompanyTaxConfig API endpoints
 */
const http = require('http');

const BASE = 'http://localhost:9998';
let TOKEN = '';
let passed = 0, failed = 0;

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {})
            }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function assert(cond, msg, detail = '') {
    if (cond) { passed++; console.log('  ✅', msg); }
    else { failed++; console.log('  ❌ FAIL:', msg, detail); }
}

async function run() {
    // Login
    console.log('--- Login ---');
    const loginRes = await request('POST', '/api/v1/auth/login', {
        identifier: 'administrador',
        password: 'admin123',
        companySlug: 'aponnt-empresa-demo'
    });
    assert(loginRes.status === 200, 'Login OK');
    TOKEN = loginRes.body.token;

    // 1. GET /company-tax-config
    console.log('\n--- 1. GET /company-tax-config ---');
    const getRes = await request('GET', '/api/procurement/company-tax-config');
    console.log('  Status:', getRes.status);
    assert(getRes.status === 200, 'GET returns 200');
    assert(getRes.body.success === true, 'Response has success=true');
    assert(getRes.body.data !== undefined, 'Response has data');
    if (getRes.body.data) {
        console.log('  Config:', getRes.body.data.config ? 'exists' : 'null (will create)');
        console.log('  Concepts:', getRes.body.data.concepts?.length || 0);
    }

    // 2. POST /company-tax-config/override
    console.log('\n--- 2. POST /company-tax-config/override ---');
    const overrideRes = await request('POST', '/api/procurement/company-tax-config/override', {
        conceptCode: 'RET_GANANCIAS',
        percentage: 3.5
    });
    console.log('  Status:', overrideRes.status);
    assert(overrideRes.status === 200, 'Override created');
    assert(overrideRes.body.data?.percentage === 3.5, 'Override value is 3.5%');
    console.log('  Message:', overrideRes.body.message);

    // 3. Verify override is saved
    console.log('\n--- 3. Verify override persisted ---');
    const getRes2 = await request('GET', '/api/procurement/company-tax-config');
    const overrides = getRes2.body.data?.config?.conceptOverrides || {};
    assert(overrides['RET_GANANCIAS'] === 3.5, 'RET_GANANCIAS override = 3.5%', JSON.stringify(overrides));

    // 4. Update general config
    console.log('\n--- 4. PUT /company-tax-config ---');
    const putRes = await request('PUT', '/api/procurement/company-tax-config', {
        customConditionCode: 'RI',
        puntoVenta: 5,
        descuentoMaximo: 15,
        recargoMaximo: 10
    });
    console.log('  Status:', putRes.status);
    assert(putRes.status === 200, 'PUT returns 200');
    console.log('  Message:', putRes.body.message);

    // 5. Verify general config saved
    console.log('\n--- 5. Verify general config ---');
    const getRes3 = await request('GET', '/api/procurement/company-tax-config');
    const cfg = getRes3.body.data?.config;
    assert(cfg?.puntoVenta === 5, 'puntoVenta = 5', `got ${cfg?.puntoVenta}`);
    assert(parseFloat(cfg?.descuentoMaximo) === 15, 'descuentoMaximo = 15', `got ${cfg?.descuentoMaximo}`);

    // 6. DELETE override
    console.log('\n--- 6. DELETE /company-tax-config/override ---');
    const delRes = await request('DELETE', '/api/procurement/company-tax-config/override/RET_GANANCIAS');
    console.log('  Status:', delRes.status);
    assert(delRes.status === 200, 'DELETE returns 200');

    // 7. Verify override deleted
    console.log('\n--- 7. Verify override deleted ---');
    const getRes4 = await request('GET', '/api/procurement/company-tax-config');
    const overrides2 = getRes4.body.data?.config?.conceptOverrides || {};
    assert(!('RET_GANANCIAS' in overrides2), 'Override removed', JSON.stringify(overrides2));

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
    console.log('='.repeat(50));
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
