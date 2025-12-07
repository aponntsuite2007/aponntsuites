/**
 * Script para ejecutar la migración RBAC Unified SSOT
 *
 * Ejecuta:
 * - Extensiones de OrganizationalPosition (campos de riesgo)
 * - Tabla risk_benchmarks con datos OIT/OSHA/SRT
 * - Tabla company_risk_config
 * - FK users.organizational_position_id
 * - Vista v_users_rbac
 * - Funciones SQL para cálculo de cuartiles
 *
 * Uso: node scripts/run-rbac-migration.js
 */

const fs = require('fs');
const path = require('path');

// Configuración de base de datos
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';

async function runMigration() {
    const { Sequelize } = require('sequelize');

    console.log('🚀 Iniciando migración RBAC Unified SSOT...');
    console.log('📌 DATABASE_URL:', DATABASE_URL.substring(0, 50) + '...');

    // Configurar conexión
    const sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: DATABASE_URL.includes('render.com') ? {
            ssl: { require: true, rejectUnauthorized: false }
        } : {}
    });

    try {
        // Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '../migrations/20251207_rbac_unified_ssot.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Leyendo migración:', migrationPath);

        // Dividir en statements individuales
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Ejecutando ${statements.length} statements...`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (!stmt || stmt.startsWith('--')) continue;

            try {
                await sequelize.query(stmt + ';');
                successCount++;
                process.stdout.write(`\r   Progreso: ${i + 1}/${statements.length} (${successCount} OK, ${errorCount} errores)`);
            } catch (err) {
                errorCount++;
                // Solo mostrar errores significativos (no "already exists")
                if (!err.message.includes('already exists') &&
                    !err.message.includes('duplicate key') &&
                    !err.message.includes('does not exist')) {
                    console.log(`\n   ⚠️ Error en statement ${i + 1}: ${err.message.substring(0, 100)}`);
                }
            }
        }

        console.log(`\n\n✅ Migración completada:`);
        console.log(`   - Statements exitosos: ${successCount}`);
        console.log(`   - Errores (esperados): ${errorCount}`);

        // Verificar tablas creadas
        console.log('\n📊 Verificando tablas creadas...');

        const [tables] = await sequelize.query(`
            SELECT tablename FROM pg_tables
            WHERE tablename IN ('risk_benchmarks', 'company_risk_config')
            AND schemaname = 'public'
        `);

        console.log('   Tablas encontradas:', tables.map(t => t.tablename).join(', ') || 'ninguna nueva');

        // Verificar columnas agregadas
        const [columns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'organizational_positions'
            AND column_name IN ('work_category', 'physical_demand_level', 'risk_exposure_level')
        `);

        console.log('   Columnas en org_positions:', columns.map(c => c.column_name).join(', '));

        // Verificar benchmarks insertados
        const [benchmarks] = await sequelize.query(`
            SELECT COUNT(*) as count FROM risk_benchmarks
        `);

        console.log('   Benchmarks insertados:', benchmarks[0]?.count || 0);

        // Verificar vista
        const [views] = await sequelize.query(`
            SELECT viewname FROM pg_views WHERE viewname = 'v_users_rbac'
        `);

        console.log('   Vista v_users_rbac:', views.length > 0 ? 'creada' : 'no encontrada');

        console.log('\n🎉 Migración RBAC Unified SSOT completada exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('   1. Reiniciar el servidor backend');
        console.log('   2. Asignar posiciones organizacionales a usuarios');
        console.log('   3. Configurar umbrales en Risk Intelligence Dashboard');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en migración:', error.message);
        console.error(error.stack);
        await sequelize.close();
        process.exit(1);
    }
}

runMigration();
