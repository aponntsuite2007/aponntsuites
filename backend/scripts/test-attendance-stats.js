/**
 * Test script para verificar el endpoint /api/v1/attendance/stats
 * Ejecutar: node scripts/test-attendance-stats.js
 */

const http = require('http');

const PORT = process.env.PORT || 9998;
const COMPANY_ID = 11; // ISI

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function main() {
    console.log('\n📊 TEST: Attendance Stats Endpoint');
    console.log('='.repeat(50));
    console.log(`Puerto: ${PORT} | Empresa: ${COMPANY_ID}\n`);

    // 1. Login
    console.log('1️⃣ Login...');
    const loginData = JSON.stringify({
        identifier: 'admin',
        password: 'admin123',
        companyId: COMPANY_ID
    });

    const loginRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, loginData);

    if (!loginRes.data.token) {
        console.log('❌ Login failed:', loginRes.data);
        process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Token obtenido\n');

    // 2. Test stats without date params (should use last 30 days)
    console.log('2️⃣ Stats sin parámetros (últimos 30 días por defecto)...');
    const statsRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/attendance/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('   Resultado:', JSON.stringify(statsRes.data, null, 2));

    if (parseInt(statsRes.data.total) > 0) {
        console.log('✅ Stats funcionando correctamente!\n');
    } else {
        console.log('⚠️  Stats retorna 0 - verificar rango de fechas\n');
    }

    // 3. Test stats with specific date range
    console.log('3️⃣ Stats con rango específico (últimos 7 días)...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];

    const statsRangeRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/attendance/stats?startDate=${startDate}&endDate=${endDate}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`   Rango: ${startDate} a ${endDate}`);
    console.log('   Resultado:', JSON.stringify(statsRangeRes.data, null, 2));

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN:');
    console.log(`   Total registros: ${statsRes.data.total || 0}`);
    console.log(`   Presentes: ${statsRes.data.present || 0}`);
    console.log(`   Tardanzas: ${statsRes.data.late || 0}`);
    console.log(`   Ausentes: ${statsRes.data.absent || 0}`);
    console.log(`   A tiempo: ${statsRes.data.onTime || 0}`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
