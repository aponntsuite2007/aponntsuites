const fs = require('fs');
const path = require('path');

console.log('🔧 Reemplazando función renderCompaniesTable con diseño Enterprise...\n');

// Leer el archivo HTML
const htmlPath = path.join(__dirname, 'public', 'panel-administrativo.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Leer la nueva función
const newFunctionPath = path.join(__dirname, 'new-render-function.txt');
const newFunction = fs.readFileSync(newFunctionPath, 'utf8');

// Patrón regex para encontrar la función completa (desde function hasta el cierre)
// Buscar desde "function renderCompaniesTable()" hasta el siguiente "}" al nivel correcto
const functionPattern = /function renderCompaniesTable\(\) \{[\s\S]*?\n        \}\n/;

// Verificar que encontramos la función
const match = content.match(functionPattern);
if (!match) {
    console.error('❌ No se pudo encontrar la función renderCompaniesTable');
    process.exit(1);
}

console.log('✅ Función encontrada, tamaño:', match[0].length, 'caracteres');
console.log('📝 Reemplazando con nueva función Enterprise...\n');

// Reemplazar
content = content.replace(functionPattern, newFunction + '\n');

// Guardar
fs.writeFileSync(htmlPath, content, 'utf8');

console.log('✅ Reemplazo completado exitosamente');
console.log('📄 Archivo actualizado:', htmlPath);
console.log('\n🎨 Nuevo diseño: Bloomberg/SAP Fiori Style');
console.log('🚀 Reinicia el servidor para ver los cambios\n');
