/**
 * ============================================================================
 * SCRIPT: Ejecutar migración de Notification Workflows System
 * ============================================================================
 *
 * Ejecuta las migraciones para crear el sistema completo de workflows de
 * notificaciones multi-canal.
 *
 * MIGRACIONES:
 * 1. 20251222_create_notification_workflows_system.sql - Tablas + funciones
 * 2. 20251222_seed_notification_workflows.sql - 78 procesos iniciales
 *
 * IMPORTANTE: Ejecutar este script UNA SOLA VEZ
 *
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    try {
        console.log('🚀 [MIGRATION] Iniciando migración Notification Workflows System...\\n');

        //  ===================================================================
        // PASO 1: Crear tablas y funciones
        // ===================================================================
        console.log('📋 [STEP 1/2] Creando tablas y funciones...\\n');

        const systemMigrationPath = path.join(__dirname, '..', 'migrations', '20251222_create_notification_workflows_system.sql');

        if (!fs.existsSync(systemMigrationPath)) {
            throw new Error(`Archivo de migración no encontrado: ${systemMigrationPath}`);
        }

        const systemSql = fs.readFileSync(systemMigrationPath, 'utf8');
        console.log('📄 [STEP 1/2] Archivo cargado: ' + (systemSql.length / 1024).toFixed(2) + ' KB');

        await sequelize.query(systemSql);
        console.log('✅ [STEP 1/2] Tablas y funciones creadas exitosamente\\n');

        // ===================================================================
        // PASO 2: Poblar con 78 procesos iniciales
        // ===================================================================
        console.log('📋 [STEP 2/2] Poblando 78 procesos iniciales...\\n');

        const seedMigrationPath = path.join(__dirname, '..', 'migrations', '20251222_seed_notification_workflows.sql');

        if (!fs.existsSync(seedMigrationPath)) {
            throw new Error(`Archivo de seed no encontrado: ${seedMigrationPath}`);
        }

        const seedSql = fs.readFileSync(seedMigrationPath, 'utf8');
        console.log('📄 [STEP 2/2] Archivo cargado: ' + (seedSql.length / 1024).toFixed(2) + ' KB\\n');

        await sequelize.query(seedSql);
        console.log('✅ [STEP 2/2] Procesos poblados exitosamente\\n');

        // ===================================================================
        // VERIFICACIÓN FINAL
        // ===================================================================
        console.log('📊 [VERIFICATION] Verificando resultados...\\n');

        // Contar workflows por scope
        const [workflows] = await sequelize.query(`
            SELECT
                scope,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE requires_response = true) as with_response,
                COUNT(*) FILTER (WHERE is_active = true) as active
            FROM notification_workflows
            GROUP BY scope
        `);

        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════\\n');

        let totalWorkflows = 0;
        workflows.forEach(w => {
            console.log(`📦 Scope: ${w.scope.toUpperCase()}`);
            console.log(`   • Total workflows: ${w.total}`);
            console.log(`   • Con respuesta: ${w.with_response}`);
            console.log(`   • Activos: ${w.active}`);
            console.log('');
            totalWorkflows += parseInt(w.total);
        });

        console.log(`🎯 TOTAL GENERAL: ${totalWorkflows} workflows\\n`);

        // Listar por módulo
        const [byModule] = await sequelize.query(`
            SELECT
                scope,
                module,
                COUNT(*) as total
            FROM notification_workflows
            GROUP BY scope, module
            ORDER BY scope, module
        `);

        console.log('📋 WORKFLOWS POR MÓDULO:\\n');

        const aponntModules = byModule.filter(m => m.scope === 'aponnt');
        const companyModules = byModule.filter(m => m.scope === 'company');

        console.log('🌐 APONNT (Global):');
        aponntModules.forEach(m => {
            console.log(`   • ${m.module}: ${m.total} workflows`);
        });

        console.log('\\n🏢 EMPRESA (Multi-tenant):');
        companyModules.forEach(m => {
            console.log(`   • ${m.module}: ${m.total} workflows`);
        });

        console.log('\\n═══════════════════════════════════════════════════════════');
        console.log('📌 PRÓXIMOS PASOS:\\n');
        console.log('1. Verificar servidor: npm start');
        console.log('2. Probar API: GET http://localhost:9998/api/notifications/workflows');
        console.log('3. Ver stats: GET http://localhost:9998/api/notifications/workflows/stats');
        console.log('4. Disparar workflow de prueba:');
        console.log('   POST http://localhost:9998/api/notifications/trigger');
        console.log('   Body: { "processKey": "support_ticket_created", "recipientEmail": "test@test.com" }');
        console.log('\\n═══════════════════════════════════════════════════════════\\n');

        process.exit(0);

    } catch (error) {
        console.error('\\n❌ [MIGRATION] Error ejecutando migración:', error);
        console.error('\\nDetalles:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\\n⚠️  Las tablas ya existen. Si necesitas recrearlas, ejecuta primero:');
            console.log('   DROP TABLE IF EXISTS notification_log CASCADE;');
            console.log('   DROP TABLE IF EXISTS notification_templates CASCADE;');
            console.log('   DROP TABLE IF EXISTS notification_workflows CASCADE;');
            console.log('');
        }

        process.exit(1);
    }
}

// Ejecutar migración
runMigrations();
