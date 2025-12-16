/**
 * ============================================================================
 * UNIVERSAL MODULE DISCOVERY SYSTEM - DEMO
 * ============================================================================
 *
 * Este script demuestra el sistema de discovery universal que:
 * 1. Descubre estructura completa del módulo (tabs, modales anidados, uploads)
 * 2. Cross-reference con Brain metadata
 * 3. Reporta elementos no documentados
 * 4. Genera recomendaciones para actualizar Brain
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
console.log('║  UNIVERSAL MODULE DISCOVERY SYSTEM                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

(async () => {
    const orchestrator = new Phase4TestOrchestrator({
        headless: false,
        slowMo: 100,
        timeout: 60000
    }, database.sequelize);

    try {
        // Iniciar orchestrator
        await orchestrator.start();

        // Login
        console.log('🔐 LOGIN...\n');
        await orchestrator.login('isi', 'admin', 'admin123');
        console.log('✅ Login exitoso\n');

        // Navegar al módulo users
        const MODULE_KEY = 'users';
        console.log(`📂 NAVEGANDO AL MÓDULO: ${MODULE_KEY}...\n`);
        await orchestrator.navigateToModule(MODULE_KEY);
        await orchestrator.wait(2000);
        console.log('✅ Módulo cargado\n');

        console.log('═'.repeat(70));
        console.log('FASE 1: DESCUBRIMIENTO COMPLETO DE LA INTERFAZ');
        console.log('═'.repeat(70));
        console.log('');

        // ========================================================================
        // FASE 1: DESCUBRIMIENTO COMPLETO
        // ========================================================================
        const discovery = await orchestrator.discoverModuleStructure(MODULE_KEY);

        console.log('✅ DESCUBRIMIENTO COMPLETADO\n');

        // Mostrar resultados del discovery
        console.log('📊 ESTRUCTURA DESCUBIERTA:\n');

        // Botones
        console.log(`   🔘 Botones: ${discovery.structure.buttons.count}`);
        if (discovery.structure.buttons.count > 0) {
            const first5 = discovery.structure.buttons.items.slice(0, 5);
            first5.forEach((btn, i) => {
                console.log(`      ${i + 1}. "${btn.text}"${btn.onclick ? ' [onclick]' : ''}`);
            });
            if (discovery.structure.buttons.count > 5) {
                console.log(`      ... y ${discovery.structure.buttons.count - 5} más`);
            }
        }
        console.log('');

        // Modales
        console.log(`   💬 Modales: ${discovery.structure.modals.count}`);
        if (discovery.structure.modals.nested) {
            console.log(`      ⚠️  MODALES ANIDADOS detectados (${discovery.structure.modals.count} niveles)`);
            discovery.structure.modals.modals.forEach((modal, i) => {
                console.log(`         Nivel ${modal.level}: ${modal.className} (z-index: ${modal.zIndex})`);
            });
        }
        console.log('');

        // Tabs
        console.log(`   📑 Tabs: ${discovery.structure.tabs.found ? discovery.structure.tabs.count : 0}`);
        if (discovery.structure.tabs.found) {
            discovery.structure.tabs.tabs.forEach((tab, i) => {
                console.log(`      ${i + 1}. "${tab.label}"${tab.active ? ' [ACTIVE]' : ''}`);
            });
        }
        console.log('');

        // File Uploads
        console.log(`   📤 File Uploads: ${discovery.structure.fileUploads.count}`);
        if (discovery.structure.fileUploads.found) {
            discovery.structure.fileUploads.uploads.forEach((upload, i) => {
                console.log(`      ${i + 1}. ${upload.label || upload.name}${upload.dmsIntegration ? ' [DMS]' : ''}`);
            });
        }
        console.log('');

        // Integraciones
        console.log(`   🔗 Integraciones Detectadas:`);
        console.log(`      DMS: ${discovery.structure.integrations.dms ? '✅' : '❌'}`);
        console.log(`      Vencimientos: ${discovery.structure.integrations.vencimientos ? '✅' : '❌'}`);
        console.log(`      Calendar: ${discovery.structure.integrations.calendar ? '✅' : '❌'}`);
        console.log(`      Map: ${discovery.structure.integrations.map ? '✅' : '❌'}`);
        console.log('');

        // Inputs totales
        console.log(`   📝 Total Inputs: ${discovery.structure.totalInputs}\n`);

        // ========================================================================
        // FASE 2: CROSS-REFERENCE CON BRAIN
        // ========================================================================
        console.log('═'.repeat(70));
        console.log('FASE 2: CROSS-REFERENCE CON BRAIN METADATA');
        console.log('═'.repeat(70));
        console.log('');

        const comparison = await orchestrator.crossReferenceWithBrain(discovery, MODULE_KEY);

        if (comparison.success === false) {
            console.log(`⚠️  ${comparison.error}\n`);
        } else {
            console.log('✅ CROSS-REFERENCE COMPLETADO\n');

            // Mostrar metadata de Brain
            console.log('🧠 BRAIN METADATA:');
            console.log(`   Nombre: ${comparison.brainMetadata.name}`);
            console.log(`   Categoría: ${comparison.brainMetadata.category}`);
            console.log(`   Tiene endpoints: ${comparison.brainMetadata.hasEndpoints ? '✅' : '❌'}`);
            console.log(`   Tiene tablas: ${comparison.brainMetadata.hasTables ? '✅' : '❌'}`);
            console.log(`   Tiene ayuda: ${comparison.brainMetadata.hasHelp ? '✅' : '❌'}`);
            console.log('');

            // Mostrar UI descubierta
            console.log('🖥️  UI DESCUBIERTA:');
            console.log(`   Botones: ${comparison.discoveredUI.buttons}`);
            console.log(`   Modales: ${comparison.discoveredUI.modals}`);
            console.log(`   Tabs: ${comparison.discoveredUI.tabs}`);
            console.log(`   File Uploads: ${comparison.discoveredUI.fileUploads}`);
            console.log(`   Total Inputs: ${comparison.discoveredUI.totalInputs}`);
            console.log('');

            // Mostrar GAPS
            console.log('⚠️  ELEMENTOS NO DOCUMENTADOS EN BRAIN:');
            if (comparison.gaps.undocumented.length === 0) {
                console.log('   ✅ Todos los elementos UI están documentados en Brain\n');
            } else {
                console.log(`   Total: ${comparison.gaps.undocumented.length} elementos\n`);

                // Agrupar por tipo
                const byType = comparison.gaps.undocumented.reduce((acc, item) => {
                    if (!acc[item.type]) acc[item.type] = [];
                    acc[item.type].push(item);
                    return acc;
                }, {});

                Object.keys(byType).forEach(type => {
                    console.log(`   📌 ${type.toUpperCase()}:`);
                    byType[type].forEach((item, i) => {
                        if (item.type === 'button') {
                            console.log(`      ${i + 1}. "${item.text}"${item.onclick ? ' [onclick]' : ''}`);
                        } else if (item.type === 'tab') {
                            console.log(`      ${i + 1}. Tab: "${item.label}"`);
                        } else if (item.type === 'fileUpload') {
                            console.log(`      ${i + 1}. "${item.label || item.name}"${item.dmsIntegration ? ' [DMS]' : ''}`);
                        }
                    });
                    console.log('');
                });
            }

            // Mostrar RECOMENDACIONES
            if (comparison.gaps.recommendations.length > 0) {
                console.log('💡 RECOMENDACIONES:');
                comparison.gaps.recommendations.forEach((rec, i) => {
                    console.log(`   ${i + 1}. [${rec.priority}] ${rec.description}`);
                });
                console.log('');
            }
        }

        // ========================================================================
        // FASE 3: GUARDAR REPORTE
        // ========================================================================
        console.log('═'.repeat(70));
        console.log('FASE 3: GUARDAR REPORTE');
        console.log('═'.repeat(70));
        console.log('');

        const report = {
            discovery,
            comparison,
            generatedAt: new Date().toISOString()
        };

        const reportPath = path.join(__dirname, `../logs/discovery-${MODULE_KEY}-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`✅ Reporte guardado en: ${reportPath}\n`);

        // ========================================================================
        // RESUMEN FINAL
        // ========================================================================
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN FINAL                           ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        console.log('✅ DISCOVERY COMPLETADO:');
        console.log(`   - ${discovery.structure.buttons.count} botones descubiertos`);
        console.log(`   - ${discovery.structure.modals.count} modales encontrados`);
        console.log(`   - ${discovery.structure.tabs.found ? discovery.structure.tabs.count : 0} tabs detectados`);
        console.log(`   - ${discovery.structure.fileUploads.count} file uploads encontrados`);
        console.log(`   - ${discovery.structure.totalInputs} inputs totales\n`);

        if (comparison.success !== false) {
            console.log('🧠 BRAIN CROSS-REFERENCE:');
            console.log(`   - ${comparison.gaps.undocumented.length} elementos NO documentados`);
            console.log(`   - ${comparison.gaps.recommendations.length} recomendaciones generadas\n`);
        }

        console.log('🎯 PRÓXIMOS PASOS:');
        if (comparison.gaps?.undocumented.length > 0) {
            console.log('   1. Revisar elementos no documentados');
            console.log('   2. Actualizar Brain metadata con nueva información');
            console.log('   3. Ejecutar discovery nuevamente para validar\n');
        } else {
            console.log('   ✅ Brain metadata está actualizado\n');
        }

        await orchestrator.stop();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        await orchestrator.stop();
        process.exit(1);
    }
})();
