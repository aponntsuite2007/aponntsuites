/**
 * 📊 ANÁLISIS DE SEGMENTACIÓN DE MÓDULOS
 *
 * Categoriza los 46 módulos en:
 * - CORE: Módulos fundamentales incluidos siempre
 * - COMERCIALES ISI: 27 módulos asignados a ISI
 * - ADMIN: Módulos del panel-administrativo
 * - AUXILIARES: Módulos de soporte/testing
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
  console.log('📊 ANÁLISIS DE SEGMENTACIÓN DE MÓDULOS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // 1. Todos los módulos activos
    const modulesResult = await pool.query(`
      SELECT module_key, name, category, is_core, rubro
      FROM system_modules
      WHERE is_active = true
      ORDER BY category, module_key
    `);
    const allModules = modulesResult.rows;

    // 2. Módulos asignados a ISI
    const isiResult = await pool.query(`
      SELECT sm.module_key, sm.name, sm.is_core
      FROM company_modules cm
      JOIN companies c ON cm.company_id = c.company_id
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE c.slug = 'isi-ingenieria' AND cm.is_active = true
      ORDER BY sm.module_key
    `);
    const isiModules = isiResult.rows;
    const isiSet = new Set(isiModules.map(r => r.module_key));

    // 3. Clasificar módulos
    const core = allModules.filter(m => m.is_core);
    const coreSet = new Set(core.map(m => m.module_key));

    const comercialesISI = isiModules.filter(m => !m.is_core);
    const notInISI = allModules.filter(m => !isiSet.has(m.module_key));

    // ═══════════════════════════════════════════════════════════════════════
    // MOSTRAR RESULTADOS
    // ═══════════════════════════════════════════════════════════════════════

    console.log('📌 1. MÓDULOS CORE (is_core = true) - Siempre incluidos:');
    console.log('─────────────────────────────────────────────────────────────────────');
    core.forEach((m, i) => {
      const inISI = isiSet.has(m.module_key) ? '✅' : '❌';
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name.padEnd(35)} | ISI: ${inISI}`);
    });
    console.log(`  ───────────────────────────────────────────────────────────────────`);
    console.log(`  Total CORE: ${core.length}`);
    console.log('');

    console.log('📦 2. MÓDULOS COMERCIALES ASIGNADOS A ISI (no-core):');
    console.log('─────────────────────────────────────────────────────────────────────');
    comercialesISI.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name}`);
    });
    console.log(`  ───────────────────────────────────────────────────────────────────`);
    console.log(`  Total comerciales ISI (no-core): ${comercialesISI.length}`);
    console.log(`  Total ISI (core + comerciales): ${isiModules.length}`);
    console.log('');

    console.log('🏢 3. MÓDULOS NO ASIGNADOS A ISI (admin/auxiliares):');
    console.log('─────────────────────────────────────────────────────────────────────');
    notInISI.forEach((m, i) => {
      const isCore = m.is_core ? ' [CORE]' : '';
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name.padEnd(30)} | cat: ${m.category}${isCore}`);
    });
    console.log(`  ───────────────────────────────────────────────────────────────────`);
    console.log(`  Total NO en ISI: ${notInISI.length}`);
    console.log('');

    // Resumen por categoría
    console.log('📊 4. RESUMEN POR CATEGORÍA:');
    console.log('─────────────────────────────────────────────────────────────────────');
    const cats = {};
    allModules.forEach(m => {
      cats[m.category] = cats[m.category] || { total: 0, core: 0, isi: 0 };
      cats[m.category].total++;
      if (m.is_core) cats[m.category].core++;
      if (isiSet.has(m.module_key)) cats[m.category].isi++;
    });
    console.log('  Categoría            Total   Core    ISI');
    console.log('  ─────────────────────────────────────────');
    Object.keys(cats).sort().forEach(cat => {
      const c = cats[cat];
      console.log(`  ${cat.padEnd(20)} ${c.total.toString().padStart(3)}    ${c.core.toString().padStart(3)}    ${c.isi.toString().padStart(3)}`);
    });
    console.log('');

    // Gran resumen
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('📈 RESUMEN FINAL:');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`  Total módulos en BD:           ${allModules.length}`);
    console.log(`  Módulos CORE:                  ${core.length}`);
    console.log(`  Módulos asignados a ISI:       ${isiModules.length} (${core.filter(c => isiSet.has(c.module_key)).length} core + ${comercialesISI.length} comerciales)`);
    console.log(`  Módulos NO en ISI:             ${notInISI.length}`);
    console.log('');

    // Propuesta de segmentación
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('💡 PROPUESTA DE SEGMENTACIÓN:');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  🟢 CORE (gratis, siempre incluidos):');
    core.forEach(m => console.log(`      - ${m.module_key}`));
    console.log('');
    console.log('  🔵 COMERCIALES (vendibles a empresas):');
    comercialesISI.forEach(m => console.log(`      - ${m.module_key}`));
    console.log('');
    console.log('  🟠 ADMIN (solo panel-administrativo):');
    const adminModules = notInISI.filter(m => ['admin', 'testing'].includes(m.category) || m.module_key.includes('audit') || m.module_key.includes('partner') || m.module_key.includes('vendor'));
    adminModules.forEach(m => console.log(`      - ${m.module_key} (${m.category})`));
    console.log('');
    console.log('  🔴 REVISAR (posibles basura/duplicados):');
    const toReview = notInISI.filter(m => !adminModules.some(a => a.module_key === m.module_key) && !m.is_core);
    toReview.forEach(m => console.log(`      - ${m.module_key} (${m.category})`));
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyze();
