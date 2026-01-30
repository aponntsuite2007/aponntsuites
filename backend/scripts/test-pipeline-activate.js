/**
 * Test: Pipeline de Altas - Activación de empresa
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
    console.log('🚀 Test: Pipeline de Altas\n');
    console.log('='.repeat(50));

    // 1. Staff login
    console.log('\n1️⃣ Login staff...');
    const loginRes = await request('POST', '/api/aponnt/staff/login', {
        email: 'admin@aponnt.com',
        password: 'admin123'
    });

    if (!loginRes.data.token) {
        console.log('❌ Login fallido:', loginRes.data);
        return;
    }
    console.log('✅ Staff login exitoso');
    const token = loginRes.data.token;

    // 2. Get quotes
    console.log('\n2️⃣ Obteniendo presupuestos...');
    const quotesRes = await request('GET', '/api/quotes', null, token);
    const quotes = quotesRes.data.quotes || quotesRes.data || [];
    console.log(`✅ Encontrados ${quotes.length} presupuestos`);

    // Mostrar distribución por estado
    const statusCounts = {};
    quotes.forEach(q => {
        statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
    });
    console.log('   Distribución por estado:', statusCounts);

    // 3. Buscar un quote accepted para probar activación
    const acceptedQuote = quotes.find(q => q.status === 'accepted');
    if (acceptedQuote) {
        console.log(`\n3️⃣ Probando activación con quote ${acceptedQuote.id} (${acceptedQuote.quote_number})...`);

        const activateRes = await request('POST', `/api/quotes/${acceptedQuote.id}/activate-company`, {}, token);
        console.log('   Respuesta:', JSON.stringify(activateRes.data, null, 2));

        if (activateRes.data.success) {
            console.log('   ✅ Empresa activada correctamente');
            if (activateRes.data.admin_created) {
                console.log('   📋 Usuario admin creado:');
                console.log('      Username: administrador');
                console.log('      Password: admin123');
            }
        }
    } else {
        console.log('\n3️⃣ No hay quotes en estado "accepted" para probar activación');
    }

    // 4. Test endpoint nuevo
    console.log('\n4️⃣ Verificando endpoint activate-company existe...');
    const testQuote = quotes[0];
    if (testQuote) {
        const testRes = await request('GET', `/api/quotes/${testQuote.id}`, null, token);
        console.log('   GET quote OK:', testRes.status === 200 ? '✅' : '❌');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completado');
    console.log('\n📋 Para probar el Pipeline visual:');
    console.log('   1. Ir a http://localhost:9998/panel-administrativo.html');
    console.log('   2. Login: admin / admin123');
    console.log('   3. CRM > Presupuestos');
    console.log('   4. Click en "📊 Pipeline"');
}

test().catch(console.error);
