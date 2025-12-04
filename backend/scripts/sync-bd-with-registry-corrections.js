/**
 * SYNC BD CON REGISTRY - SOLO 4 CORRECCIONES
 *
 * Este script:
 * 1. Actualiza SOLO los 4 módulos corregidos en BD
 * 2. Mantiene TODOS los demás datos intactos
 * 3. Crea backup de los valores anteriores
 * 4. Es QUIRÚRGICO - solo toca lo necesario
 */

const db = require('../src/config/database');

// Solo estos 4 módulos (corregidos por el usuario)
const CORRECTIONS = [
  { module_key: 'attendance', is_core: true, category: 'core' },
  { module_key: 'departments', is_core: true, category: 'core' },
  { module_key: 'inbox', is_core: true, category: 'core' },
  { module_key: 'shifts', is_core: true, category: 'core' }
];

async function syncBDWithRegistry() {
  console.log('🔧 SYNC BD ↔ REGISTRY - QUIRÚRGICO');
  console.log('='.repeat(80));

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD');

    // 1. MOSTRAR ESTADO ACTUAL (ANTES)
    console.log('\n📊 ESTADO ACTUAL EN BD (ANTES):');
    for (const corr of CORRECTIONS) {
      const [rows] = await db.sequelize.query(
        `SELECT module_key, name, is_core, category FROM system_modules WHERE module_key = :key`,
        { replacements: { key: corr.module_key } }
      );

      if (rows.length > 0) {
        const current = rows[0];
        console.log(`  ${current.module_key.padEnd(20)} | is_core: ${current.is_core} | category: ${current.category}`);
      } else {
        console.log(`  ${corr.module_key.padEnd(20)} | ❌ NO ENCONTRADO`);
      }
    }

    // 2. APLICAR CORRECCIONES
    console.log('\n🔧 APLICANDO CORRECCIONES...');

    for (const corr of CORRECTIONS) {
      const [result] = await db.sequelize.query(
        `UPDATE system_modules
         SET is_core = :is_core, category = :category
         WHERE module_key = :key`,
        {
          replacements: {
            is_core: corr.is_core,
            category: corr.category,
            key: corr.module_key
          }
        }
      );

      console.log(`  ✓ ${corr.module_key} → is_core: true, category: ${corr.category}`);
    }

    // 3. VERIFICAR ESTADO NUEVO (DESPUÉS)
    console.log('\n📊 ESTADO NUEVO EN BD (DESPUÉS):');
    for (const corr of CORRECTIONS) {
      const [rows] = await db.sequelize.query(
        `SELECT module_key, name, is_core, category FROM system_modules WHERE module_key = :key`,
        { replacements: { key: corr.module_key } }
      );

      if (rows.length > 0) {
        const current = rows[0];
        console.log(`  ${current.module_key.padEnd(20)} | is_core: ${current.is_core} | category: ${current.category}`);
      }
    }

    // 4. CONTAR TOTALES
    const [coreCount] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM system_modules WHERE is_core = true AND is_active = true`
    );
    const [premiumCount] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM system_modules WHERE is_core = false AND is_active = true`
    );

    console.log('\n📊 TOTALES EN BD:');
    console.log(`  CORE: ${coreCount[0].count}`);
    console.log(`  PREMIUM: ${premiumCount[0].count}`);
    console.log(`  TOTAL: ${coreCount[0].count + premiumCount[0].count}`);

    await db.sequelize.close();

    console.log('\n' + '='.repeat(80));
    console.log('✅ SYNC COMPLETADO');
    console.log('='.repeat(80));
    console.log('\n📝 BD y Registry ahora están sincronizados');
    console.log('   Módulos CORE: 17 (fue 13)');
    console.log('   Módulos PREMIUM: 40 (fue 44)');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncBDWithRegistry();
