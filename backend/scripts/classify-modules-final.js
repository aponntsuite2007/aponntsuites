#!/usr/bin/env node

/**
 * Clasificación FINAL de módulos:
 * 1. Panel empresa + frontend
 * 2. Panel admin
 * 3. Sin frontend
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

  console.log('🔍 Clasificando módulos...\n');

  const result = await pool.query(`
    SELECT module_key, name, available_in, ui_metadata
    FROM system_modules
    WHERE module_key IS NOT NULL
    ORDER BY module_key
  `);

  const panelEmpresaWithFrontend = [];
  const panelAdminOnly = [];
  const withoutFrontend = [];
  const bothPanels = [];

  for (const row of result.rows) {
    const moduleKey = row.module_key;
    const frontendPath = path.join(__dirname, '..', 'public', 'js', 'modules', `${moduleKey}.js`);
    const hasFrontend = fs.existsSync(frontendPath);
    const availableIn = row.available_in || 'both';

    if (hasFrontend) {
      if (availableIn === 'empresa') {
        panelEmpresaWithFrontend.push(moduleKey);
      } else if (availableIn === 'admin') {
        panelAdminOnly.push(moduleKey);
      } else {
        // 'both' o null
        bothPanels.push(moduleKey);
      }
    } else {
      withoutFrontend.push(moduleKey);
    }
  }

  console.log('═'.repeat(70));
  console.log('📊 CLASIFICACIÓN DE MÓDULOS');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`🟢 Panel Empresa + Frontend: ${panelEmpresaWithFrontend.length}`);
  console.log(`🟣 Ambos Paneles + Frontend: ${bothPanels.length}`);
  console.log(`🔵 Panel Admin + Frontend: ${panelAdminOnly.length}`);
  console.log(`⚪ Sin Frontend: ${withoutFrontend.length}`);
  console.log(`📊 TOTAL: ${result.rows.length}`);
  console.log('');

  console.log('═'.repeat(70));
  console.log('🎯 MÓDULOS PARA TESTEAR (Panel Empresa + Both):');
  console.log('═'.repeat(70));

  const toTest = [...panelEmpresaWithFrontend, ...bothPanels].sort();
  toTest.forEach((m, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${m}`);
  });

  console.log('');
  console.log('═'.repeat(70));
  console.log('🔵 Panel Admin Only (skip por ahora):');
  console.log('═'.repeat(70));
  panelAdminOnly.forEach((m, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${m}`);
  });

  console.log('');
  console.log('═'.repeat(70));
  console.log('⚪ Sin Frontend (skip):');
  console.log('═'.repeat(70));
  withoutFrontend.forEach((m, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${m}`);
  });

  // Guardar lista final
  const output = {
    toTest: toTest,
    panelAdminOnly: panelAdminOnly,
    withoutFrontend: withoutFrontend,
    stats: {
      toTest: toTest.length,
      panelAdminOnly: panelAdminOnly.length,
      withoutFrontend: withoutFrontend.length,
      total: result.rows.length
    }
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'modules-to-test.json'),
    JSON.stringify(output, null, 2)
  );

  console.log('');
  console.log(`💾 Lista guardada en: modules-to-test.json`);
  console.log(`✅ ${toTest.length} módulos listos para testear`);

  await pool.end();
}

main().catch(console.error);
