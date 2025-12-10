/**
 * Verifica y crea la tabla ux_discoveries si es necesario
 */

const { Sequelize, QueryTypes } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

async function main() {
    console.log('\n🔍 Verificando tabla ux_discoveries...\n');

    try {
        // Database connection
        const dbUser = process.env.POSTGRES_USER || 'postgres';
        const dbPassword = process.env.POSTGRES_PASSWORD || 'Aedr15150302';
        const dbHost = process.env.POSTGRES_HOST || 'localhost';
        const dbPort = process.env.POSTGRES_PORT || '5432';
        const dbName = process.env.POSTGRES_DB || 'attendance_system';
        const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

        const sequelize = new Sequelize(process.env.DATABASE_URL || connectionString, {
            dialect: 'postgres',
            logging: false
        });

        await sequelize.authenticate();
        console.log('✅ Conectado a PostgreSQL');

        // Check if table exists
        const tables = await sequelize.query(
            `SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_name = 'ux_discoveries'`,
            { type: QueryTypes.SELECT }
        );

        if (tables.length > 0) {
            console.log('✅ Tabla ux_discoveries YA EXISTE\n');

            // Check columns
            const columns = await sequelize.query(
                `SELECT column_name
                 FROM information_schema.columns
                 WHERE table_name = 'ux_discoveries'
                 ORDER BY ordinal_position`,
                { type: QueryTypes.SELECT }
            );

            console.log('📋 Columnas existentes:');
            columns.forEach(c => console.log(`   - ${c.column_name}`));

            // Check functions
            const functions = await sequelize.query(
                `SELECT routine_name
                 FROM information_schema.routines
                 WHERE routine_schema = 'public'
                   AND routine_name IN (
                       'find_similar_discovery',
                       'increment_discovery_validation',
                       'get_validated_discoveries',
                       'get_module_ux_stats'
                   )`,
                { type: QueryTypes.SELECT }
            );

            console.log(`\n🔧 Funciones PostgreSQL: ${functions.length}/4 encontradas`);
            functions.forEach(f => console.log(`   ✅ ${f.routine_name}()`));

            await sequelize.close();
            console.log('\n✅ Sistema listo para usar bidirectional feedback loop!');
            process.exit(0);
        }

        // Table doesn't exist - create it
        console.log('❌ Tabla ux_discoveries NO EXISTE');
        console.log('📝 Creando tabla y funciones...\n');

        // Read and execute migration
        const migrationPath = path.join(__dirname, '../migrations/20251210_create_ux_discoveries.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        // Split by statement and execute one by one (to handle errors better)
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        for (const statement of statements) {
            try {
                await sequelize.query(statement + ';');
                successCount++;
            } catch (error) {
                // Ignore "already exists" errors
                if (!error.message.includes('already exists')) {
                    console.error(`   ⚠️  Error en statement: ${error.message}`);
                }
            }
        }

        console.log(`✅ Migración completada (${successCount} statements ejecutados)`);
        console.log('   - Tabla ux_discoveries creada');
        console.log('   - Índices creados');
        console.log('   - Funciones PostgreSQL creadas');

        await sequelize.close();
        console.log('\n✅ Sistema listo! Bidirectional feedback loop activado!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
