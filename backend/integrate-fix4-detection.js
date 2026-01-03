const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'synapse', 'SynapseOrchestrator.js');

console.log('📝 Integrando detección de FIX #4 en processModule()...\n');

// Leer archivo
let content = fs.readFileSync(targetFile, 'utf-8');

// Verificar si ya está integrado
if (content.includes('detectFallbackUsage(testResult.stdout)')) {
  console.log('✅ FIX #4 ya está integrado en processModule()');
  process.exit(0);
}

// Buscar el punto donde insertar (justo después de runTest)
const insertionRegex = /(const testResult = await this\.runTest\(moduleKey\);)\s+(\/\/ =+\s+\/\/ PASO 5: ANALIZAR RESULTADO)/;

if (!insertionRegex.test(content)) {
  console.error('❌ No se encontró el punto de inserción');
  console.log('Buscando línea: const testResult = await this.runTest(moduleKey);');
  process.exit(1);
}

// Código a insertar
const fix4Integration = `$1

      // ========================================
      // 🆕 FIX #4: DETECTAR Y CORREGIR FALLBACK
      // ========================================
      const usedFallback = this.detectFallbackUsage(testResult.stdout);
      if (usedFallback) {
        console.log(\`\\n🔍 FIX #4: Test usó selector fallback - auto-corrigiendo config...\`);
        const fixResult = await this.repairConfigSelector(moduleKey);
        if (fixResult.fixed) {
          this.stats.fixesApplied++;
          console.log(\`   ✅ Config actualizado: "\${fixResult.oldSelector}" → "\${fixResult.newSelector}"\`);
        } else if (fixResult.reason === 'already_fixed') {
          console.log(\`   ℹ️  Config ya estaba correcto\`);
        }
      }

      $2`;

// Aplicar integración
content = content.replace(insertionRegex, fix4Integration);

// Crear backup
const backupPath = targetFile.replace('.js', '.before-fix4-integration.js');
const originalContent = fs.readFileSync(targetFile, 'utf-8');
fs.writeFileSync(backupPath, originalContent);

// Guardar archivo modificado
fs.writeFileSync(targetFile, content);

console.log('✅ FIX #4 integrado en processModule()');
console.log(`📦 Backup: ${path.basename(backupPath)}\n`);

// Validar
const updated = fs.readFileSync(targetFile, 'utf-8');
if (updated.includes('detectFallbackUsage(testResult.stdout)') &&
    updated.includes('repairConfigSelector(moduleKey)')) {
  console.log('✅ Validación: Detección y reparación integradas correctamente');
  console.log('\n🎉 FIX #4 COMPLETO');
  console.log('   - Métodos: detectFallbackUsage() + repairConfigSelector()');
  console.log('   - Integración: Línea ~189 en processModule()');
  console.log('   - Se ejecuta después de cada test');
  console.log('   - Auto-corrige configs cuando detecta fallback\n');
} else {
  console.error('❌ Error: Integración incompleta');
  process.exit(1);
}
