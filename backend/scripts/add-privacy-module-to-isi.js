/**
 * Script para agregar privacy-regulations a active_modules de ISI
 */
const { sequelize } = require('../src/config/database');

async function main() {
    try {
        console.log('=== Agregando privacy-regulations a ISI ===\n');

        // Obtener active_modules actual
        const [companies] = await sequelize.query(
            "SELECT company_id, name, active_modules FROM companies WHERE company_id = 11"
        );

        if (!companies || companies.length === 0) {
            console.error('No se encontró ISI');
            process.exit(1);
        }

        const company = companies[0];
        let activeModules = [];

        if (company.active_modules) {
            if (typeof company.active_modules === 'string') {
                activeModules = JSON.parse(company.active_modules);
            } else if (Array.isArray(company.active_modules)) {
                activeModules = company.active_modules;
            }
        }

        console.log('Módulos antes:', activeModules.length);
        console.log('Tiene privacy-regulations?:', activeModules.includes('privacy-regulations'));

        // Agregar si no existe
        if (!activeModules.includes('privacy-regulations')) {
            activeModules.push('privacy-regulations');

            // Actualizar en BD
            await sequelize.query(
                "UPDATE companies SET active_modules = :modules WHERE company_id = 11",
                {
                    replacements: { modules: JSON.stringify(activeModules) },
                    type: sequelize.QueryTypes.UPDATE
                }
            );

            console.log('\n✅ Agregado privacy-regulations');
        } else {
            console.log('\n⚠️  Ya existe privacy-regulations');
        }

        // Verificar resultado
        const [updated] = await sequelize.query(
            "SELECT active_modules FROM companies WHERE company_id = 11"
        );

        const finalModules = JSON.parse(updated[0].active_modules);
        console.log('Módulos después:', finalModules.length);
        console.log('Tiene privacy-regulations?:', finalModules.includes('privacy-regulations'));

        console.log('\n✅ Done');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
