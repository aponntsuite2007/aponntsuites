/**
 * Script para ejecutar migraciones de Multi-Branch
 * Ejecutar: node scripts/run-multibranch-migration.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function runMigrations() {
    console.log('\n' + '='.repeat(70));
    console.log('EJECUTANDO MIGRACIONES MULTI-BRANCH');
    console.log('='.repeat(70) + '\n');

    try {
        await sequelize.authenticate();
        console.log('Conexion a PostgreSQL establecida\n');

        // FASE MB-1: multi_branch_enabled en companies
        console.log('FASE MB-1: Agregar multi_branch_enabled a companies');
        console.log('-'.repeat(60));

        // Verificar si ya existe
        const [checkCol] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name = 'multi_branch_enabled'
        `);

        if (checkCol.length > 0) {
            console.log('   La columna multi_branch_enabled ya existe');
        } else {
            await sequelize.query(`
                ALTER TABLE companies
                ADD COLUMN multi_branch_enabled BOOLEAN DEFAULT false NOT NULL
            `);
            console.log('   Columna multi_branch_enabled creada');
        }

        // Agregar comentario
        await sequelize.query(`
            COMMENT ON COLUMN companies.multi_branch_enabled IS
            'Feature flag para habilitar funcionalidad multi-sucursal. FALSE = sin sucursales visibles en UI'
        `);
        console.log('   Comentario agregado');

        // Verificar estado actual
        const [companies] = await sequelize.query(`
            SELECT company_id, name, multi_branch_enabled
            FROM companies
            ORDER BY company_id
            LIMIT 5
        `);

        console.log('\n   Estado actual de empresas:');
        companies.forEach(c => {
            console.log('      - ' + c.name + ': multi_branch_enabled = ' + c.multi_branch_enabled);
        });

        // FASE MB-2: branch_scope en users
        console.log('\nFASE MB-2: Agregar branch_scope a users');
        console.log('-'.repeat(60));

        // Verificar si ya existe
        const [checkBranchScope] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'branch_scope'
        `);

        if (checkBranchScope.length > 0) {
            console.log('   La columna branch_scope ya existe');
        } else {
            await sequelize.query(`
                ALTER TABLE users
                ADD COLUMN branch_scope JSONB DEFAULT NULL
            `);
            console.log('   Columna branch_scope creada');

            // Crear índice GIN
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_users_branch_scope
                ON users USING GIN (branch_scope)
            `);
            console.log('   Indice GIN creado para branch_scope');
        }

        // Agregar comentario
        await sequelize.query(`
            COMMENT ON COLUMN users.branch_scope IS
            'Array de branch_ids a los que el usuario tiene acceso. NULL = todas las sucursales (gerente general). Ejemplo: [1, 2, 5]'
        `);
        console.log('   Comentario agregado');

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(70));
        console.log('MIGRACIONES COMPLETADAS');
        console.log('='.repeat(70));
        console.log('\n   FASE MB-1: multi_branch_enabled en companies');
        console.log('   - Columna creada (BOOLEAN, default: false)');
        console.log('   - Comentario agregado');
        console.log('   - Todas las empresas tienen FALSE (comportamiento actual preservado)');
        console.log('\n   FASE MB-2: branch_scope en users');
        console.log('   - Columna creada (JSONB, default: NULL)');
        console.log('   - Indice GIN creado para busquedas eficientes');
        console.log('   - Comentario agregado');
        console.log('   - Todos los usuarios tienen NULL (acceso a todas las sucursales)');
        console.log('\n   SIGUIENTE PASO:');
        console.log('   Actualizar engineering-metadata.js marcando MB-1 y MB-2 como done: true');
        console.log('');

    } catch (error) {
        console.error('\nERROR:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

runMigrations();
