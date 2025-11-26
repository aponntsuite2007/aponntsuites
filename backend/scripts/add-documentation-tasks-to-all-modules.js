/**
 * Script para agregar tareas de documentación a TODOS los módulos en engineering-metadata.js
 *
 * Este script:
 * 1. Lee engineering-metadata.js
 * 2. Para cada módulo, agrega una sección "documentation" con tareas pendientes
 * 3. Marca vendorsCommissions como "completed" (ya tiene documentación)
 * 4. Guarda el archivo actualizado
 *
 * Autor: Claude Code
 * Fecha: 2025-01-22
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

console.log('📝 Agregando tareas de documentación a todos los módulos...\n');

// Función para generar la sección de documentation
function generateDocumentationSection(moduleKey, isCompleted = false) {
  const moduleName = moduleKey
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .toUpperCase();

  return `
    documentation: {
      status: "${isCompleted ? 'completed' : 'pending'}", // pending | in_progress | completed
      file: "docs/modules/${moduleName}-MODULE.md",
      templateUsed: "docs/templates/MODULE-DOCUMENTATION-TEMPLATE.md",
      sections: {
        resumenEjecutivo: ${isCompleted},
        guiaDeUso: ${isCompleted},
        funcionalidadInterna: ${isCompleted},
        stackTecnologico: ${isCompleted},
        diagramasDeFlujo: ${isCompleted},
        apiRest: ${isCompleted},
        baseDeDatos: ${isCompleted},
        ejemplosDeUso: ${isCompleted},
        troubleshooting: ${isCompleted}
      },
      lastUpdated: ${isCompleted ? `"${new Date().toISOString().split('T')[0]}"` : 'null'},
      tasks: [
        { id: "${moduleKey.toUpperCase()}-DOC-1", name: "Crear resumen ejecutivo del módulo", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-2", name: "Documentar guía de uso con casos comunes", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-3", name: "Explicar funcionalidad interna y arquitectura", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-4", name: "Listar stack tecnológico completo", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-5", name: "Crear diagramas de flujo en Mermaid", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-6", name: "Documentar todos los endpoints API REST", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-7", name: "Documentar esquema de base de datos", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-8", name: "Agregar ejemplos de uso prácticos", done: ${isCompleted} },
        { id: "${moduleKey.toUpperCase()}-DOC-9", name: "Crear sección de troubleshooting", done: ${isCompleted} }
      ]
    },`;
}

// Leer archivo
let content = fs.readFileSync(metadataPath, 'utf8');

// Lista de módulos a documentar
const modules = [
  'authentication',
  'companies',
  'users',
  'attendance',
  'departments',
  'shifts',
  'kiosks',
  'notifications',
  'medical',
  'legal',
  'vacation',
  'partners',
  'aiAssistant',
  'auditor',
  'vendorsCommissions',
  'budgets',
  'contracts',
  'invoicing',
  'commissionLiquidation',
  'cobranzas'
];

console.log(`📋 Módulos encontrados: ${modules.length}\n`);

let modulesUpdated = 0;

// Para cada módulo, buscar su sección y agregar documentation
modules.forEach(moduleKey => {
  console.log(`🔍 Procesando módulo: ${moduleKey}...`);

  // Buscar si ya tiene sección de documentation en ESTE módulo específico
  // Buscar el bloque completo del módulo
  const moduleBlockRegex = new RegExp(
    `${moduleKey}:\\s*\\{[\\s\\S]*?\\n    \\},?\\n`,
    'g'
  );

  const moduleBlock = content.match(moduleBlockRegex);

  if (moduleBlock && moduleBlock[0].includes('documentation: {')) {
    console.log(`   ⏭️  Ya tiene sección de documentation, saltando...`);
    return;
  }

  // Determinar si este módulo ya está completado
  const isCompleted = moduleKey === 'vendorsCommissions';

  // Buscar el patrón: moduleKey: { ... lastUpdated: "fecha"
  // Insertamos la sección documentation después de lastUpdated
  const modulePattern = new RegExp(
    `(${moduleKey}:\\s*\\{[\\s\\S]*?lastUpdated:\\s*"[^"]*")`,
    'g'
  );

  const matches = content.match(modulePattern);

  if (matches && matches.length > 0) {
    // Encontramos el módulo
    const docSection = generateDocumentationSection(moduleKey, isCompleted);

    // Insertar después de lastUpdated
    const insertPattern = new RegExp(
      `(${moduleKey}:\\s*\\{[\\s\\S]*?lastUpdated:\\s*"[^"]*")`
    );

    content = content.replace(insertPattern, `$1,${docSection}`);

    console.log(`   ✅ Agregada sección de documentation`);
    modulesUpdated++;
  } else {
    console.log(`   ⚠️  No se encontró patrón para este módulo`);
  }
});

// Guardar archivo actualizado
fs.writeFileSync(metadataPath, content, 'utf8');

console.log(`\n✅ COMPLETADO:`);
console.log(`   - Módulos procesados: ${modules.length}`);
console.log(`   - Módulos actualizados: ${modulesUpdated}`);
console.log(`   - Módulos con documentación completa: 1 (vendorsCommissions)`);
console.log(`   - Módulos pendientes de documentar: ${modulesUpdated - 1}`);
console.log(`\n📁 Archivo actualizado: ${metadataPath}`);
console.log(`\n📚 Próximos pasos:`);
console.log(`   1. Revisar engineering-metadata.js para verificar los cambios`);
console.log(`   2. Para cada módulo, crear archivo docs/modules/[MODULE-NAME]-MODULE.md`);
console.log(`   3. Usar template: docs/templates/MODULE-DOCUMENTATION-TEMPLATE.md`);
console.log(`   4. Marcar las tareas como done: true conforme se completen`);
console.log(`\n✨ Las tareas de documentación ahora son visibles en el Engineering Dashboard`);
