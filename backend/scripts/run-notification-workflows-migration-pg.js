/**
 * Migración usando pg client directamente (más confiable que sequelize.query para archivos grandes)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
    // Usar misma config que database.js
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Aedr15150302',  // Password correcto del proyecto
        database: 'attendance_system'  // DB correcta
    });

    try {
        await client.connect();
        console.log('🔌 Conectado a PostgreSQL\n');

        // Paso 1: Crear tablas
        console.log('📋 [STEP 1/2] Creando tablas...');
        const systemPath = path.join(__dirname, '..', 'migrations', '20251222_create_notification_workflows_system.sql');
        const systemSql = fs.readFileSync(systemPath, 'utf8');

        await client.query(systemSql);
        console.log('✅ [STEP 1/2] Tablas creadas\n');

        // Paso 2: Poblar datos
        console.log('📋 [STEP 2/2] Poblando 78 procesos...');
        const seedPath = path.join(__dirname, '..', 'migrations', '20251222_seed_notification_workflows.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        await client.query(seedSql);
        console.log('✅ [STEP 2/2] Procesos poblados\n');

        // Verificar
        const result = await client.query(`
            SELECT scope, COUNT(*) as total
            FROM notification_workflows
            GROUP BY scope
        `);

        console.log('═══════════════════════════════════════');
        console.log('✅ MIGRACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════\n');

        result.rows.forEach(r => {
            console.log(`${r.scope.toUpperCase()}: ${r.total} workflows`);
        });

        console.log('\n🎯 Sistema listo para usar!\n');

        await client.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

runMigration();
