/**
 * Script para actualizar estado de tareas PP-7-IMPL-1 y PP-7-IMPL-2 en engineering-metadata.js
 */
const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

// Leer archivo
let content = fs.readFileSync(metadataPath, 'utf8');

// Buscar y actualizar PP-7-IMPL-1
content = content.replace(
  /(\{\s*id:\s*['"]PP-7-IMPL-1['"],[^}]*status:\s*['"])AVAILABLE(['"][^}]*\})/gs,
  '$1DONE$2'
);

// Buscar y actualizar PP-7-IMPL-2
content = content.replace(
  /(\{\s*id:\s*['"]PP-7-IMPL-2['"],[^}]*status:\s*['"])AVAILABLE(['"][^}]*\})/gs,
  '$1DONE$2'
);

// Agregar completedDate a PP-7-IMPL-1 y PP-7-IMPL-2
const today = new Date().toISOString().split('T')[0];

// PP-7-IMPL-1
content = content.replace(
  /(id:\s*['"]PP-7-IMPL-1['"],\s*name:[^,]+,)/g,
  `$1 completedDate: '${today}',`
);

// PP-7-IMPL-2
content = content.replace(
  /(id:\s*['"]PP-7-IMPL-2['"],\s*name:[^,]+,)/g,
  `$1 completedDate: '${today}',`
);

// Guardar archivo
fs.writeFileSync(metadataPath, content, 'utf8');

console.log('✅ Actualizado engineering-metadata.js:');
console.log('   - PP-7-IMPL-1: status -> DONE');
console.log('   - PP-7-IMPL-2: status -> DONE');
console.log('   - completedDate: ' + today);
