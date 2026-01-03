const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

(async () => {
  // Configs
  const configsDir = path.join(__dirname, '../tests/e2e/configs');
  const configFiles = fs.readdirSync(configsDir).filter(f => f.endsWith('.config.js'));
  const configModules = new Set(configFiles.map(f => f.replace('.config.js', '')));

  // Módulos en BD
  const result = await pool.query(`
    SELECT module_key, is_core
    FROM system_modules
    WHERE is_active = true
  `);

  const dbModules = new Map(result.rows.map(r => [r.module_key, r.is_core]));

  console.log('\n=== CONFIGS E2E vs BD ===\n');

  // Configs en BD CORE
  console.log('CONFIGS que SON CORE (testeados en Batch #16):');
  const coreWithConfig = [];
  configModules.forEach(mod => {
    if (dbModules.has(mod) && dbModules.get(mod)) {
      coreWithConfig.push(mod);
    }
  });
  coreWithConfig.sort();
  coreWithConfig.forEach((m, i) => console.log(`  ${i+1}. ${m}`));

  // Configs en BD NO-CORE
  console.log('\nCONFIGS que son NO-CORE (NO testeados):');
  const nonCoreWithConfig = [];
  configModules.forEach(mod => {
    if (dbModules.has(mod) && !dbModules.get(mod)) {
      nonCoreWithConfig.push(mod);
    }
  });
  nonCoreWithConfig.sort();
  nonCoreWithConfig.forEach((m, i) => console.log(`  ${i+1}. ${m}`));

  // Configs NO en BD
  console.log('\nCONFIGS que NO están en BD:');
  const notInDB = [];
  configModules.forEach(mod => {
    if (!dbModules.has(mod)) {
      notInDB.push(mod);
    }
  });
  notInDB.sort();
  notInDB.forEach((m, i) => console.log(`  ${i+1}. ${m}`));

  console.log(`\nRESUMEN:`);
  console.log(`  Total configs E2E: ${configModules.size}`);
  console.log(`  Configs CORE (testeados): ${coreWithConfig.length}`);
  console.log(`  Configs NO-CORE (NO testeados): ${nonCoreWithConfig.length}`);
  console.log(`  Configs sin registro BD: ${notInDB.length}`);

  await pool.end();
})();
