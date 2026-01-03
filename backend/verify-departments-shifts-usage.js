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
    console.log('\n🔍 VERIFICANDO USO DE departments y shifts EN EMPRESAS\n');
    console.log('═'.repeat(80));

    const usage = await pool.query(`
      SELECT
        c.name as empresa,
        c.id as company_id,
        sm.module_key,
        cm.is_active
      FROM company_modules cm
      JOIN system_modules sm ON sm.id = cm.system_module_key
      JOIN companies c ON c.id = cm.company_id
      WHERE sm.module_key IN ('departments', 'shifts')
      ORDER BY c.name, sm.module_key
    `);

    if (usage.rows.length === 0) {
      console.log('✅ RESULTADO: NINGUNA EMPRESA USA estos módulos\n');
      console.log('🗑️  SEGURO BORRAR - No hay referencias en company_modules\n');
      console.log('Recomendación: Ejecutar OPCIÓN B (Eliminar duplicados obsoletos)\n');
    } else {
      console.log(`⚠️  RESULTADO: ${usage.rows.length} empresas USAN estos módulos\n`);
      console.log('EMPRESA'.padEnd(30), '| MODULE_KEY'.padEnd(20), '| ACTIVO');
      console.log('─'.repeat(60));
      usage.rows.forEach(r => {
        const active = r.is_active ? '✅ Sí' : '❌ No';
        console.log(
          r.empresa.substring(0, 28).padEnd(30),
          '|', r.module_key.padEnd(20),
          '|', active
        );
      });
      console.log('\n❌ NO BORRAR - Ejecutar OPCIÓN A (Marcar como submódulos)\n');
    }

    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nℹ️  Si hay error de columna, significa que company_modules usa otra estructura.');
    console.log('   Verificar manualmente con: SELECT * FROM company_modules LIMIT 5;\n');
  } finally {
    await pool.end();
  }
}

main();
