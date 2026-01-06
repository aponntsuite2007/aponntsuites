/**
 * FIX 17 - UNCLOSED BRACES FINDER
 * Encuentra las llaves sin cerrar línea por línea
 */

const fs = require('fs');

const html = fs.readFileSync('./public/panel-empresa.html', 'utf8');

// Extraer el script problemático (Script 5, línea 1235)
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptIndex = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  scriptIndex++;

  if (scriptIndex === 5) {
    const scriptContent = match[1];
    const startPos = match.index;
    const linesBeforeScript = html.substring(0, startPos).split('\n').length;

    console.log('\n🔍 ANALIZANDO SCRIPT 5 LÍNEA POR LÍNEA\n');
    console.log('Mostrando líneas donde el balance de llaves se INCREMENTA o hay funciones:\n');

    const lines = scriptContent.split('\n');
    let braceBalance = 0;
    let lastFunctionName = null;

    lines.forEach((line, idx) => {
      const lineNum = linesBeforeScript + idx + 1;
      const scriptLine = idx + 1;

      // Contar llaves en esta línea
      const openCount = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;

      braceBalance += (openCount - closeCount);

      // Detectar funciones
      const funcMatch = line.match(/function\s+(\w+)\s*\(/);
      if (funcMatch) {
        lastFunctionName = funcMatch[1];
      }

      // Mostrar solo líneas relevantes
      if (openCount > 0 || closeCount > 0 || funcMatch || scriptLine <= 120) {
        const indicator = braceBalance > 0 ? `[${'+'.repeat(braceBalance)}]` : '[✓]';
        const funcInfo = funcMatch ? ` 📍 FUNCTION: ${lastFunctionName}()` : '';
        console.log(`${indicator} ${lineNum}: ${line.trim()}${funcInfo}`);
      }

      // Alertar si el balance es muy alto
      if (braceBalance > 5) {
        console.log(`   ⚠️  Balance muy alto: ${braceBalance} llaves sin cerrar`);
      }
    });

    console.log(`\n🎯 BALANCE FINAL: ${braceBalance} llaves sin cerrar`);

    if (braceBalance > 0) {
      console.log(`\n❌ PROBLEMA: Hay ${braceBalance} llaves '{' que nunca se cerraron con '}'`);
      console.log(`💡 SOLUCIÓN: Agregar ${braceBalance} llaves de cierre '}'`);
    }

    break;
  }
}
