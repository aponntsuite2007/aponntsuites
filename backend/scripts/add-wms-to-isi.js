/**
 * Script para agregar módulo warehouse-management a la empresa ISI
 */

const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function addModuleToISI() {
    console.log('🏭 Agregando módulo warehouse-management a empresa ISI...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        // Obtener módulos actuales de ISI
        const current = await client.query('SELECT active_modules FROM companies WHERE company_id = 11');
        let modules = JSON.parse(current.rows[0].active_modules || '[]');

        console.log(`📦 Módulos actuales: ${modules.length}`);

        // Verificar si ya tiene el módulo
        if (modules.includes('warehouse-management')) {
            console.log('⚠️ El módulo warehouse-management ya estaba asignado a ISI');
        } else {
            // Agregar el módulo
            modules.push('warehouse-management');

            // Actualizar en BD
            await client.query(
                'UPDATE companies SET active_modules = $1 WHERE company_id = 11',
                [JSON.stringify(modules)]
            );

            console.log('✅ Módulo warehouse-management agregado exitosamente');
            console.log(`📦 Total módulos ahora: ${modules.length}`);
        }

        // Verificar
        const verify = await client.query('SELECT active_modules FROM companies WHERE company_id = 11');
        const verifyModules = JSON.parse(verify.rows[0].active_modules);
        const isPresent = verifyModules.includes('warehouse-management');
        console.log(`\n🔍 Verificación: warehouse-management presente = ${isPresent}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addModuleToISI();
