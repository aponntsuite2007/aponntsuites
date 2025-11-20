/**
 * Script para insertar secciones help en líneas específicas
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');
const helpSectionsPath = path.join(__dirname, '../workflows-help-sections.js');

console.log('📝 Insertando secciones help en engineering-metadata.js...\n');

// Leer archivo línea por línea
const lines = fs.readFileSync(metadataPath, 'utf8').split('\n');
const helpSections = require(helpSectionsPath);

console.log(`Total líneas: ${lines.length}`);

// Función para convertir help object a string con indentación correcta
function helpToString(helpObj, indent = '      ') {
  const result = [];
  result.push(`${indent}help: {`);

  // quickStart (usando template literal)
  result.push(`${indent}  quickStart: \`${helpObj.quickStart}\`,`);

  // commonIssues (usando JSON.stringify para escapar correctamente)
  result.push(`${indent}  commonIssues: ${JSON.stringify(helpObj.commonIssues, null, 10).replace(/\n/g, '\n' + indent + '  ')},`);

  // Arrays simples
  result.push(`${indent}  requiredRoles: ${JSON.stringify(helpObj.requiredRoles)},`);
  result.push(`${indent}  requiredModules: ${JSON.stringify(helpObj.requiredModules)},`);
  result.push(`${indent}  relatedEndpoints: ${JSON.stringify(helpObj.relatedEndpoints)},`);
  result.push(`${indent}  codeFiles: ${JSON.stringify(helpObj.codeFiles)}`);

  result.push(`${indent}},\n`);

  return result.join('\n');
}

// Definir inserciones (línea después de lastUpdated)
const insertions = [
  { line: 1314, workflow: 'contractModification' },
  { line: 1377, workflow: 'monthlyInvoicing' },
  { line: 1479, workflow: 'monthlyCommissionLiquidation' },
  { line: 1540, workflow: 'walletChangeConfirmation' },
  { line: 1605, workflow: 'vendorOnboarding' },
  { line: 1675, workflow: 'companyModulesChange' }
];

// Ordenar de mayor a menor para insertar de abajo hacia arriba
insertions.sort((a, b) => b.line - a.line);

let modificationsCount = 0;

insertions.forEach(({ line, workflow }) => {
  const lineIndex = line - 1; // Arrays son 0-indexed

  console.log(`\n${modificationsCount + 1}. Procesando ${workflow} (línea ${line})...`);

  // Verificar que la línea contiene lastUpdated
  if (!lines[lineIndex].includes('lastUpdated')) {
    console.log(`   ❌ Línea ${line} no contiene 'lastUpdated' - saltando`);
    return;
  }

  // Verificar que no tenga ya un help
  if (lines[lineIndex + 1] && lines[lineIndex + 1].includes('help:')) {
    console.log(`   ⏭️  Ya tiene help section - saltando`);
    return;
  }

  // Generar string del help
  const helpString = helpToString(helpSections[workflow].help);

  // Cambiar la línea para agregar coma al final
  lines[lineIndex] = lines[lineIndex].replace('"2025-01-19T18:30:00Z"', '"2025-01-19T18:30:00Z",');

  // Insertar help después de lastUpdated (antes del cierre del objeto)
  lines.splice(lineIndex + 1, 0, '', helpString);

  modificationsCount++;
  console.log(`   ✅ Help section insertada`);
});

if (modificationsCount > 0) {
  // Guardar archivo
  const newContent = lines.join('\n');
  fs.writeFileSync(metadataPath, newContent, 'utf8');

  console.log(`\n✅ COMPLETADO! ${modificationsCount}/6 secciones help insertadas.`);
  console.log(`📁 Archivo actualizado: ${metadataPath}`);
} else {
  console.log('\n⚠️  No se realizaron cambios');
}

console.log('\n🎯 PRÓXIMO PASO: Ejecutar comando "actualiza ingenieria"');
