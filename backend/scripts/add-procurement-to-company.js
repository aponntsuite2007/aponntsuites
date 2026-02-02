/**
 * Agregar módulo procurement-management a empresa APONNT Suite
 */
const { sequelize } = require('../src/config/database');

async function addProcurementToCompany() {
    try {
        console.log('🔍 Verificando estado actual...\n');

        // 1. Obtener el módulo procurement
        const [modules] = await sequelize.query(`
            SELECT id, module_key, name
            FROM system_modules
            WHERE module_key = 'procurement-management'
        `);

        if (modules.length === 0) {
            console.log('❌ Módulo procurement-management no existe');
            return;
        }

        const procurementModule = modules[0];
        console.log('✅ Módulo encontrado:', procurementModule.id, '-', procurementModule.name);

        // 2. Verificar empresa company_id=1
        const [companies] = await sequelize.query(`
            SELECT company_id, name, slug, modules_data
            FROM companies
            WHERE company_id = 1
        `);

        if (companies.length === 0) {
            console.log('❌ Empresa id=1 no existe');
            return;
        }

        const company = companies[0];
        console.log('✅ Empresa:', company.name);
        console.log('   modules_data actual:', typeof company.modules_data);

        // 3. Verificar si ya existe en company_modules
        const [existingRelation] = await sequelize.query(`
            SELECT * FROM company_modules
            WHERE company_id = 1 AND system_module_id = :moduleId
        `, { replacements: { moduleId: procurementModule.id } });

        if (existingRelation.length > 0) {
            console.log('✅ Relación ya existe en company_modules');
        } else {
            console.log('📦 Insertando en company_modules...');
            await sequelize.query(`
                INSERT INTO company_modules (company_id, system_module_id, is_active, activo, created_at, updated_at)
                VALUES (1, :moduleId, true, true, NOW(), NOW())
                ON CONFLICT (company_id, system_module_id) DO UPDATE SET is_active = true, activo = true, updated_at = NOW()
            `, { replacements: { moduleId: procurementModule.id } });
            console.log('✅ Relación creada');
        }

        // 4. Actualizar modules_data en companies si es JSONB
        console.log('📦 Actualizando modules_data en companies...');

        // Primero verificar el tipo de columna
        const [columnInfo] = await sequelize.query(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name = 'modules_data'
        `);

        if (columnInfo.length > 0) {
            const dataType = columnInfo[0].data_type;
            console.log('   Tipo de columna modules_data:', dataType);

            if (dataType === 'jsonb' || dataType === 'json') {
                // Agregar procurement-management al JSONB con is_active=true
                await sequelize.query(`
                    UPDATE companies
                    SET modules_data = COALESCE(modules_data, '{}'::jsonb) || '{"procurement-management": {"is_active": true, "contracted_at": "${new Date().toISOString()}"}}'::jsonb
                    WHERE company_id = 1
                `);
                console.log('✅ modules_data actualizado');
            }
        }

        // 5. Verificar resultado
        const [verify] = await sequelize.query(`
            SELECT cm.*, m.name as module_name
            FROM company_modules cm
            JOIN system_modules m ON m.id = cm.system_module_id
            WHERE cm.company_id = 1 AND m.module_key = 'procurement-management'
        `);

        if (verify.length > 0) {
            console.log('\n✅ VERIFICACIÓN EXITOSA:');
            console.log('   - Módulo:', verify[0].module_name);
            console.log('   - Activo:', verify[0].is_active);
        }

        console.log('\n🎉 Proceso completado. Refresca la página para ver el módulo.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

addProcurementToCompany();
