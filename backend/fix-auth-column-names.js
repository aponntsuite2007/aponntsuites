const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/authRoutes.js');

console.log('🔧 Corrigiendo nombres de columnas en authRoutes.js...\n');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// Contar ocurrencias antes
const beforeCount = (content.match(/is_active/g) || []).length;
console.log(`❌ Encontradas ${beforeCount} ocurrencias de "is_active"`);

// Reemplazar is_active con "isActive" (con comillas porque es camelCase en PostgreSQL)
content = content.replace(/is_active/g, '"isActive"');

// Contar ocurrencias después
const afterCount = (content.match(/is_active/g) || []).length;
console.log(`✅ Quedan ${afterCount} ocurrencias de "is_active"`);

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Archivo corregido exitosamente!');
console.log('📝 Ahora reiniciá el servidor para aplicar los cambios:\n');
console.log('   1. Encontrá el PID: netstat -ano | findstr :9993');
console.log('   2. Matá el proceso: taskkill /F /PID <PID>');
console.log('   3. Iniciá de nuevo: PORT=9993 npm start\n');
console.log('O simplemente reiniciá Claude Code si querés.\n');
