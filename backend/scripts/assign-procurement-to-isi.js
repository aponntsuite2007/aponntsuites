/**
 * Script para asignar el módulo procurement-management a la empresa ISI
 */
const { Sequelize, QueryTypes } = require('sequelize');

// Configuración directa de la base de datos local
const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false
});

async function assignProcurementToISI() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // 1. Buscar empresa ISI
        const companies = await sequelize.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE slug ILIKE '%isi%' OR name ILIKE '%isi%'
        `, { type: QueryTypes.SELECT });

        if (!companies || companies.length === 0) {
            // Buscar todas las empresas para ver cuál es ISI
            const allCompanies = await sequelize.query(`
                SELECT company_id, name, slug FROM companies ORDER BY company_id
            `, { type: QueryTypes.SELECT });

            console.log('\n📋 Empresas disponibles:');
            allCompanies.forEach(c => console.log(`  - ID ${c.company_id}: ${c.name} (${c.slug})`));

            console.log('\n❌ No se encontró empresa con "ISI" en el nombre o slug');
            return;
        }

        const isiCompany = companies[0];

        console.log(`\n📍 Empresa encontrada: ${isiCompany.name} (ID: ${isiCompany.company_id}, slug: ${isiCompany.slug})`);

        // 2. Ver módulos actuales
        let currentModules = isiCompany.active_modules || [];
        if (typeof currentModules === 'string') {
            try {
                currentModules = JSON.parse(currentModules);
            } catch (e) {
                currentModules = [];
            }
        }

        console.log(`📦 Módulos actuales (${currentModules.length}): ${currentModules.length > 0 ? currentModules.slice(0, 5).join(', ') + (currentModules.length > 5 ? '...' : '') : '(ninguno)'}`);

        // 3. Verificar si ya tiene el módulo
        if (currentModules.includes('procurement-management')) {
            console.log('\n✅ La empresa ISI ya tiene el módulo procurement-management asignado');
            return;
        }

        // 4. Agregar el módulo
        const newModules = [...currentModules, 'procurement-management'];

        await sequelize.query(`
            UPDATE companies
            SET active_modules = :modules,
                updated_at = NOW()
            WHERE company_id = :companyId
        `, {
            replacements: {
                modules: JSON.stringify(newModules),
                companyId: isiCompany.company_id
            },
            type: QueryTypes.UPDATE
        });

        console.log(`\n✅ Módulo 'procurement-management' asignado exitosamente a ${isiCompany.name}`);
        console.log(`📦 Total módulos activos ahora: ${newModules.length}`);

        // 5. Verificar la actualización
        const [updated] = await sequelize.query(`
            SELECT company_id, name, active_modules FROM companies WHERE company_id = :id
        `, { replacements: { id: isiCompany.company_id }, type: QueryTypes.SELECT });

        const verifiedModules = typeof updated.active_modules === 'string'
            ? JSON.parse(updated.active_modules)
            : updated.active_modules;

        const hasProcurement = verifiedModules.includes('procurement-management');
        console.log(`\n🔍 Verificación: ${hasProcurement ? '✅ Módulo confirmado' : '❌ Error en asignación'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('connect')) {
            console.log('\n💡 Asegúrate de que PostgreSQL esté corriendo');
        }
    } finally {
        await sequelize.close();
    }
}

assignProcurementToISI();
