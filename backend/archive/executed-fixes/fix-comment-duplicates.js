const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let lines = fs.readFileSync(serverPath, 'utf8').split('\n');

console.log('📋 Líneas ANTES de fix:');
console.log(`  1282: "${lines[1281]}"`);
console.log(`  1283: "${lines[1282]}"`);
console.log(`  1284: "${lines[1283]}"`);
console.log(`  1401: "${lines[1400]}"`);
console.log(`  1402: "${lines[1401]}"`);
console.log(`  1403: "${lines[1402]}"`);

// Eliminar línea 1283 (índice 1282) - duplicado de apertura
lines.splice(1282, 1);
console.log('\n✅ Eliminada línea 1283 (duplicado de apertura)');

// Ahora línea 1402 es índice 1400 (porque eliminamos una línea)
lines.splice(1400, 1);
console.log('✅ Eliminada línea 1402 (duplicado de cierre)');

fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');

console.log('\n📋 Líneas DESPUÉS de fix:');
lines = fs.readFileSync(serverPath, 'utf8').split('\n');
console.log(`  1282: "${lines[1281]}"`);
console.log(`  1283: "${lines[1282]}"`);
console.log(`  1400: "${lines[1399]}"`);
console.log(`  1401: "${lines[1400]}"`);

console.log('\n✅ Duplicados eliminados exitosamente');
