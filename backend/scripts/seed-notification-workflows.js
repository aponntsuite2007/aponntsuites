/**
 * Script para poblar SOLO los 78 procesos de notificación
 * (Las tablas ya fueron creadas con create-notification-tables.js)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function seedWorkflows() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Aedr15150302',
        database: 'attendance_system'
    });

    try {
        await client.connect();
        console.log('🔌 Conectado a PostgreSQL\n');

        // Verificar si ya hay datos
        const checkResult = await client.query('SELECT COUNT(*) as total FROM notification_workflows');
        const currentCount = parseInt(checkResult.rows[0].total);

        if (currentCount > 0) {
            console.log(`⚠️  Ya existen ${currentCount} workflows en la base de datos.`);
            console.log('¿Deseas continuar y agregar más? (Ctrl+C para cancelar)\n');
            // Continuar de todas formas
        }

        console.log('📋 Cargando archivo de seed...');
        const seedPath = path.join(__dirname, '..', 'migrations', '20251222_seed_notification_workflows.sql');

        if (!fs.existsSync(seedPath)) {
            throw new Error(`Archivo no encontrado: ${seedPath}`);
        }

        const seedSql = fs.readFileSync(seedPath, 'utf8');
        console.log(`✅ Archivo cargado: ${(seedSql.length / 1024).toFixed(2)} KB\n`);

        console.log('📋 Insertando 78 procesos de notificación...');
        await client.query(seedSql);
        console.log('✅ Procesos insertados exitosamente\n');

        // Verificar resultados
        const result = await client.query(`
            SELECT
                scope,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE requires_response = true) as with_response
            FROM notification_workflows
            GROUP BY scope
            ORDER BY scope
        `);

        console.log('═══════════════════════════════════════');
        console.log('✅ SEED COMPLETADO');
        console.log('═══════════════════════════════════════\n');

        let totalWorkflows = 0;
        result.rows.forEach(r => {
            console.log(`📦 ${r.scope.toUpperCase()}: ${r.total} workflows`);
            console.log(`   • Con respuesta: ${r.with_response}`);
            totalWorkflows += parseInt(r.total);
        });

        console.log(`\n🎯 TOTAL: ${totalWorkflows} workflows\n`);

        // Listar por módulo
        const byModule = await client.query(`
            SELECT
                scope,
                module,
                COUNT(*) as total
            FROM notification_workflows
            GROUP BY scope, module
            ORDER BY scope, module
        `);

        console.log('📋 POR MÓDULO:\n');

        const aponntModules = byModule.rows.filter(m => m.scope === 'aponnt');
        const companyModules = byModule.rows.filter(m => m.scope === 'company');

        console.log('🌐 APONNT (Global):');
        aponntModules.forEach(m => {
            console.log(`   • ${m.module}: ${m.total} workflows`);
        });

        console.log('\n🏢 EMPRESA (Multi-tenant):');
        companyModules.forEach(m => {
            console.log(`   • ${m.module}: ${m.total} workflows`);
        });

        console.log('\n🎯 Sistema listo para usar!\n');

        await client.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await client.end();
        process.exit(1);
    }
}

seedWorkflows();
