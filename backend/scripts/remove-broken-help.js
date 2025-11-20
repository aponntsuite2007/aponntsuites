/**
 * Script para remover las secciones help rotas y restaurar el archivo
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

console.log('🔧 Removiendo secciones help rotas...\n');

// Leer archivo
let content = fs.readFileSync(metadataPath, 'utf8');
const originalLength = content.length;

// Buscar y remover bloques help: { ... }, entre lastUpdated y el cierre del workflow
// Patrón: lastUpdated: "...", \n\n help: { ... },
const helpBlockPattern = /(lastUpdated: "2025-01-19T18:30:00Z"),\s*\n\s*help: \{[\s\S]*?\n\s*\},\s*\n/g;

content = content.replace(helpBlockPattern, '$1\n');

const removed = originalLength !== content.length;

if (removed) {
  fs.writeFileSync(metadataPath, content, 'utf8');
  console.log('✅ Secciones help removidas');
  console.log(`   Tamaño original: ${originalLength} bytes`);
  console.log(`   Tamaño nuevo: ${content.length} bytes`);
  console.log(`   Diferencia: ${originalLength - content.length} bytes\n`);
} else {
  console.log('⚠️  No se encontraron secciones help para remover\n');
}

console.log('🎯 PRÓXIMO PASO: Ejecutar insert-help-at-lines.js con la versión corregida');
