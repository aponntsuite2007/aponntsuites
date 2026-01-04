/**
 * LIMPIEZA MASIVA - Eliminar módulos incorrectos de ISI (company_id=11)
 *
 * Elimina de company_modules:
 * - Módulos administrativos (target_panel = 'panel-administrativo')
 * - APKs complementarias (show_as_card = false)
 * - Módulos técnicos (show_as_card = false)
 *
 * Solo deben quedar: target_panel = 'panel-empresa' AND show_as_card = true
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function main() {
  try {
    console.log('\n🔍 LIMPIEZA MASIVA - ISI (company_id=11)');
    console.log('='.repeat(80));

    // 1. Identificar módulos a eliminar
    console.log('\n📋 PASO 1: Identificando módulos incorrectos...\n');

    const { rows: toDelete } = await pool.query(`
      SELECT
        cm.id,
        sm.module_key,
        vmp.target_panel,
        vmp.show_as_card,
        vmp.commercial_type,
        CASE
          WHEN vmp.target_panel = 'panel-administrativo' THEN 'ADMIN'
          WHEN vmp.show_as_card = false AND vmp.commercial_type = 'apk-complementaria' THEN 'APK'
          WHEN vmp.show_as_card = false THEN 'TECNICO'
          WHEN vmp.target_panel IS NULL THEN 'SIN_VISTA'
          ELSE 'OTRO'
        END as reason
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      LEFT JOIN v_modules_by_panel vmp ON vmp.module_key = sm.module_key
      WHERE cm.company_id = 11
        AND cm.activo = true
        AND (
          vmp.target_panel != 'panel-empresa'
          OR vmp.show_as_card = false
          OR vmp.target_panel IS NULL
        )
      ORDER BY reason, sm.module_key
    `);

    console.log(`❌ Encontrados ${toDelete.length} módulos a eliminar:\n`);

    // Agrupar por razón
    const byReason = {};
    toDelete.forEach(m => {
      if (!byReason[m.reason]) byReason[m.reason] = [];
      byReason[m.reason].push(m);
    });

    Object.entries(byReason).forEach(([reason, modules]) => {
      console.log(`\n  ${reason} (${modules.length} módulos):`);
      modules.forEach(m => {
        console.log(`    - ${m.module_key} (id: ${m.id})`);
      });
    });

    if (toDelete.length === 0) {
      console.log('\n✅ No hay módulos a eliminar. ISI está limpio.\n');
      await pool.end();
      return;
    }

    // 2. Confirmar eliminación
    console.log('\n' + '='.repeat(80));
    console.log(`\n⚠️  Eliminando ${toDelete.length} módulos de company_modules para ISI...\n`);

    // Sin timeout - ejecución inmediata

    // 3. Eliminar
    console.log('🗑️  PASO 2: Eliminando módulos...\n');

    const moduleKeys = toDelete.map(m => m.module_key);

    const { rowCount } = await pool.query(`
      DELETE FROM company_modules
      WHERE company_id = 11
        AND system_module_id IN (
          SELECT id FROM system_modules
          WHERE module_key = ANY($1::varchar[])
        )
      RETURNING id
    `, [moduleKeys]);

    console.log(`✅ Eliminados ${rowCount} módulos de company_modules\n`);

    // 4. Verificar estado final
    console.log('='.repeat(80));
    console.log('\n📊 PASO 3: Verificando estado final...\n');

    const { rows: remaining } = await pool.query(`
      SELECT
        sm.module_key,
        vmp.target_panel,
        vmp.commercial_type,
        vmp.is_core
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      LEFT JOIN v_modules_by_panel vmp ON vmp.module_key = sm.module_key
      WHERE cm.company_id = 11
        AND cm.activo = true
      ORDER BY vmp.is_core DESC, sm.module_key
    `);

    console.log(`✅ Módulos restantes: ${remaining.length}\n`);

    // Contar por tipo
    const core = remaining.filter(m => m.is_core).length;
    const optional = remaining.filter(m => !m.is_core).length;

    console.log(`   📌 CORE: ${core} módulos`);
    console.log(`   📌 OPCIONALES: ${optional} módulos\n`);

    // Verificar que todos sean panel-empresa
    const adminStillThere = remaining.filter(m => m.target_panel !== 'panel-empresa');
    const apkStillThere = remaining.filter(m => m.module_key.includes('-apk'));

    if (adminStillThere.length > 0) {
      console.log(`\n⚠️  WARNING: Aún hay ${adminStillThere.length} módulos admin:`);
      adminStillThere.forEach(m => console.log(`    - ${m.module_key}`));
    }

    if (apkStillThere.length > 0) {
      console.log(`\n⚠️  WARNING: Aún hay ${apkStillThere.length} APKs:`);
      apkStillThere.forEach(m => console.log(`    - ${m.module_key}`));
    }

    if (adminStillThere.length === 0 && apkStillThere.length === 0) {
      console.log('✅ Verificación OK - Solo módulos válidos para panel-empresa\n');
    }

    console.log('='.repeat(80));
    console.log('\n✅ LIMPIEZA COMPLETADA\n');

    // 5. Mostrar algunos ejemplos de lo que quedó
    console.log('📋 Ejemplos de módulos que quedaron:\n');
    remaining.slice(0, 10).forEach(m => {
      console.log(`   ${m.is_core ? '🔵 CORE' : '🟢 OPC'} - ${m.module_key}`);
    });

    if (remaining.length > 10) {
      console.log(`   ... y ${remaining.length - 10} más\n`);
    }

    await pool.end();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

main();
