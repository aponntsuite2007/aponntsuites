/**
 * Test: Circuito completo de Pre-Facturas desde Presupuestos
 * Verifica que las prefacturas generadas desde quotes aparecen en el módulo Facturación
 */
const http = require('http');

const BASE_URL = 'http://localhost:9998';

// Helper para hacer requests HTTP
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    console.log('🚀 Test: Circuito de Pre-Facturas\n');
    console.log('='.repeat(50));

    // 1. Login como admin staff
    console.log('\n1️⃣ Autenticando como staff admin...');
    const loginRes = await request('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
    });

    if (loginRes.status !== 200 || !loginRes.data.token) {
        console.log('❌ Login fallido:', loginRes.data);
        // Try staff login
        const staffLogin = await request('POST', '/api/aponnt/staff/login', {
            email: 'admin@aponnt.com',
            password: 'admin123'
        });
        if (staffLogin.status !== 200) {
            console.log('❌ Staff login también falló:', staffLogin.data);
            return;
        }
        var token = staffLogin.data.token;
        console.log('✅ Staff login exitoso');
    } else {
        var token = loginRes.data.token;
        console.log('✅ Login exitoso');
    }

    // 2. Obtener lista de quotes
    console.log('\n2️⃣ Obteniendo lista de presupuestos...');
    const quotesRes = await request('GET', '/api/quotes', null, token);

    if (quotesRes.status !== 200) {
        console.log('❌ Error obteniendo quotes:', quotesRes.data);
        return;
    }

    const quotes = quotesRes.data.data || quotesRes.data.quotes || [];
    console.log(`✅ Encontrados ${quotes.length} presupuestos`);

    if (quotes.length === 0) {
        console.log('⚠️ No hay presupuestos para testear');
        return;
    }

    // Mostrar los presupuestos
    console.log('   Presupuestos:');
    quotes.slice(0, 5).forEach(q => {
        console.log(`   - ID: ${q.id}, Num: ${q.quote_number}, Status: ${q.status}, Total: $${q.total_amount}`);
    });

    // 3. Buscar un presupuesto en estado apropiado para generar prefactura
    const targetQuote = quotes.find(q => ['in_trial', 'accepted', 'sent'].includes(q.status)) || quotes[0];
    console.log(`\n3️⃣ Usando presupuesto ID: ${targetQuote.id} (${targetQuote.quote_number}) - Status: ${targetQuote.status}`);

    // 4. Generar prefactura
    console.log('\n4️⃣ Generando prefactura...');
    const preInvoiceRes = await request('POST', `/api/quotes/${targetQuote.id}/generate-pre-invoice`, {}, token);

    if (preInvoiceRes.status !== 200) {
        console.log('❌ Error generando prefactura:', preInvoiceRes.data);
    } else {
        console.log('✅ Prefactura generada:', preInvoiceRes.data);
    }

    // 5. Verificar que aparece en la lista de prefacturas
    console.log('\n5️⃣ Verificando lista de prefacturas en Facturación...');
    const preInvoicesRes = await request('GET', '/api/aponnt/billing/pre-invoices', null, token);

    if (preInvoicesRes.status !== 200) {
        console.log('❌ Error obteniendo prefacturas:', preInvoicesRes.data);
    } else {
        const preInvoices = preInvoicesRes.data.data || preInvoicesRes.data || [];
        console.log(`✅ Encontradas ${preInvoices.length} prefacturas`);

        if (preInvoices.length > 0) {
            console.log('   Últimas prefacturas:');
            preInvoices.slice(0, 5).forEach(pi => {
                console.log(`   - ID: ${pi.id}, Code: ${pi.pre_invoice_code}, Company: ${pi.company_name || pi.cliente_razon_social}, Status: ${pi.status}, Budget: ${pi.budget_id || 'N/A'}`);
            });

            // Verificar si la que acabamos de crear está en la lista
            const newPreInvoice = preInvoices.find(pi => pi.budget_id == targetQuote.id);
            if (newPreInvoice) {
                console.log(`\n   ✅ Prefactura vinculada al presupuesto ${targetQuote.id} encontrada!`);
                console.log(`      Code: ${newPreInvoice.pre_invoice_code}`);
            } else {
                console.log(`\n   ⚠️ No se encontró prefactura vinculada al presupuesto ${targetQuote.id}`);
            }
        }
    }

    // 6. Verificar estado de billing del quote
    console.log('\n6️⃣ Verificando billing status del presupuesto...');
    const billingRes = await request('GET', `/api/quotes/${targetQuote.id}/billing-status`, null, token);

    if (billingRes.status !== 200) {
        console.log('❌ Error obteniendo billing status:', billingRes.data);
    } else {
        console.log('✅ Billing status:', JSON.stringify(billingRes.data, null, 2));
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completado');
}

test().catch(console.error);
