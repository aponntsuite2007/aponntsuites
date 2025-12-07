/**
 * Script para eliminar el módulo occupational-health-enterprise de todas las empresas
 *
 * Este script:
 * 1. Elimina 'occupational-health-enterprise' de active_modules de todas las empresas
 * 2. Elimina las referencias en modules_data
 * 3. Elimina el módulo de la tabla system_modules si existe
 *
 * Uso: node scripts/remove-occupational-health-enterprise.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurado');
    process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: DATABASE_URL.includes('render.com') ? { require: true, rejectUnauthorized: false } : false
    },
    logging: false
});

async function removeOccupationalHealthEnterprise() {
    console.log('🔧 Eliminando módulo occupational-health-enterprise de todas las empresas...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD establecida\n');

        // 1. Verificar estructura de tabla companies
        const [cols] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'companies' AND column_name IN ('id', 'company_id', 'name', 'active_modules')
        `);
        console.log('📋 Columnas disponibles:', cols.map(c => c.column_name).join(', '));

        const idColumn = cols.find(c => c.column_name === 'id') ? 'id' : 'company_id';

        // 1. Obtener empresas con el módulo asignado
        const [companies] = await sequelize.query(`
            SELECT ${idColumn} as id, name, active_modules, modules_data
            FROM companies
            WHERE active_modules::text LIKE '%occupational-health-enterprise%'
               OR active_modules::text LIKE '%occupational-health%'
        `);

        console.log(`📊 Empresas con módulo occupational-health: ${companies.length}\n`);

        for (const company of companies) {
            console.log(`\n🏢 Procesando: ${company.name} (ID: ${company.id})`);

            let activeModules = company.active_modules || [];
            if (typeof activeModules === 'string') {
                activeModules = JSON.parse(activeModules);
            }

            // Filtrar módulos relacionados con occupational-health
            const originalCount = activeModules.length;
            activeModules = activeModules.filter(mod =>
                mod !== 'occupational-health-enterprise' &&
                mod !== 'occupational-health' &&
                mod !== 'occupational-health-phase2'
            );

            const removedCount = originalCount - activeModules.length;

            if (removedCount > 0) {
                await sequelize.query(`
                    UPDATE companies
                    SET active_modules = :modules,
                        updated_at = NOW()
                    WHERE company_id = :id
                `, {
                    replacements: {
                        modules: JSON.stringify(activeModules),
                        id: company.id
                    }
                });
                console.log(`   ✅ Eliminado ${removedCount} módulo(s) de active_modules`);
            }

            // Limpiar modules_data si existe
            if (company.modules_data) {
                let modulesData = company.modules_data;
                if (typeof modulesData === 'string') {
                    modulesData = JSON.parse(modulesData);
                }

                const keysToRemove = [
                    'occupational-health-enterprise',
                    'occupational-health',
                    'occupational-health-phase2'
                ];

                let cleaned = false;
                for (const key of keysToRemove) {
                    if (modulesData[key]) {
                        delete modulesData[key];
                        cleaned = true;
                    }
                }

                if (cleaned) {
                    await sequelize.query(`
                        UPDATE companies
                        SET modules_data = :data,
                            updated_at = NOW()
                        WHERE company_id = :id
                    `, {
                        replacements: {
                            data: JSON.stringify(modulesData),
                            id: company.id
                        }
                    });
                    console.log(`   ✅ Limpiado modules_data`);
                }
            }
        }

        // 2. Eliminar de system_modules si existe
        const [deleted] = await sequelize.query(`
            DELETE FROM system_modules
            WHERE module_key IN (
                'occupational-health-enterprise',
                'occupational-health',
                'occupational-health-phase2'
            )
            RETURNING module_key
        `);

        if (deleted.length > 0) {
            console.log(`\n✅ Eliminados de system_modules: ${deleted.map(d => d.module_key).join(', ')}`);
        }

        // 3. Limpiar tablas relacionadas si existen
        const tablesToCheck = [
            'oh_absence_cases',
            'oh_pre_employment_screenings',
            'oh_workers_compensation_claims',
            'oh_screening_types',
            'oh_treatment_plans',
            'oh_accommodations',
            'oh_rtw_programs'
        ];

        console.log('\n📋 Verificando tablas de Occupational Health...');
        for (const table of tablesToCheck) {
            try {
                const [[result]] = await sequelize.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = '${table}'
                    ) as exists
                `);
                if (result.exists) {
                    console.log(`   ⚠️  Tabla ${table} existe (conservada para referencia histórica)`);
                }
            } catch (e) {
                // Tabla no existe, está bien
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Módulo occupational-health-enterprise eliminado exitosamente');
        console.log('='.repeat(60));
        console.log('\n📝 Notas:');
        console.log('   - El módulo "medical" (Gestión Médica) sigue activo');
        console.log('   - Las tablas de datos se conservan por seguridad');
        console.log('   - Los archivos JS deben eliminarse manualmente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

removeOccupationalHealthEnterprise()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
