const fs = require('fs');
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
    console.log('\n🚀 EJECUTANDO MIGRACIÓN: Sistema de Jerarquías de Módulos\n');
    console.log('═'.repeat(80));

    // Leer archivo SQL
    const sqlPath = './migrations/20251229_add_module_hierarchy.sql';
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Ejecutar migración
    console.log('📄 Ejecutando:', sqlPath);
    await pool.query(sql);

    console.log('\n✅ MIGRACIÓN EXITOSA\n');
    console.log('═'.repeat(80));

    // Verificar resultados
    const result = await pool.query(`
      SELECT
        module_key,
        name,
        module_type,
        parent_module_key,
        is_core
      FROM system_modules
      WHERE module_key IN ('organizational-structure', 'departments', 'shifts', 'roles-permissions')
      ORDER BY
        CASE module_type
          WHEN 'container' THEN 1
          WHEN 'submodule' THEN 2
          WHEN 'standalone' THEN 3
        END,
        module_key
    `);

    console.log('\n📊 MÓDULOS CLASIFICADOS:\n');
    console.log('MODULE_KEY'.padEnd(30), '| TYPE'.padEnd(15), '| PARENT');
    console.log('─'.repeat(70));

    result.rows.forEach(r => {
      const type = r.module_type || 'standalone';
      const parent = r.parent_module_key || '-';
      const icon = type === 'container' ? '📦' : type === 'submodule' ? '  └─' : '📄';
      console.log(
        `${icon} ${r.module_key.padEnd(26)}`,
        '|', type.padEnd(13),
        '|', parent
      );
    });

    console.log('\n═'.repeat(80));
    console.log('\n✅ SIGUIENTE PASO: Actualizar dashboard para ocultar submodules\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message, '\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
