/**
 * Restaurar los 26 configs eliminados
 */
const fs = require('fs');
const path = require('path');

// Lista completa de los 25 eliminados (support-ai removido - duplicado)
const deletedModules = [
  'ai-assistant', 'companies', 'kiosks-apk', 'knowledge-base',
  'medical-associates', 'medical', 'notifications', 'partners',
  'temporary-access', 'testing-metrics-dashboard',
  'user-support', 'vendors',
  'admin-consent-management', 'associate-workflow-panel',
  'benefits-management', 'configurador-modulos', 'database-sync',
  'deploy-manager-3stages', 'hours-cube-dashboard', 'hse-management',
  'mi-espacio', 'notification-center', 'partner-scoring-system',
  'phase4-integrated-manager', 'siac-commercial-dashboard'
];

const configsDir = path.join(__dirname, 'tests/e2e/configs');

// Verificar cuáles faltan
const missing = deletedModules.filter(m => {
  return !fs.existsSync(path.join(configsDir, `${m}.config.js`));
});

console.log(`\n🔍 Módulos faltantes: ${missing.length}/25\n`);
missing.forEach(m => console.log(`   ❌ ${m}`));
console.log('');
