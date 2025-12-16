/**
 * 📊 ANÁLISIS FINAL DE SEGMENTACIÓN DE MÓDULOS
 */

const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function analyze() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📊 ANÁLISIS FINAL DE SEGMENTACIÓN DE MÓDULOS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Todos los módulos activos
  const allResult = await pool.query(`
    SELECT id, module_key, name, category, is_core
    FROM system_modules
    WHERE is_active = true
    ORDER BY module_key
  `);
  const allModules = allResult.rows;
  const allSet = new Set(allModules.map(m => m.module_key));

  // 2. Módulos de ISI (company_id = 11) - El modelo de cliente comercial
  const isiResult = await pool.query(`
    SELECT sm.module_key, sm.name, sm.is_core, sm.category
    FROM company_modules cm
    JOIN system_modules sm ON cm.system_module_id = sm.id
    WHERE cm.company_id = 11 AND cm.is_active = true
    ORDER BY sm.module_key
  `);
  const isiModules = isiResult.rows;
  const isiSet = new Set(isiModules.map(m => m.module_key));

  // 3. Módulos NO en ISI (admin/auxiliares)
  const notInISI = allModules.filter(m => !isiSet.has(m.module_key));

  // ═══════════════════════════════════════════════════════════════════════
  // SEGMENTACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  // CORE de ISI (visible para clientes, incluido gratis)
  const isiCore = isiModules.filter(m => m.is_core);

  // COMERCIALES de ISI (visible para clientes, vendible)
  const isiComercial = isiModules.filter(m => !m.is_core);

  // ADMIN (solo panel-administrativo)
  const adminModules = notInISI.filter(m =>
    m.category === 'admin' ||
    m.module_key === 'partners' ||
    m.module_key === 'vendors' ||
    m.module_key === 'auditor'
  );

  // Core que no está en ISI (posible omisión o admin-only)
  const coreNotInISI = notInISI.filter(m => m.is_core);

  // El resto (a revisar)
  const adminSet = new Set(adminModules.map(m => m.module_key));
  const toReview = notInISI.filter(m => !adminSet.has(m.module_key) && !m.is_core);

  // ═══════════════════════════════════════════════════════════════════════
  // MOSTRAR RESULTADOS
  // ═══════════════════════════════════════════════════════════════════════

  console.log('🟢 1. CORE (incluidos gratis para clientes) - ' + isiCore.length + ' módulos:');
  console.log('─────────────────────────────────────────────────────────────────────');
  isiCore.forEach((m, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name}`);
  });
  console.log('');

  console.log('🔵 2. COMERCIALES (vendibles a clientes) - ' + isiComercial.length + ' módulos:');
  console.log('─────────────────────────────────────────────────────────────────────');
  isiComercial.forEach((m, i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name.padEnd(35)} | ${m.category}`);
  });
  console.log('');

  console.log('🟠 3. ADMIN (solo panel-administrativo) - ' + adminModules.length + ' módulos:');
  console.log('─────────────────────────────────────────────────────────────────────');
  adminModules.forEach((m, i) => {
    const core = m.is_core ? ' [CORE]' : '';
    console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name}${core}`);
  });
  console.log('');

  if (coreNotInISI.length > 0) {
    console.log('⚠️  4. CORE NO ASIGNADO A ISI (revisar) - ' + coreNotInISI.length + ' módulos:');
    console.log('─────────────────────────────────────────────────────────────────────');
    coreNotInISI.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name}`);
    });
    console.log('');
  }

  if (toReview.length > 0) {
    console.log('🔴 5. A REVISAR (no en ISI, no admin, no core) - ' + toReview.length + ' módulos:');
    console.log('─────────────────────────────────────────────────────────────────────');
    toReview.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name.padEnd(30)} | ${m.category}`);
    });
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📈 RESUMEN FINAL:');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Total módulos en BD:              ${allModules.length}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  📦 PANEL EMPRESA (cliente):       ${isiModules.length}`);
  console.log(`     └─ Core (gratis):              ${isiCore.length}`);
  console.log(`     └─ Comerciales (vendibles):    ${isiComercial.length}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  🏢 PANEL ADMIN:                   ${adminModules.length}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  ⚠️  Core no en ISI:                ${coreNotInISI.length}`);
  console.log(`  🔴 A revisar/basura:              ${toReview.length}`);
  console.log('');

  // Verificación
  const total = isiModules.length + notInISI.length;
  if (total !== allModules.length) {
    console.log('❌ ERROR: La suma no cuadra!', total, '!==', allModules.length);
  }

  await pool.end();
}

analyze().catch(console.error);
