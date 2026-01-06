/**
 * FIX 19 - ACORN PARSER
 * Usa Acorn para identificar EXACTAMENTE dónde está el error de sintaxis
 */

const fs = require('fs');
const acorn = require('acorn');

const scriptContent = fs.readFileSync('/tmp/script5.js', 'utf8');

console.log('🔍 Parseando script5.js con Acorn...\n');

try {
  acorn.parse(scriptContent, {
    ecmaVersion: 2022,
    locations: true,
    allowAwaitOutsideFunction: true
  });

  console.log('✅ ÉXITO: El script no tiene errores de sintaxis');
} catch (error) {
  console.log('❌ ERROR DE SINTAXIS ENCONTRADO:\n');
  console.log(`   Línea: ${error.loc.line}`);
  console.log(`   Columna: ${error.loc.column}`);
  console.log(`   Mensaje: ${error.message}`);

  // Mostrar el contexto alrededor del error
  const lines = scriptContent.split('\n');
  const errorLine = error.loc.line - 1;
  const start = Math.max(0, errorLine - 5);
  const end = Math.min(lines.length, errorLine + 5);

  console.log(`\n📄 CONTEXTO (líneas ${start + 1}-${end}):`);
  console.log('─'.repeat(80));
  for (let i = start; i < end; i++) {
    const marker = i === errorLine ? '>>> ' : '    ';
    const lineNum = String(i + 1).padStart(4, ' ');
    console.log(`${marker}${lineNum}: ${lines[i]}`);
  }
  console.log('─'.repeat(80));
}
