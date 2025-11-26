/**
 * Script para actualizar el engineering-metadata.js con el sistema de comisiones completado
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

console.log('📝 Actualizando engineering-metadata.js...\n');

// Leer archivo
let content = fs.readFileSync(metadataPath, 'utf8');

// 1. Actualizar lastUpdated del proyecto
const today = new Date().toISOString();
content = content.replace(
  /lastUpdated: ".*?",(\s*\/\/ Phase4)/,
  `lastUpdated: "${today}",$ 1`
);

// 2. Agregar cambio a latestChanges
const newChange = `"✅ SISTEMA DE COMISIONES PIRAMIDALES: 100% COMPLETO - Base de datos + Servicios + API REST + Documentación"`;

content = content.replace(
  /(latestChanges: \[)/,
  `$1\n      ${newChange},`
);

// 3. Actualizar phase1_vendorHierarchy a 100% completado
content = content.replace(
  /phase1_vendorHierarchy: \{[\s\S]*?status: "IN_PROGRESS",/,
  (match) => match.replace('IN_PROGRESS', 'COMPLETED')
);

content = content.replace(
  /(phase1_vendorHierarchy: \{[\s\S]*?)progress: 40,/,
  '$1progress: 100,'
);

// 4. Marcar todas las tareas VH como completadas
for (let i = 1; i <= 19; i++) {
  const taskId = `VH-${i}`;
  const regex = new RegExp(`{ id: "${taskId}", name: "(.*?)", done: false`, 'g');
  content = content.replace(regex, `{ id: "${taskId}", name: "$1", done: true, completedDate: "${today.split('T')[0]}"`);
}

// 5. Agregar fecha de completación
content = content.replace(
  /(phase1_vendorHierarchy: \{[\s\S]*?estimatedCompletion: "2025-01-26",)/,
  `$1\n      actualCompletion: "${today.split('T')[0]}",`
);

// Escribir archivo actualizado
fs.writeFileSync(metadataPath, content, 'utf8');

console.log('✅ Metadata actualizado exitosamente:');
console.log('   - lastUpdated actualizado');
console.log('   - Agregado cambio a latestChanges');
console.log('   - phase1_vendorHierarchy: status = COMPLETED');
console.log('   - phase1_vendorHierarchy: progress = 100%');
console.log('   - Todas las tareas VH-1 a VH-19 marcadas como done: true');
console.log('   - actualCompletion agregado');
console.log('\n✅ ENGINEERING METADATA ACTUALIZADO\n');
