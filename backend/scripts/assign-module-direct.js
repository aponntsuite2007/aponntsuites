const { Pool } = require('pg');
require('dotenv').config();

async function assignDirect() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        const moduleId = '8d51ccfe-2ae5-4a13-8d8a-80fc939f31fc';
        const companyId = 11;

        console.log('🔧 Asignando módulo employee-360 a ISI (ID: 11)...\n');

        // Verificar si ya existe
        const exists = await pool.query(
            'SELECT id FROM company_modules WHERE company_id = $1 AND system_module_id = $2',
            [companyId, moduleId]
        );

        if (exists.rows.length > 0) {
            console.log('ℹ️  Ya existe, actualizando a activo...');
            await pool.query(
                'UPDATE company_modules SET activo = true WHERE company_id = $1 AND system_module_id = $2',
                [companyId, moduleId]
            );
            console.log('✅ Actualizado');
        } else {
            // Deshabilitar trigger temporalmente
            console.log('⏸️  Deshabilitando trigger...');
            await pool.query('ALTER TABLE company_modules DISABLE TRIGGER trigger_auto_activate_bundled');

            console.log('📦 Insertando asignación...');
            await pool.query(
                'INSERT INTO company_modules (id, company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, 150, true, NOW(), NOW(), NOW())',
                [companyId, moduleId]
            );

            // Rehabilitar trigger
            console.log('▶️  Rehabilitando trigger...');
            await pool.query('ALTER TABLE company_modules ENABLE TRIGGER trigger_auto_activate_bundled');
            console.log('✅ Insertado');
        }

        // Verificar
        const verify = await pool.query(
            "SELECT sm.name, sm.module_key, cm.activo, cm.precio_mensual FROM company_modules cm JOIN system_modules sm ON cm.system_module_id = sm.id WHERE cm.company_id = $1 AND sm.module_key = 'employee-360'",
            [companyId]
        );

        console.log('\n🎉 Módulo asignado a ISI:');
        console.log('   Nombre:', verify.rows[0].name);
        console.log('   Key:', verify.rows[0].module_key);
        console.log('   Activo:', verify.rows[0].activo ? 'Sí' : 'No');
        console.log('   Precio: $' + verify.rows[0].precio_mensual);

        console.log('\n✅ ¡Listo! Puedes probar en http://localhost:9998/panel-empresa.html');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

assignDirect();
