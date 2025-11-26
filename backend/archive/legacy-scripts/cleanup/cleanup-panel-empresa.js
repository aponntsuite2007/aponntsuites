const fs = require('fs');
const path = './public/panel-empresa.html';
let content = fs.readFileSync(path, 'utf8');

const modulesToRemove = [
  'notifications', 'biometric', 'biometric-simple', 'notifications-complete',
  'proactive-notifications', 'notifications-inbox', 'network',
  'google-maps-integration', 'auditor-dashboard'
];

let totalChanges = 0;

console.log('🔧 INICIANDO LIMPIEZA DE panel-empresa.html\n');

modulesToRemove.forEach(mod => {
  let modChanges = 0;

  // Patrón 1: { id: 'module', ... },
  const regex1 = new RegExp(`\\s*\\{[^}]*id:\\s*['"]${mod}['"][^}]*\\},?\\s*\\n?`, 'g');
  const before1 = content.length;
  content = content.replace(regex1, '');
  if (content.length !== before1) {
    modChanges++;
    console.log(`  ✅ ${mod}: Eliminado objeto de array`);
  }

  // Patrón 2: 'module': 'CATEGORY',
  const regex2 = new RegExp(`['"]${mod}['"]:\\s*['"][^'"]+['"],?\\s*`, 'g');
  const before2 = content.length;
  content = content.replace(regex2, '');
  if (content.length !== before2) {
    modChanges++;
    console.log(`  ✅ ${mod}: Eliminado de objeto de categorías`);
  }

  // Patrón 3: 'module',
  const regex3 = new RegExp(`\\s*['"]${mod}['"],\\s*`, 'g');
  const before3 = content.length;
  content = content.replace(regex3, '');
  if (content.length !== before3) {
    modChanges++;
    console.log(`  ✅ ${mod}: Eliminado de array simple`);
  }

  totalChanges += modChanges;
});

// Limpiar artefactos
content = content.replace(/,(\s*,)+/g, ',');
content = content.replace(/,(\s*\])/g, ']');
content = content.replace(/,(\s*\})/g, '}');
content = content.replace(/\[(\s*,)/g, '[');
content = content.replace(/\{(\s*,)/g, '{');

fs.writeFileSync(path, content, 'utf8');
console.log(`\n✅ Total de cambios: ${totalChanges}`);
console.log('✅ Archivo limpiado y guardado');
