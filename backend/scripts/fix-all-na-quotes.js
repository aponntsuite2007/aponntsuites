const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Reemplazando TODAS las comillas simples de N/A por comillas dobles...');

const before = content;

// Estrategia simple: reemplazar || 'N/A' por || "N/A" en TODO el archivo
// Esto es seguro porque 'N/A' es siempre un fallback y no afecta lógica

content = content.replace(/\|\| 'N\/A'/g, '|| "N/A"');

const changed = before !== content;

if (changed) {
    const matches = before.match(/\|\| 'N\/A'/g) || [];
    console.log(`✅ Reemplazadas ${matches.length} ocurrencias`);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ [FIX] Archivo guardado exitosamente');
    console.log('   Patrón: || \'N/A\' → || "N/A" (GLOBAL)');

    // Verificar que ya no hay ocurrencias
    const remaining = content.match(/\|\| 'N\/A'/g);
    console.log(`   Ocurrencias restantes: ${remaining ? remaining.length : 0}`);
} else {
    console.log('⚠️  No se encontraron ocurrencias de || \'N/A\'');
    console.log('   El archivo podría ya estar corregido');
}
