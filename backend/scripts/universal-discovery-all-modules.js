/**
 * ============================================================================
 * UNIVERSAL MODULE DISCOVERY - ALL MODULES
 * ============================================================================
 *
 * Script maestro que ejecuta Discovery en TODOS los módulos del sistema:
 * 1. Carga lista de módulos activos desde system_modules
 * 2. Para cada módulo:
 *    - Navega al módulo
 *    - Ejecuta discoverModuleStructure()
 *    - Ejecuta crossReferenceWithBrain()
 *    - Guarda resultados individuales
 * 3. Consolida todos los resultados
 * 4. Genera reporte maestro con estadísticas globales
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const Phase4TestOrchestrator = require('../src/auditor/core/Phase4TestOrchestrator');
const database = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  UNIVERSAL MODULE DISCOVERY - ALL MODULES (45)            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Módulos a saltar (no tienen UI navegable)
const SKIP_MODULES = [
    'kiosks-apk',          // APK Android, no tiene UI web
    'support-base',        // Base técnica, no tiene UI independiente
    'mi-espacio'           // Alias/redirect
];

// Configuración
const COMPANY_SLUG = 'isi';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const MAX_MODULES_PER_RUN = 45; // Procesar todos

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false, // Visible para debugging
        slowMo: 50,      // Más rápido que demos
        timeout: 30000   // 30s timeout
    }, database.sequelize);

    const results = {
        totalModules: 0,
        tested: 0,
        skipped: 0,
        failed: 0,
        modules: [],
        consolidatedStats: {
            totalButtons: 0,
            totalModals: 0,
            totalTabs: 0,
            totalFileUploads: 0,
            totalInputs: 0,
            totalUndocumented: 0
        },
        timestamp: new Date().toISOString()
    };

    try {
        // Iniciar orchestrator
        await orchestrator.start();

        // Login UNA VEZ
        console.log('🔐 LOGIN...\n');
        await orchestrator.login(COMPANY_SLUG, USERNAME, PASSWORD);
        console.log('✅ Login exitoso\n');

        // Obtener lista de módulos activos
        console.log('📦 Cargando módulos activos...\n');
        const [modules] = await database.sequelize.query(`
            SELECT module_key, name, category, is_active
            FROM system_modules
            WHERE is_active = true
            ORDER BY category, module_key
            LIMIT ${MAX_MODULES_PER_RUN}
        `);

        results.totalModules = modules.length;
        console.log(`   ✅ ${modules.length} módulos cargados\n`);

        console.log('═'.repeat(70));
        console.log('INICIO DEL DISCOVERY MASIVO');
        console.log('═'.repeat(70));
        console.log('');

        // Procesar cada módulo
        for (let i = 0; i < modules.length; i++) {
            const module = modules[i];
            const moduleKey = module.module_key;

            console.log(`\n${'─'.repeat(70)}`);
            console.log(`📦 MÓDULO ${i + 1}/${modules.length}: ${moduleKey}`);
            console.log(`   Nombre: ${module.name}`);
            console.log(`   Categoría: ${module.category}`);
            console.log(`${'─'.repeat(70)}\n`);

            const moduleResult = {
                moduleKey,
                name: module.name,
                category: module.category,
                status: 'pending',
                error: null,
                discovery: null,
                comparison: null,
                timestamp: new Date().toISOString()
            };

            // Verificar si debe saltarse
            if (SKIP_MODULES.includes(moduleKey)) {
                console.log(`   ⏭️  SALTADO (módulo sin UI web)\n`);
                moduleResult.status = 'skipped';
                results.skipped++;
                results.modules.push(moduleResult);
                continue;
            }

            try {
                // Navegar al módulo
                console.log(`   📂 Navegando a ${moduleKey}...\n`);
                await orchestrator.navigateToModule(moduleKey);
                await orchestrator.wait(1500); // Esperar carga
                console.log(`   ✅ Módulo cargado\n`);

                // Discovery de estructura
                console.log(`   🔍 Ejecutando Discovery...\n`);
                const discovery = await orchestrator.discoverModuleStructure(moduleKey);

                // Cross-reference con Brain
                console.log(`   🧠 Cross-reference con Brain...\n`);
                const comparison = await orchestrator.crossReferenceWithBrain(discovery, moduleKey);

                // Guardar resultados
                moduleResult.discovery = discovery;
                moduleResult.comparison = comparison;
                moduleResult.status = 'success';

                // Mostrar resumen
                console.log(`   📊 RESUMEN:`);
                console.log(`      Botones: ${discovery.structure.buttons?.count || 0}`);
                console.log(`      Modales: ${discovery.structure.modals?.count || 0}`);
                console.log(`      Tabs: ${discovery.structure.tabs?.count || 0}`);
                console.log(`      File Uploads: ${discovery.structure.fileUploads?.count || 0}`);
                console.log(`      Total Inputs: ${discovery.structure.totalInputs || 0}`);
                console.log(`      Elementos NO documentados: ${comparison.gaps?.undocumented.length || 0}`);

                // Actualizar stats consolidados
                results.consolidatedStats.totalButtons += discovery.structure.buttons?.count || 0;
                results.consolidatedStats.totalModals += discovery.structure.modals?.count || 0;
                results.consolidatedStats.totalTabs += discovery.structure.tabs?.count || 0;
                results.consolidatedStats.totalFileUploads += discovery.structure.fileUploads?.count || 0;
                results.consolidatedStats.totalInputs += discovery.structure.totalInputs || 0;
                results.consolidatedStats.totalUndocumented += comparison.gaps?.undocumented.length || 0;

                results.tested++;
                console.log(`\n   ✅ Discovery completado exitosamente`);

            } catch (error) {
                console.error(`\n   ❌ ERROR: ${error.message}`);
                moduleResult.status = 'failed';
                moduleResult.error = {
                    message: error.message,
                    stack: error.stack
                };
                results.failed++;
            }

            results.modules.push(moduleResult);

            // Guardar progreso parcial cada 5 módulos
            if ((i + 1) % 5 === 0) {
                const partialReportPath = path.join(__dirname, `../logs/discovery-all-modules-partial-${Date.now()}.json`);
                fs.writeFileSync(partialReportPath, JSON.stringify(results, null, 2));
                console.log(`\n   💾 Progreso guardado: ${i + 1}/${modules.length} módulos procesados\n`);
            }
        }

        // ========================================================================
        // REPORTE FINAL
        // ========================================================================
        console.log('\n' + '═'.repeat(70));
        console.log('REPORTE FINAL - DISCOVERY MASIVO');
        console.log('═'.repeat(70));
        console.log('');

        console.log('📊 ESTADÍSTICAS GLOBALES:\n');
        console.log(`   Total módulos: ${results.totalModules}`);
        console.log(`   Testeados exitosamente: ${results.tested} ✅`);
        console.log(`   Saltados: ${results.skipped} ⏭️`);
        console.log(`   Fallidos: ${results.failed} ❌\n`);

        console.log('🎨 ELEMENTOS DESCUBIERTOS:\n');
        console.log(`   Total botones: ${results.consolidatedStats.totalButtons}`);
        console.log(`   Total modales: ${results.consolidatedStats.totalModals}`);
        console.log(`   Total tabs: ${results.consolidatedStats.totalTabs}`);
        console.log(`   Total file uploads: ${results.consolidatedStats.totalFileUploads}`);
        console.log(`   Total inputs: ${results.consolidatedStats.totalInputs}\n`);

        console.log('⚠️  GAPS EN BRAIN METADATA:\n');
        console.log(`   Total elementos NO documentados: ${results.consolidatedStats.totalUndocumented}\n`);

        // Módulos con más gaps
        const modulesWithGaps = results.modules
            .filter(m => m.status === 'success' && m.comparison?.gaps?.undocumented.length > 0)
            .sort((a, b) => b.comparison.gaps.undocumented.length - a.comparison.gaps.undocumented.length)
            .slice(0, 10);

        if (modulesWithGaps.length > 0) {
            console.log('🔝 TOP 10 MÓDULOS CON MÁS GAPS:\n');
            modulesWithGaps.forEach((mod, i) => {
                console.log(`   ${i + 1}. ${mod.moduleKey.padEnd(35)} ${mod.comparison.gaps.undocumented.length} elementos`);
            });
            console.log('');
        }

        // Módulos fallidos
        const failedModules = results.modules.filter(m => m.status === 'failed');
        if (failedModules.length > 0) {
            console.log('❌ MÓDULOS FALLIDOS:\n');
            failedModules.forEach((mod, i) => {
                console.log(`   ${i + 1}. ${mod.moduleKey.padEnd(35)} ${mod.error.message}`);
            });
            console.log('');
        }

        // Patrones de UI detectados
        const patternsFound = {
            modulesWithModals: results.modules.filter(m => m.discovery?.structure.modals?.count > 0).length,
            modulesWithTabs: results.modules.filter(m => m.discovery?.structure.tabs?.found).length,
            modulesWithFileUploads: results.modules.filter(m => m.discovery?.structure.fileUploads?.found).length,
            modulesWithDMS: results.modules.filter(m => m.discovery?.structure.integrations?.dms).length,
            modulesWithVencimientos: results.modules.filter(m => m.discovery?.structure.integrations?.vencimientos).length
        };

        console.log('🎯 PATRONES DE UI DETECTADOS:\n');
        console.log(`   Módulos con modales: ${patternsFound.modulesWithModals}`);
        console.log(`   Módulos con tabs: ${patternsFound.modulesWithTabs}`);
        console.log(`   Módulos con file uploads: ${patternsFound.modulesWithFileUploads}`);
        console.log(`   Módulos con integración DMS: ${patternsFound.modulesWithDMS}`);
        console.log(`   Módulos con vencimientos: ${patternsFound.modulesWithVencimientos}\n`);

        // Guardar reporte completo
        const finalReportPath = path.join(__dirname, `../logs/discovery-all-modules-FINAL-${Date.now()}.json`);
        fs.writeFileSync(finalReportPath, JSON.stringify(results, null, 2));

        console.log(`✅ Reporte final guardado en: ${finalReportPath}\n`);

        // Guardar reporte resumido en formato legible
        const summaryPath = path.join(__dirname, `../logs/discovery-all-modules-SUMMARY-${Date.now()}.txt`);
        const summaryContent = `
╔════════════════════════════════════════════════════════════╗
║  REPORTE DISCOVERY - TODOS LOS MÓDULOS                    ║
╚════════════════════════════════════════════════════════════╝

Fecha: ${new Date().toISOString()}

📊 ESTADÍSTICAS:
   Total módulos: ${results.totalModules}
   Testeados: ${results.tested}
   Saltados: ${results.skipped}
   Fallidos: ${results.failed}

🎨 ELEMENTOS DESCUBIERTOS:
   Botones: ${results.consolidatedStats.totalButtons}
   Modales: ${results.consolidatedStats.totalModals}
   Tabs: ${results.consolidatedStats.totalTabs}
   File Uploads: ${results.consolidatedStats.totalFileUploads}
   Inputs: ${results.consolidatedStats.totalInputs}

⚠️  GAPS:
   Elementos NO documentados: ${results.consolidatedStats.totalUndocumented}

🔝 TOP MÓDULOS CON GAPS:
${modulesWithGaps.map((mod, i) => `   ${i + 1}. ${mod.moduleKey} (${mod.comparison.gaps.undocumented.length} gaps)`).join('\n')}

❌ MÓDULOS FALLIDOS:
${failedModules.length > 0 ? failedModules.map((mod, i) => `   ${i + 1}. ${mod.moduleKey}: ${mod.error.message}`).join('\n') : '   Ninguno'}

🎯 RECOMENDACIONES:
   1. Actualizar Brain metadata para ${modulesWithGaps.length} módulos con gaps
   2. Investigar módulos fallidos (${failedModules.length})
   3. Documentar patrones de UI encontrados
   4. Ejecutar discovery regularmente para mantener Brain actualizado
`;

        fs.writeFileSync(summaryPath, summaryContent);
        console.log(`✅ Resumen guardado en: ${summaryPath}\n`);

        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    DISCOVERY COMPLETADO                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
