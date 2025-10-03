/**
 * Script para asignar módulos SIAC a empresas
 * Asigna los 4 módulos SIAC a empresa ID 1 para pruebas
 */

const { Sequelize } = require('sequelize');

// Configurar conexión a PostgreSQL
const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function assignSiacModules() {
    try {
        console.log('🏢 Asignando módulos SIAC a empresas...\n');

        // Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida');

        // Obtener los módulos SIAC
        console.log('📦 Obteniendo módulos SIAC del sistema...');

        const siacModules = await sequelize.query(`
            SELECT id, module_key, name, base_price
            FROM system_modules
            WHERE category = 'siac'
            AND is_active = true
            ORDER BY display_order
        `, { type: Sequelize.QueryTypes.SELECT });

        console.log(`✅ Encontrados ${siacModules.length} módulos SIAC:`);
        siacModules.forEach(module => {
            console.log(`   • ${module.name} (${module.module_key}) - $${module.base_price}`);
        });

        // Verificar que la empresa existe
        console.log('\n🏢 Verificando empresas disponibles...');

        const companies = await sequelize.query(`
            SELECT id, name, slug
            FROM companies
            WHERE is_active = true
            ORDER BY id
            LIMIT 5
        `, { type: Sequelize.QueryTypes.SELECT });

        if (companies.length === 0) {
            console.log('⚠️ No se encontraron empresas activas. Creando empresa de prueba...');

            // Crear empresa de prueba
            await sequelize.query(`
                INSERT INTO companies (name, slug, is_active, created_at, updated_at)
                VALUES ('Empresa SIAC Demo', 'empresa-siac-demo', true, NOW(), NOW())
                ON CONFLICT (slug) DO NOTHING
                RETURNING id, name, slug
            `);

            // Obtener empresas nuevamente
            const newCompanies = await sequelize.query(`
                SELECT id, name, slug
                FROM companies
                WHERE is_active = true
                ORDER BY id
                LIMIT 5
            `, { type: Sequelize.QueryTypes.SELECT });

            companies.push(...newCompanies);
        }

        console.log(`✅ Empresas disponibles:`);
        companies.forEach(company => {
            console.log(`   • ID: ${company.company_id} - ${company.name} (${company.slug})`);
        });

        // Asignar módulos SIAC a la primera empresa
        const targetCompany = companies[0];
        console.log(`\n🎯 Asignando módulos SIAC a: ${targetCompany.name} (ID: ${targetCompany.id})`);

        for (const module of siacModules) {
            console.log(`\n📋 Procesando: ${module.name}`);

            // Verificar si ya está asignado
            const existingAssignment = await sequelize.query(`
                SELECT id
                FROM company_modules
                WHERE company_id = ? AND system_module_id = ?
            `, {
                replacements: [targetCompany.id, module.id],
                type: Sequelize.QueryTypes.SELECT
            });

            if (existingAssignment.length > 0) {
                console.log(`   ⚠️ Ya está asignado - saltando`);
                continue;
            }

            // Asignar el módulo
            await sequelize.query(`
                INSERT INTO company_modules (
                    company_id,
                    system_module_id,
                    activo,
                    fecha_asignacion,
                    precio_mensual,
                    created_at,
                    updated_at
                ) VALUES (
                    ?, ?, true, NOW(), ?, NOW(), NOW()
                )
            `, {
                replacements: [
                    targetCompany.id,
                    module.id,
                    parseFloat(module.base_price)
                ]
            });

            console.log(`   ✅ Asignado exitosamente - Precio: $${module.base_price}`);
        }

        // Verificar asignaciones finales
        console.log('\n📊 Verificando asignaciones finales...');

        const finalAssignments = await sequelize.query(`
            SELECT
                cm.id,
                sm.name as module_name,
                sm.module_key,
                cm.activo as is_active,
                cm.fecha_asignacion as assigned_at,
                cm.precio_mensual as price_paid
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = ? AND sm.category = 'siac'
            ORDER BY sm.display_order
        `, {
            replacements: [targetCompany.id],
            type: Sequelize.QueryTypes.SELECT
        });

        console.log(`\n✅ ${finalAssignments.length} módulos SIAC asignados a ${targetCompany.name}:`);
        finalAssignments.forEach(assignment => {
            const status = assignment.is_active ? '🟢 ACTIVO' : '🔴 INACTIVO';
            const date = new Date(assignment.assigned_at).toLocaleDateString();
            console.log(`   ${status} ${assignment.module_name}`);
            console.log(`            Asignado: ${date} | Precio: $${assignment.price_paid}`);
        });

        console.log('\n🎉 ¡Módulos SIAC asignados exitosamente!');
        console.log('\n📋 PRÓXIMOS PASOS:');
        console.log('   1. Los módulos ahora aparecerán en el panel-empresa.html');
        console.log('   2. Implementar el contenido de cada módulo en el frontend');
        console.log('   3. Verificar la integración completa');

        return {
            company: targetCompany,
            modulesAssigned: finalAssignments.length,
            modules: finalAssignments
        };

    } catch (error) {
        console.error('❌ Error asignando módulos SIAC:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    assignSiacModules()
        .then((result) => {
            console.log(`\n✅ Proceso completado - ${result.modulesAssigned} módulos asignados`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = assignSiacModules;