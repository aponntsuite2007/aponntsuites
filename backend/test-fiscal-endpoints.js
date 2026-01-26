/**
 * Test: Fiscal API endpoints via HTTP
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
    if (cond) { passed++; }
    else { failed++; console.log('  FAIL:', msg, detail); }
}

async function run() {
    // Login
    console.log('--- Login ---');
    const loginRes = await request('POST', '/api/v1/auth/login', {
        identifier: 'administrador',
        password: 'admin123',
        companySlug: 'aponnt-empresa-demo'
    });
    assert(loginRes.status === 200, 'Login OK', `status=${loginRes.status}`);
    TOKEN = loginRes.body.token;
    assert(!!TOKEN, 'Got token');
    console.log('  Token:', TOKEN.slice(0, 30) + '...');

    // 1. GET /fiscal/countries
    console.log('\n--- 1. GET /fiscal/countries ---');
    const countriesRes = await request('GET', '/api/procurement/fiscal/countries');
    console.log('  Status:', countriesRes.status);
    if (countriesRes.status === 200 && countriesRes.body.success) {
        const countries = countriesRes.body.data;
        assert(Array.isArray(countries), 'Returns array');
        assert(countries.length >= 6, '6+ countries', `got ${countries.length}`);
        const ar = countries.find(c => c.code === 'AR');
        assert(ar && !ar.isStub, 'AR is not stub');
        const cl = countries.find(c => c.code === 'CL');
        assert(cl && cl.isStub, 'CL is stub');
        console.log('  Countries:', countries.map(c => c.code).join(', '));
    } else {
        assert(false, 'Countries endpoint failed', JSON.stringify(countriesRes.body).slice(0, 200));
    }

    // 2. POST /fiscal/calculate-tax
    console.log('\n--- 2. POST /fiscal/calculate-tax ---');
    const taxRes = await request('POST', '/api/procurement/fiscal/calculate-tax', {
        subtotal: 10000,
        countryCode: 'AR',
        taxConditionBuyer: 'RI',
        taxConditionSeller: 'RI'
    });
    console.log('  Status:', taxRes.status);
    if (taxRes.status === 200 && taxRes.body.success) {
        const d = taxRes.body.data;
        assert(d.taxAmount === 2100, 'AR IVA 21% = 2100', `got ${d.taxAmount}`);
        assert(d.taxPercent === 21, 'taxPercent=21');
        console.log('  Result:', JSON.stringify(d));
    } else {
        assert(false, 'Calculate-tax failed', JSON.stringify(taxRes.body).slice(0, 200));
    }

    // Test CL
    const taxCl = await request('POST', '/api/procurement/fiscal/calculate-tax', {
        subtotal: 10000, countryCode: 'CL'
    });
    if (taxCl.status === 200 && taxCl.body.success) {
        assert(taxCl.body.data.taxPercent === 19, 'CL IVA 19%', `got ${taxCl.body.data.taxPercent}`);
    }

    // 3. POST /fiscal/calculate-retentions
    console.log('\n--- 3. POST /fiscal/calculate-retentions ---');
    const retRes = await request('POST', '/api/procurement/fiscal/calculate-retentions', {
        amount: 100000,
        taxAmount: 21000,
        countryCode: 'AR',
        supplierTaxCondition: 'RI',
        buyerTaxCondition: 'RI',
        purchaseType: 'goods',
        province: 'Buenos Aires'
    });
    console.log('  Status:', retRes.status);
    if (retRes.status === 200 && retRes.body.success) {
        const d = retRes.body.data;
        assert(d.totalRetentions > 0, 'AR retentions > 0', `got ${d.totalRetentions}`);
        assert(d.breakdown && d.breakdown.length >= 3, 'AR 3+ retentions', `got ${d.breakdown?.length}`);
        console.log('  Total:', d.totalRetentions);
        console.log('  Breakdown:', d.breakdown.map(b => `${b.type}=${b.amount}`).join(', '));
    } else {
        assert(false, 'Calculate-retentions failed', JSON.stringify(retRes.body).slice(0, 200));
    }

    // Test BR retentions
    const retBr = await request('POST', '/api/procurement/fiscal/calculate-retentions', {
        amount: 100000, taxAmount: 18000, countryCode: 'BR', purchaseType: 'services'
    });
    if (retBr.status === 200 && retBr.body.success) {
        assert(retBr.body.data.totalRetentions > 0, 'BR retentions > 0', `got ${retBr.body.data.totalRetentions}`);
    }

    // 4. POST /fiscal/determine-invoice-type
    console.log('\n--- 4. POST /fiscal/determine-invoice-type ---');
    const invRes = await request('POST', '/api/procurement/fiscal/determine-invoice-type', {
        countryCode: 'AR',
        buyerCondition: 'RI',
        sellerCondition: 'RI'
    });
    console.log('  Status:', invRes.status);
    if (invRes.status === 200 && invRes.body.success) {
        const d = invRes.body.data;
        assert(d.invoiceType === 'A', 'AR RI->RI = A', `got ${d.invoiceType}`);
        console.log('  Result:', JSON.stringify(d));
    } else {
        assert(false, 'Determine-invoice-type failed', JSON.stringify(invRes.body).slice(0, 200));
    }

    // 5. POST /fiscal/validate-tax-id
    console.log('\n--- 5. POST /fiscal/validate-tax-id ---');
    const tidRes = await request('POST', '/api/procurement/fiscal/validate-tax-id', {
        countryCode: 'AR',
        taxId: '20055361682'
    });
    console.log('  Status:', tidRes.status);
    if (tidRes.status === 200 && tidRes.body.success) {
        const d = tidRes.body.data;
        assert(d.valid === true, 'CUIT valid', JSON.stringify(d));
        console.log('  Result:', JSON.stringify(d));
    } else {
        assert(false, 'Validate-tax-id failed', JSON.stringify(tidRes.body).slice(0, 200));
    }

    // Invalid CUIT
    const tidInv = await request('POST', '/api/procurement/fiscal/validate-tax-id', {
        countryCode: 'AR', taxId: '12345'
    });
    if (tidInv.status === 200 && tidInv.body.success) {
        assert(tidInv.body.data.valid === false, 'Invalid CUIT rejected');
    }

    // BR CNPJ
    const tidBr = await request('POST', '/api/procurement/fiscal/validate-tax-id', {
        countryCode: 'BR', taxId: '11222333000181'
    });
    if (tidBr.status === 200 && tidBr.body.success) {
        assert(tidBr.body.data.valid === true, 'BR CNPJ valid');
    }

    console.log('\n' + '='.repeat(50));
    console.log('RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
    console.log('='.repeat(50));
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
