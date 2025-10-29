/**
 * Script para ejecutar migraciones del Sistema de Emails usando Sequelize
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');

const migrations = [
    {
        file: '20251028_email_system_multicapa.sql',
        description: 'Sistema de Emails Multicapa (Base)'
    },
    // SKIP: Partners/Vendors extension requires partners table (not migrated yet)
    // {
    //     file: '20251028_extend_email_for_partners_vendors.sql',
    //     description: 'Extensión Partners/Vendedores/Soporte'
    // },
    {
        file: '20251028_integrate_email_with_notifications.sql',
        description: 'Integración con Notificaciones'
    }
];

async function runMigration(migration) {
    const migrationPath = path.join(__dirname, 'migrations', migration.file);

    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Archivo no encontrado: ${migrationPath}`);
    }

    console.log(`\n📄 Ejecutando: ${migration.description}`);
    console.log(`   Archivo: ${migration.file}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    try {
        await sequelize.query(sql);
        console.log(`✅ Completado: ${migration.file}`);
    } catch (error) {
        console.error(`❌ Error en ${migration.file}:`);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 Iniciando migración del Sistema de Emails...\n');
        console.log('🔗 Conectando a PostgreSQL...');

        // Probar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión exitosa\n');

        // Ejecutar migraciones
        for (const migration of migrations) {
            await runMigration(migration);
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ TODAS LAS MIGRACIONES COMPLETADAS EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('📋 SISTEMA DE EMAILS INSTALADO:');
        console.log('   ✅ 5 Capas de comunicación');
        console.log('   ✅ 11 Tablas (email_configurations, user_emails, etc.)');
        console.log('   ✅ Triggers automáticos');
        console.log('   ✅ Integración con notificaciones');
        console.log('   ✅ 21 mapeos de notificación→email');
        console.log('   ✅ Validación SMTP obligatoria\n');

        console.log('📊 VERIFICACIÓN:');

        // Verificar tablas
        const [tables] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%email%'
            ORDER BY table_name
        `);

        console.log('\n   Tablas creadas:');
        tables.forEach(t => console.log(`   - ${t.table_name}`));

        // Contar mapeos
        const [mappings] = await sequelize.query(`
            SELECT COUNT(*) as count FROM notification_email_mapping
        `);
        console.log(`\n   Mapeos de notificación: ${mappings[0].count}`);

        // Configuraciones de Aponnt
        const [aponntConfigs] = await sequelize.query(`
            SELECT config_type, from_email FROM aponnt_email_config
        `);
        console.log(`\n   Configs de Aponnt:`);
        aponntConfigs.forEach(c => console.log(`   - ${c.config_type}: ${c.from_email}`));

        console.log('\n🚀 PRÓXIMOS PASOS:');
        console.log('   1. Actualizar passwords en aponnt_email_config');
        console.log('   2. Modificar panel-administrativo para requerir SMTP');
        console.log('   3. Iniciar EmailWorker para procesar cola');
        console.log('   4. Probar creando una empresa con email institucional\n');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════════════════');
        console.error('❌ ERROR EN LAS MIGRACIONES');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(error.message);

        if (error.original) {
            console.error('\nDetalle del error SQL:');
            console.error(error.original.message);
        }

        console.error('\n💡 SOLUCIÓN:');
        console.error('   1. Verifica que PostgreSQL esté corriendo');
        console.error('   2. Verifica DATABASE_URL en .env');
        console.error('   3. Verifica que la BD "attendance_system" exista');
        console.error('   4. Revisa el SQL en migrations/[archivo].sql\n');

        await sequelize.close();
        process.exit(1);
    }
}

main();
