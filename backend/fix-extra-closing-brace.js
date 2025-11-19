const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let lines = fs.readFileSync(serverPath, 'utf8').split('\n');

console.log('📋 Líneas ANTES de fix:');
console.log(`  1399: "${lines[1398]}"`);
console.log(`  1400: "${lines[1399]}"`);
console.log(`  1401: "${lines[1400]}"`);
console.log(`  1402: "${lines[1401]}"`);

// Eliminar línea 1401 (índice 1400) - cierre de llave extra que quedó fuera del comentario
lines.splice(1400, 1);
console.log('\n✅ Eliminada línea 1401 (cierre de llave extra)');

fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');

console.log('\n📋 Líneas DESPUÉS de fix:');
lines = fs.readFileSync(serverPath, 'utf8').split('\n');
console.log(`  1399: "${lines[1398]}"`);
console.log(`  1400: "${lines[1399]}"`);
console.log(`  1401: "${lines[1400]}"`);

console.log('\n✅ Cierre de llave extra eliminado exitosamente');
