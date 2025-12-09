/**
 * ============================================================================
 * RUN ENTERPRISE SIMULATION COLLECTOR
 * ============================================================================
 *
 * Ejecuta el EnterpriseSimulationCollector contra datos REALES de PostgreSQL.
 *
 * USO:
 *   node scripts/run-enterprise-simulation-collector.js [companyId]
 *
 * Ejemplos:
 *   node scripts/run-enterprise-simulation-collector.js 11    # ISI company
 *   node scripts/run-enterprise-simulation-collector.js 1     # Aponnt
 *
 * ============================================================================
 */

const database = require('../src/config/database');
const EnterpriseSimulationCollector = require('../src/auditor/collectors/EnterpriseSimulationCollector');
const fs = require('fs');

async function main() {
    const companyId = parseInt(process.argv[2]) || 11; // Default: ISI (company_id = 11)

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║   ███████╗███╗   ██╗████████╗███████╗██████╗ ██████╗ ██████╗ ██╗███████╗███████╗        ║
║   ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██╔════╝        ║
║   █████╗  ██╔██╗ ██║   ██║   █████╗  ██████╔╝██████╔╝██████╔╝██║███████╗█████╗          ║
║   ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██╔═══╝ ██╔══██╗██║╚════██║██╔══╝          ║
║   ███████╗██║ ╚████║   ██║   ███████╗██║  ██║██║     ██║  ██║██║███████║███████╗        ║
║   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝        ║
║                                                                                          ║
║   ███████╗██╗███╗   ███╗██╗   ██╗██╗      █████╗ ████████╗██╗ ██████╗ ███╗   ██╗        ║
║   ██╔════╝██║████╗ ████║██║   ██║██║     ██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║        ║
║   ███████╗██║██╔████╔██║██║   ██║██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║        ║
║   ╚════██║██║██║╚██╔╝██║██║   ██║██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║        ║
║   ███████║██║██║ ╚═╝ ██║╚██████╔╝███████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║        ║
║   ╚══════╝╚═╝╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝        ║
║                                                                                          ║
║   🔍 VALIDACIÓN CON DATOS REALES DE POSTGRESQL                                           ║
║   📊 Company ID: ${companyId.toString().padEnd(66)}║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
`);

    try {
        // 1. Verificar conexión a BD
        console.log('🔌 Conectando a PostgreSQL...');
        await database.sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // 2. Verificar que la empresa existe
        const [company] = await database.sequelize.query(`
            SELECT company_id, name, slug FROM companies WHERE company_id = :companyId
        `, { replacements: { companyId } });

        if (company.length === 0) {
            throw new Error(`Empresa con ID ${companyId} no encontrada`);
        }
        console.log(`🏢 Empresa: ${company[0].name} (${company[0].slug})\n`);

        // 3. Obtener estadísticas previas
        const [stats] = await database.sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND "isActive" = true) as active_users,
                (SELECT COUNT(*) FROM departments WHERE company_id = :companyId AND is_active = true) as departments,
                (SELECT COUNT(*) FROM attendances WHERE company_id = :companyId) as attendances,
                (SELECT COUNT(*) FROM vacation_requests WHERE company_id = :companyId) as vacations,
                (SELECT COUNT(*) FROM notifications WHERE company_id = :companyId) as notifications
        `, { replacements: { companyId } });

        console.log('📊 Datos actuales en la empresa:');
        console.log(`   👥 Usuarios activos: ${stats[0].active_users}`);
        console.log(`   🏢 Departamentos: ${stats[0].departments}`);
        console.log(`   📋 Asistencias: ${stats[0].attendances}`);
        console.log(`   🏖️ Vacaciones: ${stats[0].vacations}`);
        console.log(`   🔔 Notificaciones: ${stats[0].notifications}`);
        console.log('');

        // 4. Crear collector y ejecutar
        const collector = new EnterpriseSimulationCollector(
            database,
            null, // systemRegistry no necesario para este test
            null, // baseURL no necesario (no hay UI tests)
            companyId
        );

        const executionId = `ESC-${Date.now()}`;
        const results = await collector.runAllTests(executionId);

        // 5. Guardar resultados
        const outputFile = `test-results-enterprise-collector-${companyId}.json`;
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Resultados guardados en: ${outputFile}`);

        // 6. Resumen de problemas encontrados
        const allViolations = [];
        results.categories.forEach(cat => {
            cat.tests.forEach(test => {
                if (!test.passed) {
                    allViolations.push({
                        category: cat.category,
                        test: test.test,
                        details: test.details,
                        violations: test.violations || test.orphans || test.duplicates
                    });
                }
            });
        });

        if (allViolations.length > 0) {
            console.log('\n⚠️ PROBLEMAS DETECTADOS QUE REQUIEREN ATENCIÓN:');
            allViolations.forEach((v, i) => {
                console.log(`\n   ${i + 1}. [${v.category}] ${v.test}`);
                console.log(`      ${v.details}`);
                if (v.violations && v.violations.length > 0) {
                    console.log(`      Registros afectados: ${v.violations.length}`);
                }
            });
        }

        // 7. Cerrar conexión
        await database.sequelize.close();
        console.log('\n✅ Test completado. Conexión cerrada.');

        // Exit code basado en resultados
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Error ejecutando test:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
