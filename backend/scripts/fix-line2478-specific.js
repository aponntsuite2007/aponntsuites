const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrección ESPECÍFICA de línea 2478...');

// El problema EXACTO es esta secuencia:
// '${c.employee_name || 'N/A'}'
// Las comillas simples de 'N/A' crean conflicto

// Patrón SUPER específico: buscar el contexto exacto de la línea problemática
const regex = /openCloseCaseModal\('\$\{c\.id\}', '\$\{c\.employee_name \|\| 'N\/A'\}'\)/g;
const replacement = "openCloseCaseModal('\\${c.id}', '\\${c.employee_name || \"N/A\"}')";

console.log('📋 Patrón regex a buscar:');
console.log('   /openCloseCaseModal\\(\'\\$\\{c\\.id\\}\', \'\\$\\{c\\.employee_name \\|\\| \'N\\/A\'\\}\'\\)/g');

const before = content;
const matches = content.match(regex);

if (matches) {
    console.log(`✅ Encontrado ${matches.length} match(es):`);
    matches.forEach((m, i) => console.log(`   ${i + 1}. ${m.substring(0, 80)}...`));

    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');

    console.log('\n✅ [FIX] Archivo corregido exitosamente');
    console.log('   Comillas simples \'N/A\' → comillas dobles "N/A"');
} else {
    console.log('⚠️  No se encontraron matches con este regex');

    // Buscar pattern más simple para debug
    const simplePattern = /employee_name \|\| 'N\/A'/;
    const simpleMatch = content.match(simplePattern);

    if (simpleMatch) {
        console.log('\n🔍 Encontrado patrón simplificado:');
        console.log(simpleMatch[0]);

        // Mostrar contexto alrededor del match
        const index = content.indexOf(simpleMatch[0]);
        const context = content.substring(index - 50, index + 100);
        console.log('\n📄 Contexto:');
        console.log(context);
    } else {
        console.log('\n⚠️  Ni siquiera el patrón simple se encontró');
        console.log('   Buscando: employee_name || \'N/A\'');

        // Ultimo intento: buscar "N/A" a secas
        const naPattern = /'N\/A'/g;
        const naMatches = content.match(naPattern);
        if (naMatches) {
            console.log(`\n   Encontradas ${naMatches.length} instancias de 'N/A' en el archivo`);
        }
    }
}
