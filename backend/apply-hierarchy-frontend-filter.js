const fs = require('fs');
const path = require('path');

const panelFile = path.join(__dirname, 'public', 'panel-empresa.html');

console.log('\n🔧 APLICANDO FILTRO DE SUBMÓDULOS EN FRONTEND\n');
console.log('═'.repeat(80));

// Leer archivo
let content = fs.readFileSync(panelFile, 'utf-8');

// Verificar si ya tiene el filtro
if (content.includes('module.module_type !== \'submodule\'')) {
  console.log('✅ El filtro de submódulos YA está aplicado en panel-empresa.html\n');
  process.exit(0);
}

// Buscar el patrón a reemplazar
const pattern = /companyModules = data\.modules\s+\.filter\(module => !HIDDEN_FROM_CLIENT_DASHBOARD\.includes\(module\.id\)\)\s+\.map\(module => \({/;

if (!pattern.test(content)) {
  console.error('❌ No se encontró el patrón de filtro en loadCompanyModules()\n');
  console.log('ℹ️  El código puede haber cambiado. Revisa manualmente línea ~3925\n');
  process.exit(1);
}

// Aplicar el cambio
content = content.replace(
  pattern,
  `companyModules = data.modules
                        .filter(module => !HIDDEN_FROM_CLIENT_DASHBOARD.includes(module.id))
                        .filter(module => module.module_type !== 'submodule') // 🔧 Ocultar submódulos (departments, shifts)
                        .map(module => ({`
);

// Crear backup
const backupPath = panelFile.replace('.html', '.before-hierarchy-filter.html');
fs.writeFileSync(backupPath, fs.readFileSync(panelFile, 'utf-8'));

// Guardar archivo modificado
fs.writeFileSync(panelFile, content);

console.log('✅ Filtro de submódulos aplicado correctamente\n');
console.log(`📦 Backup: ${path.basename(backupPath)}\n`);
console.log('═'.repeat(80));
console.log('\n📋 RESULTADO:');
console.log('   - Dashboard de ISI NO mostrará "Departamentos" como tarjeta');
console.log('   - Dashboard de ISI NO mostrará "Turnos" como tarjeta');
console.log('   - Solo se mostrará "Estructura Organizacional" (container)\n');
