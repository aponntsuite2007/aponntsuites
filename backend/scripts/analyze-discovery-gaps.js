/**
 * ============================================================================
 * ANALIZADOR DE GAPS - Universal Discovery System
 * ============================================================================
 *
 * Lee el reporte JSON del discovery y muestra:
 * 1. Qué gaps hay en cada módulo
 * 2. Dónde están documentados (archivo JSON)
 * 3. Cómo arreglarlos (actualizar Brain metadata)
 *
 * Uso:
 *   node scripts/analyze-discovery-gaps.js
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ANALIZADOR DE GAPS - DISCOVERY REPORT                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 1. Buscar el reporte más reciente
const logsDir = path.join(__dirname, '../logs');
const files = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('discovery-all-modules-FINAL-') && f.endsWith('.json'))
    .map(f => ({
        name: f,
        path: path.join(logsDir, f),
        time: fs.statSync(path.join(logsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

if (files.length === 0) {
    console.error('❌ No se encontró ningún reporte de discovery.');
    console.error('   Ejecuta primero: node scripts/universal-discovery-all-modules.js');
    process.exit(1);
}

const reportPath = files[0].path;
console.log(`📄 Reporte más reciente: ${files[0].name}`);
console.log(`📍 Ubicación: ${reportPath}\n`);

// 2. Leer el reporte
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('═'.repeat(70));
console.log('RESUMEN GLOBAL');
console.log('═'.repeat(70));
console.log(`Total módulos testeados: ${report.tested}`);
console.log(`Total gaps encontrados: ${report.consolidatedStats.totalUndocumented}`);
console.log('');

// 3. Analizar gaps por módulo
const modulesWithGaps = report.modules
    .filter(m => m.status === 'success' && m.comparison?.gaps?.undocumented?.length > 0)
    .sort((a, b) => b.comparison.gaps.undocumented.length - a.comparison.gaps.undocumented.length);

console.log('═'.repeat(70));
console.log(`MÓDULOS CON GAPS (${modulesWithGaps.length} módulos)`);
console.log('═'.repeat(70));
console.log('');

modulesWithGaps.forEach((module, index) => {
    const gaps = module.comparison.gaps.undocumented;

    console.log(`${index + 1}. ${module.moduleKey.toUpperCase()}`);
    console.log(`   Nombre: ${module.name}`);
    console.log(`   Categoría: ${module.category}`);
    console.log(`   Total gaps: ${gaps.length}`);
    console.log('');
    console.log('   📋 GAPS ENCONTRADOS:');

    // Agrupar gaps por tipo
    const gapsByType = {};
    gaps.forEach(gap => {
        const type = gap.type || 'unknown';
        if (!gapsByType[type]) gapsByType[type] = [];
        gapsByType[type].push(gap);
    });

    Object.keys(gapsByType).forEach(type => {
        console.log(`   \n   ${type.toUpperCase()} (${gapsByType[type].length}):`);
        gapsByType[type].forEach((gap, i) => {
            if (type === 'button') {
                const onclickStr = gap.onclick ? (typeof gap.onclick === 'string' ? gap.onclick.substring(0, 40) : JSON.stringify(gap.onclick).substring(0, 40)) : '';
                console.log(`      ${i + 1}. "${gap.text}" ${onclickStr ? `[onClick: ${onclickStr}...]` : ''}`);
            } else if (type === 'tab') {
                console.log(`      ${i + 1}. Tab: "${gap.label}"`);
            } else if (type === 'input') {
                console.log(`      ${i + 1}. Input: "${gap.name}" (${gap.type})`);
            } else {
                console.log(`      ${i + 1}. ${JSON.stringify(gap).substring(0, 60)}...`);
            }
        });
    });

    console.log('');
    console.log('   🔧 CÓMO ARREGLAR:');
    console.log(`   1. Abrir: src/auditor/registry/modules-registry.json`);
    console.log(`   2. Buscar módulo: "${module.moduleKey}"`);
    console.log(`   3. Agregar elementos a la sección "ui" del módulo`);
    console.log('');
    console.log('   📝 EJEMPLO DE ACTUALIZACIÓN:');
    console.log(`   {`);
    console.log(`     "moduleKey": "${module.moduleKey}",`);
    console.log(`     "ui": {`);
    console.log(`       "mainButtons": [`);

    const buttonGaps = gapsByType['button'] || [];
    buttonGaps.slice(0, 3).forEach((gap, i) => {
        console.log(`         { "text": "${gap.text}", "action": "..." }${i < Math.min(buttonGaps.length, 3) - 1 ? ',' : ''}`);
    });

    if (buttonGaps.length > 3) {
        console.log(`         // ... y ${buttonGaps.length - 3} botones más`);
    }

    console.log(`       ],`);

    if (gapsByType['tab']) {
        console.log(`       "tabs": [`);
        gapsByType['tab'].slice(0, 3).forEach((gap, i) => {
            console.log(`         { "label": "${gap.label}" }${i < Math.min(gapsByType['tab'].length, 3) - 1 ? ',' : ''}`);
        });
        if (gapsByType['tab'].length > 3) {
            console.log(`         // ... y ${gapsByType['tab'].length - 3} tabs más`);
        }
        console.log(`       ]`);
    }

    console.log(`     }`);
    console.log(`   }`);
    console.log('');
    console.log('─'.repeat(70));
    console.log('');
});

// 4. Resumen final
console.log('═'.repeat(70));
console.log('RECOMENDACIONES FINALES');
console.log('═'.repeat(70));
console.log('');
console.log('📋 PRÓXIMOS PASOS:');
console.log('');
console.log('1. ✅ REVISAR GAPS');
console.log('   - Analiza cada módulo listado arriba');
console.log('   - Identifica qué botones/tabs/inputs faltan en Brain metadata');
console.log('');
console.log('2. ✅ ACTUALIZAR BRAIN METADATA');
console.log('   - Archivo: src/auditor/registry/modules-registry.json');
console.log(`   - Módulos a actualizar: ${modulesWithGaps.length}`);
console.log('   - Agregar elementos UI faltantes en sección "ui" de cada módulo');
console.log('');
console.log('3. ✅ RE-EJECUTAR DISCOVERY');
console.log('   - Comando: node scripts/universal-discovery-all-modules.js');
console.log('   - Validar que gaps disminuyan o desaparezcan');
console.log('');
console.log('4. ✅ AUTOMATIZAR (OPCIONAL)');
console.log('   - Crear script que actualice modules-registry.json automáticamente');
console.log('   - Usar este reporte como input para sincronizar Brain con UI real');
console.log('');

// 5. Guardar reporte legible
const readableReportPath = path.join(logsDir, `gaps-analysis-${Date.now()}.txt`);
const readableContent = generateReadableReport(modulesWithGaps);
fs.writeFileSync(readableReportPath, readableContent);

console.log(`✅ Reporte legible guardado en: ${readableReportPath}`);
console.log('');

/**
 * Genera reporte legible en formato TXT
 */
function generateReadableReport(modules) {
    let content = '';
    content += '╔════════════════════════════════════════════════════════════╗\n';
    content += '║  ANÁLISIS DE GAPS - DISCOVERY REPORT                      ║\n';
    content += '╚════════════════════════════════════════════════════════════╝\n\n';
    content += `Fecha: ${new Date().toISOString()}\n`;
    content += `Total módulos con gaps: ${modules.length}\n\n`;

    modules.forEach((module, index) => {
        const gaps = module.comparison.gaps.undocumented;
        content += `\n${index + 1}. ${module.moduleKey.toUpperCase()}\n`;
        content += `   Gaps: ${gaps.length}\n`;
        content += `   Elementos:\n`;

        gaps.forEach((gap, i) => {
            if (gap.type === 'button') {
                content += `   - [BUTTON] "${gap.text}"\n`;
            } else if (gap.type === 'tab') {
                content += `   - [TAB] "${gap.label}"\n`;
            } else {
                content += `   - [${gap.type?.toUpperCase() || 'UNKNOWN'}] ${JSON.stringify(gap).substring(0, 60)}\n`;
            }
        });
        content += '\n';
    });

    return content;
}
