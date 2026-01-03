/**
 * Identificar procesos Node seguros para eliminar
 */
const { execSync } = require('child_process');

console.log('\n🔍 Analizando procesos Node.exe...\n');

// Obtener todos los procesos Node
const output = execSync('tasklist | findstr node.exe', { encoding: 'utf8' });
const lines = output.trim().split('\n');

console.log(`📊 Total procesos Node: ${lines.length}\n`);

// Identificar servidor
const serverPID = '15844';
console.log(`✅ SERVIDOR (NO ELIMINAR): PID ${serverPID} (puerto 9998)`);

// Obtener procesos Claude Code (este script + otros)
const currentPID = process.pid;
console.log(`✅ CLAUDE CODE (ESTA SESIÓN): PID ${currentPID}`);

// Listar otros procesos
console.log(`\n📋 OTROS PROCESOS NODE:\n`);
lines.forEach(line => {
  const match = line.match(/node\.exe\s+(\d+)/);
  if (match) {
    const pid = match[1];
    if (pid !== serverPID && pid !== currentPID.toString()) {
      console.log(`   ⚠️  PID ${pid}`);
    }
  }
});

console.log(`\n💡 RECOMENDACIÓN:`);
console.log(`   - PID ${serverPID}: SERVIDOR (puerto 9998) - NO MATAR`);
console.log(`   - PID ${currentPID}: ESTA SESIÓN Claude Code - NO MATAR`);
console.log(`   - Otros PIDs: Probablemente sesiones viejas de Playwright/tests`);
console.log(`\n⚠️  Para limpiar de forma SEGURA:`);
console.log(`   1. Verifica que NO haya otras sesiones de Claude Code activas`);
console.log(`   2. Si solo tienes 1 Claude Code abierto, puedes matar los "Otros PIDs"`);
console.log(`   3. Comando: for pid in <LISTA_PIDS>; do taskkill //F //PID $pid; done\n`);
