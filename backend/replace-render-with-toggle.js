const fs = require('fs');
const path = require('path');

console.log('🔧 Actualizando renderCompaniesTable con sistema de toggle...\n');

const htmlPath = path.join(__dirname, 'public', 'panel-administrativo.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const newFunctionPath = path.join(__dirname, 'updated-render-with-toggle.txt');
const newFunction = fs.readFileSync(newFunctionPath, 'utf8');

// Buscar y reemplazar la función actual
const functionPattern = /function renderCompaniesTable\(\) \{[\s\S]*?\n        \}\n/;

const match = content.match(functionPattern);
if (!match) {
    console.error('❌ No se pudo encontrar la función renderCompaniesTable');
    process.exit(1);
}

console.log('✅ Función encontrada');
console.log('📝 Reemplazando con versión con toggle...\n');

content = content.replace(functionPattern, newFunction + '\n');

fs.writeFileSync(htmlPath, content, 'utf8');

console.log('✅ Reemplazo completado');
console.log('🎨 Ahora soporta toggle Grid/Table\n');
