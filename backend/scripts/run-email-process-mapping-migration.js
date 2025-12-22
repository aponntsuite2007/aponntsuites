/**
 * ============================================================================
 * SCRIPT: Ejecutar migración de email_process_mapping
 * ============================================================================
 *
 * Ejecuta la migración que crea la tabla email_process_mapping y todos los
 * procesos del sistema con sus asignaciones iniciales de email.
 *
 * IMPORTANTE: Ejecutar este script UNA SOLA VEZ
 *
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 [MIGRATION] Iniciando migración email_process_mapping...\n');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'migrations', '20251222_create_email_process_mapping.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 [MIGRATION] Archivo de migración cargado');
        console.log('📊 [MIGRATION] Tamaño: ' + (sql.length / 1024).toFixed(2) + ' KB\n');

        // Ejecutar migración
        console.log('⚙️  [MIGRATION] Ejecutando SQL...\n');

        await sequelize.query(sql);

        console.log('\n✅ [MIGRATION] Migración ejecutada exitosamente!\n');

        // Verificar resultados
        console.log('📊 [MIGRATION] Verificando resultados...\n');

        const [processes] = await sequelize.query(`
            SELECT
                COUNT(*) as total_processes,
                COUNT(DISTINCT module) as total_modules,
                COUNT(*) FILTER (WHERE email_type IS NOT NULL) as processes_with_email,
                COUNT(*) FILTER (WHERE email_type IS NULL) as processes_without_email
            FROM email_process_mapping
        `);

        const stats = processes[0];

        console.log('📋 RESUMEN:');
        console.log('   • Total de procesos creados:', stats.total_processes);
        console.log('   • Total de módulos:', stats.total_modules);
        console.log('   • Procesos con email asignado:', stats.processes_with_email);
        console.log('   • Procesos sin email:', stats.processes_without_email);
        console.log('');

        // Listar procesos por módulo
        const [byModule] = await sequelize.query(`
            SELECT
                module,
                COUNT(*) as total
            FROM email_process_mapping
            GROUP BY module
            ORDER BY module
        `);

        console.log('📦 PROCESOS POR MÓDULO:');
        byModule.forEach(m => {
            console.log(`   • ${m.module}: ${m.total} procesos`);
        });
        console.log('');

        // Listar procesos críticos sin email
        const [critical] = await sequelize.query(`
            SELECT process_name, module
            FROM email_process_mapping
            WHERE requires_email = TRUE
            AND email_type IS NULL
            AND priority = 'critical'
        `);

        if (critical.length > 0) {
            console.log('⚠️  PROCESOS CRÍTICOS SIN EMAIL:');
            critical.forEach(p => {
                console.log(`   • [${p.module}] ${p.process_name}`);
            });
            console.log('');
            console.log('   ⚡ ACCIÓN REQUERIDA: Asignar emails a estos procesos críticos en el panel administrativo');
            console.log('');
        }

        console.log('✅ [MIGRATION] Migración completada correctamente!\n');
        console.log('📌 PRÓXIMOS PASOS:');
        console.log('   1. Abrir panel administrativo: http://localhost:9998/panel-administrativo.html');
        console.log('   2. Ir al módulo "Configuración de Emails"');
        console.log('   3. Tab "Asignación de Procesos"');
        console.log('   4. Asignar emails a los procesos pendientes');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ [MIGRATION] Error ejecutando migración:', error);
        console.error('\nDetalles:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️  La tabla ya existe. Si necesitas recrearla, ejecuta primero:');
            console.log('   DROP TABLE IF EXISTS email_process_mapping CASCADE;');
            console.log('');
        }

        process.exit(1);
    }
}

// Ejecutar migración
runMigration();
