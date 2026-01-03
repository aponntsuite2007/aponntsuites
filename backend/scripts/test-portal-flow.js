/**
 * Test script for Supplier Portal flow
 */
const http = require('http');
const { Pool } = require('pg');

function httpRequest(method, path, headers, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 9998,
            path,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    // 1. Login
    console.log('🔐 1. Iniciando sesión...');
    const login = await httpRequest('POST', '/api/v1/auth/login', {}, {
        identifier: 'administrador',
        password: 'admin123',
        companySlug: 'aponnt-empresa-demo'
    });

    if (!login.token) {
        console.log('❌ Login falló:', login);
        return;
    }
    console.log('   ✅ Login exitoso');
    const auth = { Authorization: 'Bearer ' + login.token };

    // 2. Crear nuevo proveedor
    console.log('\n📦 2. Creando proveedor de prueba...');
    const supplier = await httpRequest('POST', '/api/procurement/suppliers', auth, {
        code: 'PT-' + Date.now().toString().slice(-6),
        name: 'Proveedor Portal Demo',
        legal_name: 'Proveedor Portal Demo S.R.L.',
        tax_id: '30-' + Date.now().toString().slice(-8) + '-0',
        email: 'portal-' + Date.now() + '@proveedor-test.com',
        phone: '11-9999-8888',
        contact_name: 'Juan Test',
        address: 'Av. Demo 789',
        city: 'Buenos Aires',
        is_active: true
    });

    if (!supplier.success) {
        console.log('   ❌ Error creando proveedor:', supplier.error || supplier);
        return;
    }
    console.log('   ✅ Proveedor creado, ID:', supplier.data.id);

    // 3. Habilitar portal
    console.log('\n🔑 3. Habilitando portal de proveedores...');
    const enable = await httpRequest('POST', '/api/procurement/suppliers/' + supplier.data.id + '/enable-portal', auth, {});

    if (enable.success) {
        console.log('   ✅ Portal habilitado!');
        console.log('   📧 Email:', enable.data.portal_user_email);
        console.log('   📝 Mensaje:', enable.data.message);
    } else {
        console.log('   ❌ Error:', enable.error || enable);
    }

    // 4. Verificar en BD
    console.log('\n📊 4. Verificando en base de datos...');
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Aedr15150302',
        database: 'attendance_system'
    });

    const suppRow = await pool.query('SELECT id, name, email, portal_enabled FROM wms_suppliers WHERE id = $1', [supplier.data.id]);
    console.log('   Proveedor:', JSON.stringify(suppRow.rows[0]));

    const userRow = await pool.query('SELECT id, email, is_active, must_change_password FROM supplier_portal_users WHERE supplier_id = $1', [supplier.data.id]);
    console.log('   Usuario Portal:', JSON.stringify(userRow.rows[0]));

    await pool.end();

    console.log('\n✅ ¡Test completado exitosamente!');
}

test().catch(e => console.error('Error:', e));
