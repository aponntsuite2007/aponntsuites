const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');

console.log('📝 Leyendo server.js...');
let content = fs.readFileSync(filePath, 'utf8');

const searchString = 'LEFT JOIN departments d ON u."departmentId" = CAST(d.id AS TEXT)';
const replaceString = 'LEFT JOIN departments d ON CAST(u."departmentId" AS INTEGER) = d.id';

if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fix aplicado exitosamente!');
    console.log('✅ Corregido el tipo de dato en el JOIN:');
    console.log('   ❌ Antes: u."departmentId" = CAST(d.id AS TEXT)');
    console.log('   ✅ Ahora:  CAST(u."departmentId" AS INTEGER) = d.id');
} else if (content.includes(replaceString)) {
    console.log('⚠️  El fix ya está aplicado');
} else {
    console.log('❌ No se encontró el string a reemplazar');
}
