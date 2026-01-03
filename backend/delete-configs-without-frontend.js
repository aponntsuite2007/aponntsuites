/**
 * Eliminar 26 configs sin frontend + investigar qué son
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const configsDir = path.join(__dirname, 'tests/e2e/configs');

// 12 sin archivo JS (support-ai removido - duplicado de ai-assistant)
const withoutJS = [
  'ai-assistant', 'companies', 'kiosks-apk', 'knowledge-base',
  'medical-associates', 'medical', 'notifications', 'partners',
  'temporary-access', 'testing-metrics-dashboard',
  'user-support', 'vendors'
];

// 13 con JS pero sin integración en panel-empresa
const withoutIntegration = [
  'admin-consent-management', 'associate-workflow-panel',
  'benefits-management', 'configurador-modulos', 'database-sync',
  'deploy-manager-3stages', 'hours-cube-dashboard', 'hse-management',
  'mi-espacio', 'notification-center', 'partner-scoring-system',
  'phase4-integrated-manager', 'siac-commercial-dashboard'
];

const allToDelete = [...withoutJS, ...withoutIntegration];

console.log(`\n🗑️  Eliminando ${allToDelete.length} configs sin frontend...\n`);

const results = {
  deleted: [],
  notFound: [],
  metadata: {}
};

allToDelete.forEach(moduleKey => {
  const configPath = path.join(configsDir, `${moduleKey}.config.js`);
  
  if (fs.existsSync(configPath)) {
    // Obtener fecha de creación antes de eliminar
    const stats = fs.statSync(configPath);
    const createdDate = stats.birthtime || stats.mtime;
    
    // Leer contenido para ver descripción
    let description = 'N/A';
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/moduleDescription:\s*['"](.*?)['"]/);
      if (match) description = match[1];
    } catch (e) {}
    
    results.metadata[moduleKey] = {
      createdDate: createdDate.toISOString().split('T')[0],
      description,
      hasJS: !withoutJS.includes(moduleKey),
      hasIntegration: false
    };
    
    // Eliminar
    fs.unlinkSync(configPath);
    results.deleted.push(moduleKey);
    console.log(`   ✅ ${moduleKey}.config.js`);
  } else {
    results.notFound.push(moduleKey);
    console.log(`   ⚠️  ${moduleKey}.config.js (no encontrado)`);
  }
});

console.log(`\n📊 **RESUMEN DE ELIMINACIÓN**:`);
console.log(`   Eliminados: ${results.deleted.length}`);
console.log(`   No encontrados: ${results.notFound.length}`);

console.log(`\n📅 **ANÁLISIS POR FECHA**:\n`);

// Agrupar por fecha
const byDate = {};
Object.entries(results.metadata).forEach(([key, meta]) => {
  const date = meta.createdDate;
  if (!byDate[date]) byDate[date] = [];
  byDate[date].push({ key, ...meta });
});

Object.entries(byDate).sort().forEach(([date, modules]) => {
  console.log(`   ${date} (${modules.length} módulos):`);
  modules.forEach(m => {
    const type = !m.hasJS ? '❌ SIN JS' : '⚠️  SIN INTEGRACIÓN';
    console.log(`      ${type} - ${m.key}`);
    if (m.description !== 'N/A') {
      console.log(`         "${m.description}"`);
    }
  });
  console.log('');
});

console.log(`\n🔍 **ANÁLISIS DE PROPÓSITO**:\n`);

// Categorizar
const categories = {
  backend: [],
  partial: [],
  old: [],
  dashboard: []
};

Object.entries(results.metadata).forEach(([key, meta]) => {
  if (key.includes('dashboard')) categories.dashboard.push(key);
  else if (!meta.hasJS) categories.backend.push(key);
  else if (key.includes('manager') || key.includes('sync')) categories.partial.push(key);
  else categories.old.push(key);
});

console.log(`   🔧 BACKEND-ONLY (${categories.backend.length}):`);
categories.backend.forEach(k => console.log(`      - ${k}`));

console.log(`\n   📊 DASHBOARDS (${categories.dashboard.length}):`);
categories.dashboard.forEach(k => console.log(`      - ${k}`));

console.log(`\n   ⚙️  PARCIALES/MANAGERS (${categories.partial.length}):`);
categories.partial.forEach(k => console.log(`      - ${k}`));

console.log(`\n   🗑️  OTROS/OLD (${categories.old.length}):`);
categories.old.forEach(k => console.log(`      - ${k}`));

console.log(`\n✅ **CONCLUSIÓN**:`);
console.log(`   - ${categories.backend.length} módulos son backend-only (no necesitan frontend)`);
console.log(`   - ${categories.dashboard.length} dashboards sin integración (probablemente deprecated)`);
console.log(`   - ${categories.partial.length} módulos parciales/managers (sin terminar)`);
console.log(`   - ${categories.old.length} otros módulos antiguos/sin uso\n`);

// Guardar metadata
fs.writeFileSync(
  path.join(__dirname, 'DELETED-CONFIGS-METADATA.json'),
  JSON.stringify(results.metadata, null, 2)
);

console.log(`📁 Metadata guardada en: DELETED-CONFIGS-METADATA.json\n`);
