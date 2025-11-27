/**
 * Script completo para actualizar engineering-metadata.js con Multi-Branch
 * Ejecutar: node scripts/update-multibranch-metadata-complete.js
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

function updateMetadata() {
    console.log('📋 Actualizando engineering-metadata.js con Multi-Branch completo...\n');

    let content = fs.readFileSync(metadataPath, 'utf8');

    // 1. Actualizar latestChanges
    const latestChangesPattern = /"latestChanges": \[/;
    const newChanges = `"latestChanges": [
      "🏢 MULTI-BRANCH SYSTEM: Análisis completo y arquitectura definida (2025-11-26)",
      "📋 docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md: Documento de arquitectura con principio NULL=GLOBAL",
      "📋 docs/MULTI-BRANCH-IMPLEMENTATION-GUIDE.md: Guía paso a paso para implementación",
      "✅ ANÁLISIS: 14 tablas con branch_id, 0 datos asignados (retrocompatibilidad total)",
      "✅ REGLA: authorized_departments en kiosks NO se modifica (es más flexible)",
      "✅ FASES: 6 fases definidas (MB-1 a MB-6) con niveles de riesgo",
      "🔧 Fase MB-1: multi_branch_enabled en companies (RIESGO: CERO)",
      "🔧 Fase MB-2: branch_scope en users (RIESGO: BAJO)",`;

    if (content.includes('"latestChanges": [')) {
        content = content.replace(latestChangesPattern, newChanges);
        console.log('✅ latestChanges actualizado');
    }

    // 2. Actualizar lastUpdated del proyecto
    const today = new Date().toISOString();
    content = content.replace(
        /"lastUpdated": "[\d\-T:.Z]+"/,
        `"lastUpdated": "${today}"`
    );
    console.log('✅ lastUpdated actualizado');

    // 3. Guardar
    fs.writeFileSync(metadataPath, content, 'utf8');

    console.log(`
   ✅ METADATA ACTUALIZADO EXITOSAMENTE
   ────────────────────────────────────
   • latestChanges: Agregados 8 items de Multi-Branch
   • lastUpdated: ${today}
   • Archivo: engineering-metadata.js
    `);
}

updateMetadata();
