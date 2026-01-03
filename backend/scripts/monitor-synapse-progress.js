/**
 * MONITOR DE PROGRESO EN TIEMPO REAL - SYNAPSE
 */

const fs = require('fs');
const path = require('path');

const SYNAPSE_LOG = path.join(__dirname, '..', 'SYNAPSE-FIX-CYCLE.md');

function parseLog() {
  if (!fs.existsSync(SYNAPSE_LOG)) {
    return { modules: 0, passed: 0, failed: 0, current: null, passRate: 0 };
  }

  const content = fs.readFileSync(SYNAPSE_LOG, 'utf8');
  const lines = content.split('\n');

  let modules = 0;
  let passed = 0;
  let failed = 0;
  let current = null;

  // Contar módulos completados
  const moduleMatches = content.match(/## \d+\. /g);
  modules = moduleMatches ? moduleMatches.length : 0;

  // Contar PASSED y FAILED
  for (const line of lines) {
    if (line.includes('**Status**: PASSED')) passed++;
    if (line.includes('**Status**: FAILED')) failed++;
  }

  // Encontrar módulo actual
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/## \d+\. (.+?) \(Intento \d+\)/);
    if (match) {
      current = match[1];
      break;
    }
  }

  const passRate = modules > 0 ? Math.round((passed / modules) * 100) : 0;

  return { modules, passed, failed, current, passRate };
}

const stats = parseLog();

console.log('═'.repeat(70));
console.log('🎯 SYNAPSE - PROGRESO ACTUAL');
console.log('═'.repeat(70));
console.log(`📊 Módulos testeados: ${stats.modules}/63`);
console.log(`✅ PASSED: ${stats.passed} (${stats.passRate}%)`);
console.log(`❌ FAILED: ${stats.failed}`);
if (stats.current) {
  console.log(`🔧 Módulo actual: ${stats.current}`);
}
console.log('═'.repeat(70));
