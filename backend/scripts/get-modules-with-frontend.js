#!/usr/bin/env node

/**
 * Identificar módulos que TIENEN frontend
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  console.log('🔍 Obteniendo módulos de BD...\n');

  const result = await pool.query(`
    SELECT module_key, module_name
    FROM system_modules
    WHERE module_key IS NOT NULL
    ORDER BY module_key
  `);

  const modulesWithFrontend = [];
  const modulesWithoutFrontend = [];

  for (const row of result.rows) {
    const moduleKey = row.module_key;
    const frontendPath = path.join(__dirname, '..', 'public', 'js', 'modules', `${moduleKey}.js`);

    if (fs.existsSync(frontendPath)) {
      modulesWithFrontend.push(moduleKey);
    } else {
      modulesWithoutFrontend.push(moduleKey);
    }
  }

  console.log(`✅ Módulos CON frontend: ${modulesWithFrontend.length}`);
  console.log(`❌ Módulos SIN frontend: ${modulesWithoutFrontend.length}`);
  console.log(`📊 Total: ${result.rows.length}\n`);

  console.log('═'.repeat(60));
  console.log('MÓDULOS CON FRONTEND:');
  console.log('═'.repeat(60));
  modulesWithFrontend.forEach((m, i) => {
    console.log(`${i + 1}. ${m}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('MÓDULOS SIN FRONTEND:');
  console.log('═'.repeat(60));
  modulesWithoutFrontend.forEach((m, i) => {
    console.log(`${i + 1}. ${m}`);
  });

  // Guardar lista en archivo
  const output = {
    withFrontend: modulesWithFrontend,
    withoutFrontend: modulesWithoutFrontend,
    stats: {
      withFrontend: modulesWithFrontend.length,
      withoutFrontend: modulesWithoutFrontend.length,
      total: result.rows.length
    }
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'modules-frontend-classification.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('\n💾 Guardado en: modules-frontend-classification.json');

  await pool.end();
}

main().catch(console.error);
