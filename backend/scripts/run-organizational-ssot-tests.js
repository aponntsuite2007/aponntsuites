/**
 * =====================================================================
 * SSOT TEST RUNNER - Estructura Organizacional
 * =====================================================================
 *
 * Ejecuta el test suite completo de Single Source of Truth (SSOT)
 * para validar la integridad de todo el módulo organizacional.
 *
 * Uso:
 *   node scripts/run-organizational-ssot-tests.js [company_id]
 *   node scripts/run-organizational-ssot-tests.js --auto-fix
 *   node scripts/run-organizational-ssot-tests.js 11 --auto-fix
 *
 * Opciones:
 *   company_id  - ID de la empresa a testear (default: 11)
 *   --auto-fix  - Ejecutar auto-corrección de dependencias huérfanas
 *   --dry-run   - Simular correcciones sin aplicarlas
 *   --json      - Output en formato JSON
 *
 * @author Sistema de Asistencia Biométrico
 * @version 2.0.0
 */

const OrganizationalSSOTService = require('../src/services/OrganizationalSSOTService');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let companyId = 11; // Default
let autoFix = false;
let dryRun = true;
let jsonOutput = false;

for (const arg of args) {
    if (arg === '--auto-fix') {
        autoFix = true;
    } else if (arg === '--dry-run') {
        dryRun = true;
    } else if (arg === '--apply-fixes') {
        dryRun = false;
    } else if (arg === '--json') {
        jsonOutput = true;
    } else if (!isNaN(parseInt(arg))) {
        companyId = parseInt(arg);
    }
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║      🧪 SSOT TEST SUITE - Estructura Organizacional Enterprise              ║');
    console.log('║              Single Source of Truth Validator                                ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`🏢 Company ID: ${companyId}`);
    console.log(`🔧 Auto-fix: ${autoFix ? (dryRun ? 'DRY-RUN' : 'APLICAR') : 'NO'}`);
    console.log();

    const service = new OrganizationalSSOTService();

    try {
        // 1. Ejecutar test suite completo
        console.log('🚀 Iniciando test suite completo...\n');
        const results = await service.runFullCRUDTest(companyId);

        // 2. Auto-fix si está habilitado
        if (autoFix) {
            console.log('\n🔧 Ejecutando auto-corrección de dependencias huérfanas...');
            const fixes = await service.autoFixOrphanedDependencies(companyId, dryRun);
            results.autoFixes = fixes;
        }

        // 3. Guardar resultados
        const resultsDir = path.join(__dirname, '..', 'logs', 'ssot-tests');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = path.join(resultsDir, `ssot-results-${companyId}-${timestamp}.json`);
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`\n📁 Resultados guardados en: ${resultsFile}`);

        // 4. Output JSON si se solicita
        if (jsonOutput) {
            console.log('\n📋 JSON Output:');
            console.log(JSON.stringify(results, null, 2));
        }

        // 5. Resumen final
        console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                           📊 RESUMEN FINAL                                   ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Total Tests:     ${String(results.summary.total).padStart(5)}                                              ║`);
        console.log(`║  ✅ Passed:       ${String(results.summary.passed).padStart(5)}                                              ║`);
        console.log(`║  ❌ Failed:       ${String(results.summary.failed).padStart(5)}                                              ║`);
        console.log(`║  ⚠️ Warnings:     ${String(results.summary.warnings).padStart(5)}                                              ║`);
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');

        const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
        console.log(`║  🎯 Success Rate: ${successRate.padStart(6)}%                                            ║`);

        if (successRate >= 90) {
            console.log('║                                                                              ║');
            console.log('║  ✅ SISTEMA EN BUEN ESTADO - Single Source of Truth validado                ║');
        } else if (successRate >= 70) {
            console.log('║                                                                              ║');
            console.log('║  ⚠️ SISTEMA NECESITA ATENCIÓN - Revisar issues detectados                    ║');
        } else {
            console.log('║                                                                              ║');
            console.log('║  ❌ SISTEMA CON PROBLEMAS CRÍTICOS - Acción inmediata requerida             ║');
        }

        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

        // 6. Detalles de problemas si existen
        if (results.ssotViolations.length > 0) {
            console.log('\n🚫 SSOT Violations detectadas:');
            results.ssotViolations.forEach((v, i) => {
                console.log(`   ${i + 1}. ${v.name}: ${v.description || v.error}`);
            });
        }

        if (results.orphanedReferences.length > 0) {
            console.log('\n🔗 Referencias huérfanas detectadas:');
            results.orphanedReferences.forEach((o, i) => {
                console.log(`   ${i + 1}. ${o.name}: ${o.description || ''}`);
            });
        }

        if (results.integrityIssues.length > 0) {
            console.log('\n⚠️ Problemas de integridad:');
            results.integrityIssues.forEach((i, idx) => {
                console.log(`   ${idx + 1}. ${i.name}: ${i.description || i.error}`);
            });
        }

        // 7. Recomendaciones
        if (results.summary.failed > 0 || results.summary.warnings > 0) {
            console.log('\n📝 RECOMENDACIONES:');
            console.log('   1. Ejecutar con --auto-fix --dry-run para ver correcciones propuestas');
            console.log('   2. Ejecutar con --auto-fix --apply-fixes para aplicar correcciones');
            console.log('   3. Revisar logs detallados en ' + resultsFile);
        }

        // Exit con código apropiado
        process.exit(results.summary.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Error fatal en test suite:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await service.close();
    }
}

// Ejecutar
main();
