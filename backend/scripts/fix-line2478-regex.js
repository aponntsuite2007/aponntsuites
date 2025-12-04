const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrigiendo línea 2478 usando REGEX...');

// Usar regex para buscar el patrón:
// Busca: || 'N/A'
// En el contexto de: employee_name || 'N/A'
// Y reemplaza por: || "N/A"

const before = content;

// Pattern: buscar || 'N/A' y reemplazar por || "N/A"
// Solo en el contexto de openCloseCaseModal
content = content.replace(
    /(openCloseCaseModal\([^)]+employee_name \|\| )'N\/A'/g,
    `$1"N/A"`
);

const changed = before !== content;

if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ [FIX] Línea corregida exitosamente');
    console.log('   Patrón cambiado: || \'N/A\' → || "N/A"');
} else {
    console.log('⚠️  [FIX] No se encontró el patrón para cambiar');
    console.log('   El archivo podría ya estar corregido o el patrón es diferente');

    // Buscar si existe alguna llamada a openCloseCaseModal
    const hasCalls = /openCloseCaseModal/.test(content);
    console.log(`   Tiene llamadas a openCloseCaseModal: ${hasCalls}`);

    if (hasCalls) {
        // Extraer la primera llamada para debug
        const match = content.match(/openCloseCaseModal\([^)]+\)/);
        if (match) {
            console.log('\n📄 Primera llamada encontrada:');
            console.log(match[0]);
        }
    }
}
