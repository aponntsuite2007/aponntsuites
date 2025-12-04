const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrigiendo línea 2478 con comillas TIPOGRÁFICAS...');

// IMPORTANTE: El archivo tiene comillas tipográficas/curvas ' ' en vez de ASCII ' '
// Pattern actual (con comillas tipográficas)
const oldPattern = `openCloseCaseModal('\${c.id}', '\${c.employee_name || 'N/A'}')`;
// Pattern correcto (con comillas dobles ASCII)
const newPattern = `openCloseCaseModal('\${c.id}', '\${c.employee_name || "N/A"}')`;

console.log('   Buscando patrón con comillas tipográficas...');
const before = content.includes(oldPattern);
console.log(`   Patrón problemático existe: ${before}`);

if (before) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, 'utf8');

    // Verificar
    const after = fs.readFileSync(filePath, 'utf8').includes(newPattern);
    console.log(`   Patrón correcto insertado: ${after}`);
    console.log('✅ [FIX] Línea 2478 corregida exitosamente');
} else {
    console.log('⚠️  [FIX] Patrón no encontrado con comillas tipográficas');

    // Mostrar muestra de la línea para debug
    const lines = content.split('\n');
    const line2478 = lines[2477]; // array es 0-indexed
    if (line2478) {
        console.log('\n📄 Contenido de línea 2478 (primeros 150 chars):');
        console.log(line2478.substring(0, 150));

        // Mostrar códigos de caracteres de las comillas
        const sample = line2478.substring(50, 100);
        console.log('\n🔍 Códigos de caracteres en sample:');
        for (let i = 0; i < sample.length; i++) {
            const char = sample[i];
            if (char === "'" || char === "'" || char === "'" || char === '"') {
                console.log(`   Posición ${i}: "${char}" = U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
            }
        }
    }
}
