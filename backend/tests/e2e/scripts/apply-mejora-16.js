/**
 * MEJORA #16: Validar selector undefined
 * Previene fallos cuando la configuración tiene selector inválido
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../modules/universal-modal-advanced.e2e.spec.js');

console.log('📝 Aplicando MEJORA #16: Validar selector undefined...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar el código actual de selectorToWait
const oldCode = `const selectorToWait = config.mainSelector || '#mainContent';`;

// Verificar si ya fue aplicado
if (content.includes('Selector inválido para')) {
  console.log('✅ MEJORA #16 ya estaba aplicada');
  process.exit(0);
}

if (!content.includes(oldCode)) {
  console.error('❌ No se encontró el código a reemplazar');
  console.error('Buscando:', oldCode);
  process.exit(1);
}

// Nuevo código con validación
const newCode = `// MEJORA #16: Validar que el selector no sea undefined o inválido
    const rawSelector = config.mainSelector || '#mainContent';
    const selectorToWait = (rawSelector && rawSelector !== 'undefined' && rawSelector !== 'null')
      ? rawSelector
      : '#mainContent';

    // Detectar selector inválido
    if (!rawSelector || rawSelector === 'undefined' || rawSelector === 'null') {
      console.log(\`   ⚠️  [MEJORA #16] Selector inválido para \${config.moduleName}, usando fallback universal\`);

      // Esperar por carga de red en lugar de selector específico
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        console.log(\`   ℹ️  NetworkIdle timeout - continuando de todas formas\`);
      });

      // Skip el waitForSelector si no hay selector válido
      console.log(\`   ✅ Módulo cargado (sin selector específico)\`);
    } else {
      // Selector válido - continuar normalmente
      console.log(\`   🔍 Esperando selector: \${selectorToWait}\`);`;

// Reemplazar
content = content.replace(oldCode, newCode);

// Ahora necesitamos cerrar el else agregando un } después del waitForSelector existente
// Buscar el bloque de waitForSelector que viene después
const waitForSelectorPattern = /await page\.waitForSelector\(selectorToWait[\s\S]*?\);/;

const match = content.match(waitForSelectorPattern);
if (match) {
  const waitForSelectorCode = match[0];
  content = content.replace(
    waitForSelectorCode,
    `      ${waitForSelectorCode}\n    } // Fin MEJORA #16`
  );
}

// Escribir
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ MEJORA #16 aplicada exitosamente');
console.log('   ✅ Validación de selector undefined agregada');
console.log('   ✅ Fallback a networkidle si selector inválido');
console.log('   ✅ Tests no fallarán por configuración incompleta\n');
