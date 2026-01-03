const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function main() {
  try {
    console.log('\n🔍 VERIFICACIÓN FINAL: USO DE departments y shifts\n');
    console.log('═'.repeat(90));

    const usage = await pool.query(`
      SELECT
        c.name as empresa,
        c.id as company_id,
        sm.module_key,
        cm.is_active,
        cm.activo as activo_legacy
      FROM company_modules cm
      JOIN system_modules sm ON sm.id = cm.system_module_id
      JOIN companies c ON c.id = cm.company_id
      WHERE sm.module_key IN ('departments', 'shifts')
      ORDER BY c.name, sm.module_key
    `);

    if (usage.rows.length === 0) {
      console.log('✅ RESULTADO: NINGUNA EMPRESA USA departments o shifts\n');
      console.log('🗑️  ES SEGURO BORRAR - No hay referencias en company_modules\n');
      console.log('📋 RECOMENDACIÓN: OPCIÓN B (Eliminar duplicados obsoletos)\n');
      console.log('═'.repeat(90));
      console.log('\n💡 Puedes ejecutar:');
      console.log('   node scripts/delete-orphan-modules.js departments shifts\n');
    } else {
      console.log(`⚠️  ENCONTRADAS ${usage.rows.length} REFERENCIAS\n`);
      console.log('EMPRESA'.padEnd(30), '| MODULE'.padEnd(15), '| ACTIVO');
      console.log('─'.repeat(60));
      usage.rows.forEach(r => {
        const active = r.is_active ? '✅ Sí' : '❌ No';
        console.log(
          r.empresa.substring(0, 28).padEnd(30),
          '|', r.module_key.padEnd(15),
          '|', active
        );
      });
      console.log('\n❌ NO BORRAR - Hay empresas usando estos módulos\n');
      console.log('📋 RECOMENDACIÓN: OPCIÓN A (Marcar como submódulos)\n');
      console.log('═'.repeat(90));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message, '\n');
  } finally {
    await pool.end();
  }
}

main();
