const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/modules/attendance.js');

console.log('📝 Leyendo attendance.js...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔄 Reemplazando localStorage.getItem("token") por authToken fallback...');
content = content.replace(
  /localStorage\.getItem\('token'\)/g,
  "localStorage.getItem('authToken') || localStorage.getItem('token')"
);

console.log('💾 Guardando cambios...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Cambio completado!');
console.log('   Ahora attendance.js usará authToken (login actual) como prioridad');
console.log('   y fallback a token para compatibilidad');
