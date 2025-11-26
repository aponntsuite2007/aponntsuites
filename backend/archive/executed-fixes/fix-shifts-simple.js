/**
 * FIX SIMPLE: Agregar company_id a shifts (multi-tenant)
 */

require('dotenv').config();
const database = require('./src/config/database');

async function fixShiftsSimple() {
    console.log('\n🔧 Agregando company_id a tabla shifts...\n');

    try {
        // 1. Verificar si ya tiene company_id
        const [columns] = await database.sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'shifts' AND column_name = 'company_id'
        `);

        if (columns.length > 0) {
            console.log('✅ La tabla shifts ya tiene company_id (multi-tenant)');
            console.log('   No se requieren cambios\n');
            process.exit(0);
        }

        console.log('⚠️  Tabla shifts NO tiene company_id');
        console.log('   Agregando columna...\n');

        // 2. Agregar company_id (INTEGER)
        await database.sequelize.query(`
            ALTER TABLE shifts
            ADD COLUMN company_id INTEGER NULL
            REFERENCES companies(company_id) ON DELETE CASCADE
        `);

        console.log('✅ Campo company_id agregado\n');

        // 3. Asignar company_id a turnos existentes (ISI = 11)
        const [existingShifts] = await database.sequelize.query(`
            SELECT COUNT(*) as count FROM shifts WHERE company_id IS NULL
        `);

        const nullCount = parseInt(existingShifts[0].count);

        if (nullCount > 0) {
            await database.sequelize.query(`
                UPDATE shifts
                SET company_id = 11
                WHERE company_id IS NULL
            `);

            console.log(`✅ ${nullCount} turnos asignados a ISI (company_id = 11)\n`);
        }

        // 4. Habilitar UUID si es necesario
        const [idType] = await database.sequelize.query(`
            SELECT data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'shifts' AND column_name = 'id'
        `);

        if (idType[0].data_type === 'uuid' && (!idType[0].column_default || !idType[0].column_default.includes('uuid_generate'))) {
            console.log('🔧 Configurando UUID default...\n');

            await database.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

            await database.sequelize.query(`
                ALTER TABLE shifts
                ALTER COLUMN id SET DEFAULT uuid_generate_v4()
            `);

            console.log('✅ UUID default configurado\n');
        }

        console.log('='.repeat(60));
        console.log('✅ MIGRACIÓN COMPLETADA');
        console.log('   Tabla shifts ahora es multi-tenant');
        console.log('='.repeat(60));
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixShiftsSimple();
