const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando FIX al translation-system-v4.js...\n');

const filePath = path.join(__dirname, '../public/js/translation-system-v4.js');
let content = fs.readFileSync(filePath, 'utf8');

// Patrón a buscar y reemplazar (TODAS las ocurrencias)
const oldPattern = /element\.textContent = translation;/g;

const newCode = `// SMART FIX: Detectar HTML y usar innerHTML para preservar tags
            if (/<[^>]+>/.test(translation)) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }`;

// Contar cuántas veces aparece
const matches = content.match(oldPattern);
console.log(`📊 Encontradas ${matches ? matches.length : 0} ocurrencias de "element.textContent = translation;"`);

// Reemplazar
content = content.replace(oldPattern, newCode);

// Guardar
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Archivo modificado correctamente');
console.log('📝 Cambio aplicado: textContent → innerHTML (cuando hay HTML)\n');

// Verificar
const verificacion = fs.readFileSync(filePath, 'utf8');
const nuevasOcurrencias = (verificacion.match(/SMART FIX/g) || []).length;
console.log(`✅ Verificación: ${nuevasOcurrencias} SMART FIX agregados\n`);
