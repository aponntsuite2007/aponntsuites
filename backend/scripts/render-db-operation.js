/**
 * Script para operaciones en Render DB con retry y timeout largo
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u';

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function executeQuery(query, params = [], retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 30000,
            query_timeout: 30000
        });

        try {
            console.log(`Intento ${attempt}/${retries}...`);
            await client.connect();
            const result = await client.query(query, params);
            await client.end();
            return result;
        } catch (err) {
            console.log(`  Error: ${err.message.substring(0, 60)}`);
            try { await client.end(); } catch (e) {}

            if (attempt < retries) {
                const waitTime = attempt * 3000;
                console.log(`  Esperando ${waitTime/1000}s antes de reintentar...`);
                await delay(waitTime);
            }
        }
    }
    throw new Error('No se pudo ejecutar query después de ' + retries + ' intentos');
}

async function main() {
    console.log('=== RENDER DB OPERATION ===\n');

    // 1. Check company exists
    console.log('1. Verificando empresa DEMO...');
    const companies = await executeQuery(`SELECT id, name, slug FROM companies WHERE slug = 'aponnt-demo'`);
    console.log('   Encontradas:', companies.rows.length);
    if (companies.rows.length === 0) {
        console.log('   ❌ Empresa DEMO no existe!');
        return;
    }
    const company = companies.rows[0];
    console.log(`   ✅ Empresa: ${company.name} (ID: ${company.id})`);

    // 2. Check users
    console.log('\n2. Verificando usuarios en DEMO...');
    const users = await executeQuery(`
        SELECT id, username, email, role, password
        FROM users
        WHERE company_id = $1
    `, [company.id]);

    console.log('   Usuarios encontrados:', users.rows.length);
    users.rows.forEach(u => {
        console.log(`   - ${u.username} (${u.role}) - hash: ${u.password?.substring(0, 15) || 'NULL'}...`);
    });

    // 3. Create or update admin user
    const adminUser = users.rows.find(u => u.username === 'admin');
    const newHash = await bcrypt.hash('admin123', 10);

    if (adminUser) {
        console.log('\n3. Actualizando password de admin...');
        await executeQuery(`
            UPDATE users SET password = $1 WHERE id = $2
        `, [newHash, adminUser.id]);
        console.log('   ✅ Password actualizado');
    } else {
        console.log('\n3. Creando usuario admin...');
        // Get required fields from users table structure
        const columns = await executeQuery(`
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log('   Columnas requeridas:', columns.rows.filter(c => c.is_nullable === 'NO').map(c => c.column_name).join(', '));

        // Insert admin user
        await executeQuery(`
            INSERT INTO users (
                username, email, password, role, company_id,
                "firstName", "lastName", active, "createdAt", "updatedAt"
            ) VALUES (
                'admin', 'admin@demo.com', $1, 'admin', $2,
                'Admin', 'Demo', true, NOW(), NOW()
            )
            ON CONFLICT (username, company_id) DO UPDATE SET password = $1
        `, [newHash, company.id]);
        console.log('   ✅ Usuario admin creado');
    }

    // 4. Verify final state
    console.log('\n4. Verificación final...');
    const finalUsers = await executeQuery(`
        SELECT id, username, email, role
        FROM users
        WHERE company_id = $1
    `, [company.id]);

    console.log('   Usuarios en DEMO:');
    finalUsers.rows.forEach(u => {
        console.log(`   - ID:${u.id} ${u.username} (${u.role}) - ${u.email}`);
    });

    // 5. Test password
    console.log('\n5. Verificando hash de password...');
    const testUser = await executeQuery(`SELECT password FROM users WHERE username = 'admin' AND company_id = $1`, [company.id]);
    if (testUser.rows.length > 0) {
        const match = await bcrypt.compare('admin123', testUser.rows[0].password);
        console.log(`   Password 'admin123' matches: ${match ? '✅ SÍ' : '❌ NO'}`);
    }

    console.log('\n=== OPERACIÓN COMPLETADA ===');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
