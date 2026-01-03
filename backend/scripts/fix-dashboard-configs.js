/**
 * FIX: Deshabilitar CHAOS testing en módulos dashboard (READ-ONLY sin CRUD)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const configsDir = path.join(__dirname, '..', 'tests', 'e2e', 'configs');
const dashboardConfigs = glob.sync(path.join(configsDir, '*dashboard*.config.js'));

console.log(`🔧 Deshabilitando CHAOS en ${dashboardConfigs.length} dashboards...\n`);

let fixed = 0;

dashboardConfigs.forEach(configPath => {
  const moduleName = path.basename(configPath, '.config.js');
  console.log(`   📂 ${moduleName}`);

  let content = fs.readFileSync(configPath, 'utf8');

  // Deshabilitar CHAOS
  const before = content;
  content = content.replace(
    /chaosConfig: \{[\s\S]*?enabled: true,/,
    `chaosConfig: {
    enabled: false, // Dashboard READ-ONLY - sin CRUD para testear`
  );

  if (content !== before) {
    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`      ✅ CHAOS deshabilitado`);
    fixed++;
  } else {
    console.log(`      ⏭️  Ya estaba deshabilitado`);
  }
});

console.log(`\n✅ ${fixed}/${dashboardConfigs.length} configs actualizados`);
