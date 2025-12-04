const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrigiendo línea 2478 con comillas anidadas...');

// Pattern actual (con comillas simples en N/A)
const oldPattern = `openCloseCaseModal('\${c.id}', '\${c.employee_name || 'N/A'}')`;
// Pattern correcto (con comillas dobles escapadas en N/A)
const newPattern = `openCloseCaseModal('\${c.id}', '\${c.employee_name || "N/A"}')`;

const before = content.includes(oldPattern);
console.log(`   Patrón problemático existe: ${before}`);

if (before) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');

    // Verificar
    const after = fs.readFileSync(filePath, 'utf8').includes(newPattern);
    console.log(`   Patrón correcto insertado: ${after}`);
    console.log('✅ [FIX] Línea 2478 corregida exitosamente');
} else {
    console.log('⚠️  [FIX] Patrón no encontrado - quizás ya está corregido');
    console.log('   Verificando si ya tiene el patrón correcto...');
    const hasCorrectPattern = content.includes(newPattern);
    console.log(`   Ya corregido: ${hasCorrectPattern}`);
}
