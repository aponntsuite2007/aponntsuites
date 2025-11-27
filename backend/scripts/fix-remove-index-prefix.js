const fs = require('fs');
const path = require('path');

console.log('\n🔧 Eliminando prefijo "index." de todos los data-translate...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Reemplazar TODOS los data-translate="index.xxx" por data-translate="xxx"
const replaced = content.replace(/data-translate="index\./g, 'data-translate="');

// Contar cambios
const matches = (content.match(/data-translate="index\./g) || []).length;

fs.writeFileSync(indexPath, replaced, 'utf8');

console.log(`✅ ${matches} data-translate actualizados`);
console.log('   ANTES: data-translate="index.desc_sistema_integral"');
console.log('   AHORA: data-translate="desc_sistema_integral"');
console.log('\n🎯 Ahora el sistema buscará directamente en el JSON raíz\n');
