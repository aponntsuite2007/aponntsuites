/**
 * Script para ejecutar migración de Process Chain Analytics
 */

const path = require('path');
const fs = require('fs');
const database = require('../src/config/database');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  MIGRACIÓN - Process Chain Analytics                      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

(async () => {
    try {
        const sequelize = database.sequelize;
        const migrationPath = path.join(__dirname, '../migrations/20251211_create_process_chain_analytics.sql');

        if (!fs.existsSync(migrationPath)) {
            console.error('ERROR: No se encontró el archivo de migración en', migrationPath);
            process.exit(1);
        }

        console.log('Archivo de migración encontrado:', migrationPath);
        console.log('Leyendo SQL...\n');

        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Ejecutando migración...\n');
        await sequelize.query(sql);
        console.log('Migración ejecutada exitosamente!\n');

        // Verificar tabla creada
        const [tables] = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'process_chain_analytics'
        `);

        if (tables.length > 0) {
            console.log('Tabla process_chain_analytics creada correctamente\n');

            // Verificar funciones PostgreSQL
            const [functions] = await sequelize.query(`
                SELECT proname FROM pg_proc
                WHERE proname IN (
                    'get_top_requested_actions',
                    'get_module_usage_stats',
                    'get_time_trends',
                    'identify_bottlenecks'
                )
            `);

            console.log(functions.length + '/4 funciones PostgreSQL creadas:\n');
            functions.forEach(f => {
                console.log('   - ' + f.proname + '()');
            });
        } else {
            console.error('ERROR: La tabla no fue creada');
            process.exit(1);
        }

        console.log('\nMIGRACIÓN COMPLETADA - Sistema de Analytics listo\n');
        process.exit(0);

    } catch (error) {
        console.error('\nERROR ejecutando migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
