const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'synapse', 'SynapseOrchestrator.js');

console.log('📝 Inyectando FIX #4 en SynapseOrchestrator.js...\n');

// Leer archivo
let content = fs.readFileSync(targetFile, 'utf-8');

// Verificar si ya tiene FIX #4
if (content.includes('detectFallbackUsage') || content.includes('FIX #4')) {
  console.log('✅ FIX #4 ya está implementado');
  process.exit(0);
}

// Buscar el punto donde insertar (justo antes de classifyError)
const regex = /(\s+return report;\s+\})\s+(\/\*\*\s+\*\s+Clasifica tipo de error)/;

if (!regex.test(content)) {
  console.error('❌ No se encontró el punto de inserción');
  console.log('Patrón buscado: return report; } ... /** Clasifica tipo de error');
  process.exit(1);
}

// Código a insertar
const fix4Code = `

  /**
   * 🆕 FIX #4: Detecta si el test usó fallback selector
   */
  detectFallbackUsage(stdout) {
    if (!stdout) return false;
    const fallbackPatterns = [
      /✅\\s+Fallback\\s+exitoso/i,
      /continuando\\s+con\\s+#mainContent/i,
      /usando\\s+selector\\s+fallback/i
    ];
    return fallbackPatterns.some(pattern => pattern.test(stdout));
  }

  /**
   * 🆕 FIX #4: Auto-corrige el config para usar #mainContent directamente
   */
  async repairConfigSelector(moduleKey) {
    const configPath = path.join(__dirname, '..', '..', 'tests', 'e2e', 'configs', \`\${moduleKey}.json\`);
    if (!fs.existsSync(configPath)) {
      console.log(\`⚠️ Config no existe: \${configPath}\`);
      return { fixed: false, reason: 'config_not_found' };
    }
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.waitForSelector === '#mainContent') {
        console.log(\`ℹ️ Config ya usa #mainContent - no requiere fix\`);
        return { fixed: false, reason: 'already_fixed' };
      }
      const backupPath = configPath.replace('.json', '.backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));
      const oldSelector = config.waitForSelector;
      config.waitForSelector = '#mainContent';
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(\`✅ FIX #4 aplicado: "\${oldSelector}" → "#mainContent"\`);
      console.log(\`   Backup: \${path.basename(backupPath)}\`);
      return { fixed: true, oldSelector, newSelector: '#mainContent', backupPath };
    } catch (error) {
      console.error(\`❌ Error aplicando FIX #4: \${error.message}\`);
      return { fixed: false, reason: error.message };
    }
  }

  `;

// Insertar código
content = content.replace(regex, `$1${fix4Code}$2`);

// Crear backup
const backupPath = targetFile.replace('.js', '.before-fix4.js');
fs.writeFileSync(backupPath, fs.readFileSync(targetFile, 'utf-8'));

// Guardar archivo modificado
fs.writeFileSync(targetFile, content);

console.log('✅ FIX #4 (métodos) inyectado exitosamente');
console.log(`📦 Backup: ${path.basename(backupPath)}\n`);

// Validar
const updated = fs.readFileSync(targetFile, 'utf-8');
if (updated.includes('detectFallbackUsage') && updated.includes('repairConfigSelector')) {
  console.log('✅ Validación: Ambos métodos presentes');
  console.log('\n📋 Próximo paso: Integrar detección en processModule() línea ~188');
} else {
  console.error('❌ Error: Métodos no se insertaron correctamente');
  process.exit(1);
}
