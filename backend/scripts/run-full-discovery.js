/**
 * FULL UI DISCOVERY - Análisis Completo del Sistema
 *
 * Ejecuta:
 * 1. Análisis estático de HTML (rápido, sin browser)
 * 2. Actualiza el knowledge base del Brain
 *
 * Uso:
 *   node scripts/run-full-discovery.js
 */

const StaticHTMLAnalyzer = require('../src/brain/crawlers/StaticHTMLAnalyzer');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║       FULL UI DISCOVERY - Conocimiento Profundo del Sistema    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    const startTime = Date.now();

    try {
        // PASO 1: Análisis Estático
        console.log('\n' + '─'.repeat(60));
        console.log('📄 PASO 1: Análisis Estático de HTML');
        console.log('─'.repeat(60));

        const staticAnalyzer = new StaticHTMLAnalyzer();
        const staticResults = await staticAnalyzer.analyzeAll();

        // PASO 2: Actualizar modules-registry con nuevo conocimiento
        console.log('\n' + '─'.repeat(60));
        console.log('🧠 PASO 2: Actualizando Brain Knowledge');
        console.log('─'.repeat(60));

        await updateBrainKnowledge(staticResults);

        // PASO 3: Generar reporte de conocimiento
        console.log('\n' + '─'.repeat(60));
        console.log('📊 PASO 3: Generando Reporte');
        console.log('─'.repeat(60));

        await generateKnowledgeReport(staticResults);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n' + '═'.repeat(60));
        console.log('✅ DISCOVERY COMPLETADO');
        console.log('═'.repeat(60));
        console.log(`   Duración total: ${duration}s`);
        console.log(`   Módulos descubiertos: ${Object.keys(staticResults.modules).length}`);
        console.log(`   Elementos UI totales: ${staticResults.stats.totalButtons + staticResults.stats.totalInputs}`);
        console.log('\n📁 Archivos generados:');
        console.log('   • src/brain/knowledge/ui/static-analysis.json');
        console.log('   • src/brain/knowledge/ui/modules-summary.json');
        console.log('   • src/brain/knowledge/ui/knowledge-report.json');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

async function updateBrainKnowledge(staticResults) {
    const registryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');

    try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        let updated = 0;

        for (const [moduleKey, moduleData] of Object.entries(staticResults.modules)) {
            // Buscar módulo en registry
            const regModule = registry.modules.find(m =>
                m.id === moduleKey ||
                m.id === moduleKey.replace(/_/g, '-') ||
                m.key === moduleKey
            );

            if (regModule) {
                // Actualizar UI section
                regModule.ui = regModule.ui || {};
                regModule.ui.discoveredButtons = (moduleData.elements?.buttons || []).length;
                regModule.ui.discoveredInputs = (moduleData.elements?.inputs || []).length;
                regModule.ui.discoveredModals = (moduleData.elements?.modals || []).length;
                regModule.ui.lastStaticAnalysis = staticResults.analyzedAt;

                if (moduleData.jsAnalysis) {
                    regModule.api = regModule.api || {};
                    regModule.api.discoveredEndpoints = moduleData.jsAnalysis.apiEndpoints;
                    regModule.api.functionCount = moduleData.jsAnalysis.functionCount;
                }

                updated++;
            }
        }

        // Agregar estadísticas globales
        registry.knowledgeStats = {
            lastDiscovery: staticResults.analyzedAt,
            totalButtons: staticResults.stats.totalButtons,
            totalInputs: staticResults.stats.totalInputs,
            totalModals: staticResults.stats.totalModals,
            modulesWithKnowledge: updated
        };

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
        console.log(`   ✅ Actualizados ${updated} módulos en registry`);

    } catch (error) {
        console.log(`   ⚠️ No se pudo actualizar registry: ${error.message}`);
    }
}

async function generateKnowledgeReport(staticResults) {
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalModules: Object.keys(staticResults.modules).length,
            totalButtons: staticResults.stats.totalButtons,
            totalInputs: staticResults.stats.totalInputs,
            totalModals: staticResults.stats.totalModals,
            totalTabs: staticResults.stats.totalTabs
        },
        moduleKnowledge: {},
        actionableButtons: [],
        formFields: []
    };

    // Categorizar botones por acción
    const buttonsByAction = {};
    for (const btn of staticResults.globalElements.buttons) {
        const action = btn.inferredAction || 'unknown';
        buttonsByAction[action] = buttonsByAction[action] || [];
        buttonsByAction[action].push({
            text: btn.text,
            id: btn.id,
            module: btn.dataModule
        });
    }
    report.buttonsByAction = buttonsByAction;

    // Módulos con más elementos (para priorizar)
    for (const [key, mod] of Object.entries(staticResults.modules)) {
        report.moduleKnowledge[key] = {
            hasUI: (mod.elements?.buttons?.length || 0) > 0,
            hasAPI: (mod.jsAnalysis?.apiEndpoints?.length || 0) > 0,
            complexity: (mod.elements?.buttons?.length || 0) +
                       (mod.elements?.inputs?.length || 0) +
                       (mod.jsAnalysis?.apiEndpoints?.length || 0)
        };
    }

    // Guardar reporte
    const reportPath = path.join(__dirname, '../src/brain/knowledge/ui/knowledge-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   ✅ Reporte guardado: knowledge-report.json`);

    return report;
}

main();
