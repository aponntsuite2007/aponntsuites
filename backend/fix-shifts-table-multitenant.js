/**
 * ═══════════════════════════════════════════════════════════
 * FIX: Migrar tabla SHIFTS a multi-tenant
 * ═══════════════════════════════════════════════════════════
 *
 * Este script:
 * 1. Verifica estructura actual de shifts
 * 2. Agrega campo company_id (multi-tenant)
 * 3. Asegura que id sea SERIAL (autoincremento)
 */

require('dotenv').config();
const database = require('./src/config/database');

async function fixShiftsTable() {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('🔧 FIX: Migrar tabla SHIFTS a multi-tenant');
    console.log('='.repeat(80));
    console.log('\n');

    try {
        // PASO 1: Ver estructura actual
        console.log('📋 PASO 1: Verificando estructura actual...\n');

        const [columns] = await database.sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'shifts'
            ORDER BY ordinal_position
        `);

        console.log('   Columnas actuales:');
        columns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`);
        });

        // Verificar si ya tiene company_id
        const hasCompanyId = columns.some(col => col.column_name === 'company_id');

        if (hasCompanyId) {
            console.log('\n   ✅ La tabla ya tiene company_id (multi-tenant)\n');
        } else {
            console.log('\n   ⚠️  La tabla NO tiene company_id (NO es multi-tenant)\n');

            // PASO 2: Agregar company_id
            console.log('📋 PASO 2: Agregando campo company_id...\n');

            // Verificar tipo de id en companies
            const [companyIdType] = await database.sequelize.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'companies' AND column_name = 'id'
            `);

            if (!companyIdType || companyIdType.length === 0) {
                throw new Error('No se pudo determinar el tipo de id de la tabla companies');
            }

            const isUUID = companyIdType[0].data_type === 'uuid';

            if (isUUID) {
                await database.sequelize.query(`
                    ALTER TABLE shifts
                    ADD COLUMN company_id UUID NULL
                    REFERENCES companies(id) ON DELETE CASCADE
                `);
            } else {
                await database.sequelize.query(`
                    ALTER TABLE shifts
                    ADD COLUMN company_id INTEGER NULL
                    REFERENCES companies(id) ON DELETE CASCADE
                `);
            }

            console.log('   ✅ Campo company_id agregado\n');

            // PASO 3: Migrar datos existentes (asignar a ISI por defecto)
            console.log('📋 PASO 3: Asignando company_id a turnos existentes...\n');

            const [existingShifts] = await database.sequelize.query(`
                SELECT COUNT(*) as count FROM shifts WHERE company_id IS NULL
            `);

            const nullCount = parseInt(existingShifts[0].count);

            if (nullCount > 0) {
                // Obtener ID de ISI (slug = 'isi')
                const [isiCompany] = await database.sequelize.query(`
                    SELECT id FROM companies WHERE slug = 'isi' OR LOWER(name) LIKE '%isi%' LIMIT 1
                `);

                if (isiCompany && isiCompany.length > 0) {
                    const isiId = isiCompany[0].id;

                    await database.sequelize.query(`
                        UPDATE shifts
                        SET company_id = $1
                        WHERE company_id IS NULL
                    `, { bind: [isiId] });

                    console.log(`   ✅ ${nullCount} turnos asignados a ISI (company_id = ${isiId})\n`);
                } else {
                    console.log('   ⚠️  No se encontró empresa ISI, turnos quedan sin asignar\n');
                }
            } else {
                console.log('   ℹ️  No hay turnos sin company_id\n');
            }
        }

        // PASO 4: Verificar tipo de ID
        console.log('📋 PASO 4: Verificando tipo de ID...\n');

        const [idType] = await database.sequelize.query(`
            SELECT data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'shifts' AND column_name = 'id'
        `);

        if (idType[0].data_type === 'uuid') {
            console.log('   ℹ️  ID es UUID (no requiere secuencia)\n');

            // Verificar si tiene default
            if (!idType[0].column_default || !idType[0].column_default.includes('uuid_generate')) {
                console.log('   🔧 Configurando UUID default...\n');

                // Asegurar que la extensión uuid-ossp esté habilitada
                await database.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

                // Establecer default para UUID
                await database.sequelize.query(`
                    ALTER TABLE shifts
                    ALTER COLUMN id SET DEFAULT uuid_generate_v4()
                `);

                console.log('   ✅ UUID default configurado\n');
            } else {
                console.log('   ✅ UUID default ya configurado\n');
            }
        } else {
            console.log('   ℹ️  ID es INTEGER/SERIAL (verificando secuencia)...\n');

            const [sequences] = await database.sequelize.query(`
                SELECT pg_get_serial_sequence('shifts', 'id') as seq_name
            `);

            if (sequences[0].seq_name) {
                console.log(`   ✅ Secuencia de ID activa: ${sequences[0].seq_name}\n`);
            } else {
                console.log('   ⚠️  No hay secuencia, creando...\n');

                await database.sequelize.query(`
                    CREATE SEQUENCE IF NOT EXISTS shifts_id_seq
                `);

                await database.sequelize.query(`
                    ALTER TABLE shifts
                    ALTER COLUMN id SET DEFAULT nextval('shifts_id_seq')
                `);

                console.log('   ✅ Secuencia creada\n');
            }
        }

        // RESUMEN FINAL
        console.log('='.repeat(80));
        console.log('📊 RESUMEN DE CORRECCIONES');
        console.log('='.repeat(80));

        const [finalColumns] = await database.sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'shifts' AND column_name IN ('id', 'company_id')
        `);

        console.log('\n✅ Estructura corregida:\n');
        finalColumns.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`);
        });

        const [shiftsCount] = await database.sequelize.query(`
            SELECT company_id, COUNT(*) as count
            FROM shifts
            GROUP BY company_id
            ORDER BY company_id
        `);

        console.log('\n📊 Turnos por empresa:\n');
        shiftsCount.forEach(row => {
            console.log(`   - Empresa ${row.company_id || 'NULL'}: ${row.count} turnos`);
        });

        console.log('\n✅ MIGRACIÓN COMPLETADA - Tabla shifts ahora es multi-tenant');
        console.log('='.repeat(80));
        console.log('\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR durante la migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar migración
fixShiftsTable();
