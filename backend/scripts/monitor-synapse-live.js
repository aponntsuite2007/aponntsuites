/**
 * MONITOR EN VIVO - SYNAPSE Fix-Cycle
 * Muestra progreso en tiempo real
 */

const fs = require('fs');
const path = require('path');

const SYNAPSE_LOG = path.join(__dirname, '..', 'SYNAPSE-FIX-CYCLE.md');

function parseLog() {
  if (!fs.existsSync(SYNAPSE_LOG)) {
    return { modules: 0, passed: 0, failed: 0, current: null };
  }

  const content = fs.readFileSync(SYNAPSE_LOG, 'utf8');
  const lines = content.split('\n');

  let modules = 0;
  let passed = 0;
  let failed = 0;
  let current = null;

  // Contar módulos testeados
  const moduleMatches = content.match(/## \d+\. /g);
  modules = moduleMatches ? moduleMatches.length : 0;

  // Contar PASSED
  const passedMatches = content.match(/Status\*\*: PASSED/g);
  passed = passedMatches ? passedMatches.length : 0;

  // Contar FAILED
  const failedMatches = content.match(/Status\*\*: FAILED/g);
  failed = failedMatches ? failedMatches.length : 0;

  // Encontrar módulo actual (último en el log)
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/## \d+\. (.+?) \(Intento \d+\)/);
    if (match) {
      current = match[1];
      break;
    }
  }

  return { modules, passed, failed, current };
}

function displayStatus() {
  const stats = parseLog();
  const passRate = stats.modules > 0 ? Math.round((stats.passed / stats.modules) * 100) : 0;

  console.clear();
  console.log('═'.repeat(70));
  console.log('🧠 SYNAPSE FIX-CYCLE - MONITOR EN VIVO');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`📊 Progreso: ${stats.modules}/63 módulos testeados`);
  console.log(`✅ PASSED: ${stats.passed} (${passRate}%)`);
  console.log(`❌ FAILED: ${stats.failed}`);
  console.log('');

  if (stats.current) {
    console.log(`🔧 Módulo actual: ${stats.current}`);
  } else {
    console.log('⏳ Iniciando...');
  }

  console.log('');
  console.log('─'.repeat(70));
  console.log('Actualiza cada 10 segundos | Ctrl+C para salir');
  console.log('─'.repeat(70));
}

// Actualizar cada 10 segundos
displayStatus();
setInterval(displayStatus, 10000);
