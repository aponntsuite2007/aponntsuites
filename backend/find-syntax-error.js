/**
 * FIX 16 - SYNTAX ERROR FINDER
 * Encuentra el script inline con error de sintaxis en panel-empresa.html
 */

const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('./public/panel-empresa.html', 'utf8');

// Extraer TODOS los scripts inline
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptIndex = 0;
let foundError = false;

console.log('🔍 Analizando scripts inline en panel-empresa.html...\n');

while ((match = scriptRegex.exec(html)) !== null) {
  const scriptContent = match[1];
  const startPos = match.index;

  // Calcular línea aproximada
  const linesBeforeScript = html.substring(0, startPos).split('\n').length;

  scriptIndex++;

  try {
    // Intentar parsear el script
    new vm.Script(scriptContent);
    console.log(`✅ Script ${scriptIndex} (línea ~${linesBeforeScript}): OK`);
  } catch (error) {
    console.log(`\n❌❌❌ ERROR ENCONTRADO ❌❌❌`);
    console.log(`📍 Script ${scriptIndex} (comienza en línea ${linesBeforeScript})`);
    console.log(`📜 Error: ${error.message}`);
    console.log(`🔍 Línea del error: ${error.stack.split('\n')[0]}`);
    console.log(`\n📄 CONTENIDO ALREDEDOR DEL ERROR:`);
    console.log('─'.repeat(80));
    const lines = scriptContent.split('\n');
    const errorLineMatch = error.stack.match(/:(\d+):/);
    const errorLineInScript = errorLineMatch ? parseInt(errorLineMatch[1]) - 1 : 0;

    const start = Math.max(0, errorLineInScript - 5);
    const end = Math.min(lines.length, errorLineInScript + 10);

    lines.slice(start, end).forEach((line, idx) => {
      const lineNum = linesBeforeScript + start + idx + 1;
      const actualScriptLine = start + idx + 1;
      const marker = actualScriptLine === errorLineInScript + 1 ? '>>> ' : '    ';
      console.log(`${marker}${lineNum} (script:${actualScriptLine}): ${line}`);
    });
    console.log('─'.repeat(80));

    // Contar paréntesis/llaves/corchetes hasta la línea del error
    console.log(`\n🔍 ANÁLISIS DE BALANCE DE SÍMBOLOS hasta línea ${errorLineInScript + 1}:`);
    let openParen = 0, closeParen = 0;
    let openBrace = 0, closeBrace = 0;
    let openBracket = 0, closeBracket = 0;

    lines.slice(0, errorLineInScript + 1).forEach((line, idx) => {
      // Ignorar strings y comentarios (simple)
      const cleaned = line.replace(/'.*?'/g, '').replace(/".*?"/g, '').replace(/`.*?`/g, '').replace(/\/\/.*$/g, '');

      openParen += (cleaned.match(/\(/g) || []).length;
      closeParen += (cleaned.match(/\)/g) || []).length;
      openBrace += (cleaned.match(/\{/g) || []).length;
      closeBrace += (cleaned.match(/\}/g) || []).length;
      openBracket += (cleaned.match(/\[/g) || []).length;
      closeBracket += (cleaned.match(/\]/g) || []).length;
    });

    console.log(`   Paréntesis:  ( ${openParen}  vs  ) ${closeParen}  → Balance: ${openParen - closeParen}`);
    console.log(`   Llaves:      { ${openBrace}  vs  } ${closeBrace}  → Balance: ${openBrace - closeBrace}`);
    console.log(`   Corchetes:   [ ${openBracket}  vs  ] ${closeBracket}  → Balance: ${openBracket - closeBracket}`);

    foundError = true;
    break;
  }
}

if (!foundError) {
  console.log('\n✅ Todos los scripts inline están OK');
  console.log('⚠️  El error debe estar en un script EXTERNO (.js)');
}
