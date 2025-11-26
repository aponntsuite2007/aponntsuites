// ============================================
// PANEL-TRANSPORTE - ASIGNAR MÓDULOS
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Asignar módulos de transporte a las empresas

const { Sequelize } = require('sequelize');

// Configuración directa de PostgreSQL
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function assignTransportModules() {
    try {
        console.log('🔄 [MODULES] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [MODULES] Conectado exitosamente');

        // Obtener empresas de transporte
        const companies = await sequelize.query(
            `SELECT company_id, name, slug, active_modules FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`🏢 [MODULES] Empresas encontradas: ${companies.length}`);
        companies.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (ID: ${company.company_id})`);
        });

        // Obtener módulos de transporte
        const modules = await sequelize.query(
            `SELECT id, module_key, name, base_price FROM system_modules WHERE module_key LIKE 'transport-%' ORDER BY display_order`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📦 [MODULES] Módulos de transporte disponibles: ${modules.length}`);
        modules.forEach(module => {
            console.log(`   📦 ${module.module_key} - ${module.name} ($${module.base_price})`);
        });

        // Verificar si existe la tabla company_modules
        try {
            await sequelize.query(`SELECT 1 FROM company_modules LIMIT 1`);
            console.log('✅ [MODULES] Tabla company_modules existe');

            // Asignar módulos a cada empresa
            let totalAssignments = 0;
            for (const company of companies) {
                console.log(`\n🔄 [MODULES] Procesando ${company.name}...`);

                const activeModules = company.active_modules || {};
                const activeModuleKeys = Object.keys(activeModules).filter(k => activeModules[k]);
                console.log(`   📋 Módulos activos: ${activeModuleKeys.join(', ')}`);

                // Asignar cada módulo activo
                for (const module of modules) {
                    if (activeModules[module.module_key]) {
                        try {
                            await sequelize.query(`
                                INSERT INTO company_modules (
                                    company_id, system_module_id, is_active,
                                    contracted_price, employee_tier, contracted_at,
                                    usage_stats, configuration
                                ) VALUES (
                                    ${company.company_id},
                                    '${module.id}',
                                    true,
                                    ${module.base_price},
                                    25,
                                    NOW(),
                                    '{"monthly_usage": 100}'::jsonb,
                                    '{"test_assignment": true}'::jsonb
                                );
                            `);
                            console.log(`   ✅ ${module.module_key} asignado`);
                            totalAssignments++;
                        } catch (error) {
                            if (error.message.includes('llave duplicada')) {
                                console.log(`   ⚠️ ${module.module_key} ya asignado`);
                            } else {
                                console.warn(`   ❌ Error asignando ${module.module_key}:`, error.message);
                            }
                        }
                    }
                }
            }

            // Verificar asignaciones realizadas
            console.log('\n🔍 [MODULES] Verificando asignaciones...');
            const assignments = await sequelize.query(`
                SELECT
                    c.name as company_name,
                    sm.module_key,
                    sm.name as module_name,
                    cm.contracted_price
                FROM company_modules cm
                JOIN companies c ON cm.company_id = c.id
                JOIN system_modules sm ON cm.system_module_id = sm.id
                WHERE sm.module_key LIKE 'transport-%'
                ORDER BY c.name, sm.display_order
            `, { type: sequelize.QueryTypes.SELECT });

            console.log('📋 [MODULES] Asignaciones realizadas:');
            let currentCompany = '';
            assignments.forEach(assignment => {
                if (assignment.company_name !== currentCompany) {
                    currentCompany = assignment.company_name;
                    console.log(`\n🏢 ${currentCompany}:`);
                }
                console.log(`   📦 ${assignment.module_key} - ${assignment.module_name} ($${assignment.contracted_price})`);
            });

            console.log(`\n✅ [MODULES] Asignaciones totales: ${assignments.length}`);
            console.log(`📊 [MODULES] Nuevas asignaciones: ${totalAssignments}`);

        } catch (error) {
            console.warn('⚠️ [MODULES] Tabla company_modules no existe o error:', error.message);
        }

        console.log('\n🎯 [SUCCESS] ASIGNACIÓN DE MÓDULOS COMPLETADA');

    } catch (error) {
        console.error('❌ [ERROR] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('\n🔐 [MODULES] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    assignTransportModules()
        .then(() => {
            console.log('\n🎉 [SUCCESS] MÓDULOS DE TRANSPORTE ASIGNADOS EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 [ERROR] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { assignTransportModules };