const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
const lines = fs.readFileSync(serverPath, 'utf8').split('\n');

// Insertar /* antes de línea 1282 (índice 1281)
lines.splice(1281, 0, '/* COMENTADO - Endpoint duplicado que interceptaba userRoutes.js');

// Insertar */ después de línea 1399 (ahora es índice 1400 porque agregamos una línea)
lines.splice(1401, 0, '*/ // FIN endpoint duplicado');

fs.writeFileSync(serverPath, lines.join('\n'), 'utf8');
console.log('✅ Endpoint duplicado comentado exitosamente');
console.log('   Líneas 1282-1399 ahora están comentadas');
