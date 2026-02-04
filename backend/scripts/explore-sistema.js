/**
 * Script para explorar el sistema y obtener información de módulos y empresas
 */
const { Client } = require('pg');

async function explore() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
    });

    await client.connect();

    try {
        // 1. Empresas activas
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  EMPRESAS ACTIVAS');
        console.log('═══════════════════════════════════════════════════════════\n');

        const empresas = await client.query(`
            SELECT c.company_id, c.name, c.slug, c.is_active,
                   (SELECT COUNT(*) FROM company_modules WHERE company_id = c.company_id) as total_modules
            FROM companies c
            WHERE c.is_active = true
            ORDER BY c.company_id
        `);

        empresas.rows.forEach(e => {
            console.log(`[${e.company_id}] ${e.name}`);
            console.log(`    slug: ${e.slug}`);
            console.log(`    módulos en company_modules: ${e.total_modules}`);
            console.log('');
        });

        // 2. Módulos comerciales (tarjetas)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  MÓDULOS COMERCIALES (TARJETAS) - panel-empresa');
        console.log('═══════════════════════════════════════════════════════════\n');

        const modulos = await client.query(`
            SELECT module_key, display_name, commercial_type, is_core, show_as_card
            FROM system_modules
            WHERE target_panel = 'panel-empresa'
              AND show_as_card = true
              AND parent_module_key IS NULL
            ORDER BY is_core DESC, display_name
        `);

        console.log(`Total: ${modulos.rows.length} módulos\n`);

        let coreCount = 0;
        let opcionalCount = 0;

        modulos.rows.forEach((m, i) => {
            const tipo = m.is_core ? '🔵 CORE' : '🟢 OPCIONAL';
            if (m.is_core) coreCount++; else opcionalCount++;
            console.log(`${String(i+1).padStart(2)}. [${m.module_key}] ${m.display_name} - ${tipo}`);
        });

        console.log(`\n📊 Resumen: ${coreCount} CORE + ${opcionalCount} OPCIONALES = ${modulos.rows.length} total`);

        // 3. Submódulos por módulo padre
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  SUBMÓDULOS POR MÓDULO PADRE');
        console.log('═══════════════════════════════════════════════════════════\n');

        const submodulos = await client.query(`
            SELECT parent_module_key, module_key, display_name
            FROM system_modules
            WHERE parent_module_key IS NOT NULL
            ORDER BY parent_module_key, display_name
        `);

        let currentParent = '';
        submodulos.rows.forEach(s => {
            if (s.parent_module_key !== currentParent) {
                currentParent = s.parent_module_key;
                console.log(`\n📁 ${currentParent}:`);
            }
            console.log(`   └─ ${s.module_key}: ${s.display_name}`);
        });

        // 4. Empresa con TODOS los módulos (para test)
        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('  EMPRESA RECOMENDADA PARA TEST (con más módulos)');
        console.log('═══════════════════════════════════════════════════════════\n');

        const mejorEmpresa = await client.query(`
            SELECT c.company_id, c.name, c.slug, COUNT(cm.id) as total
            FROM companies c
            LEFT JOIN company_modules cm ON cm.company_id = c.company_id AND cm.activo = true
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name, c.slug
            ORDER BY total DESC
            LIMIT 5
        `);

        mejorEmpresa.rows.forEach((e, i) => {
            console.log(`${i+1}. ${e.name} (${e.slug}) - ${e.total} módulos activos`);
        });

        // 5. Usuarios disponibles para login
        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('  USUARIOS PARA LOGIN (por empresa)');
        console.log('═══════════════════════════════════════════════════════════\n');

        const usuarios = await client.query(`
            SELECT c.name as empresa, c.slug, u.username, u.role
            FROM users u
            JOIN companies c ON u.company_id = c.company_id
            WHERE c.is_active = true AND u.is_active = true
            ORDER BY c.company_id, u.role DESC
            LIMIT 20
        `);

        let currentEmpresa = '';
        usuarios.rows.forEach(u => {
            if (u.empresa !== currentEmpresa) {
                currentEmpresa = u.empresa;
                console.log(`\n🏢 ${u.empresa} (${u.slug}):`);
            }
            console.log(`   👤 ${u.username} [${u.role}]`);
        });

    } finally {
        await client.end();
    }
}

explore().catch(console.error);
