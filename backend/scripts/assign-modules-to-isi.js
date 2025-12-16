/**
 * Asignar módulos a ISI (company_id = 11)
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

const MODULES_TO_ASSIGN = [
  'hours-cube-dashboard',
  'resource-center',
  'support-base'
];

const COMPANY_ID = 11; // ISI

async function assignModules() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('📦 ASIGNANDO MÓDULOS A ISI (company_id = 11)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    for (const moduleKey of MODULES_TO_ASSIGN) {
      // 1. Obtener el ID del módulo
      const moduleResult = await pool.query(
        'SELECT id, module_key, name FROM system_modules WHERE module_key = $1',
        [moduleKey]
      );

      if (moduleResult.rows.length === 0) {
        console.log(`❌ Módulo "${moduleKey}" no encontrado en system_modules`);
        continue;
      }

      const module = moduleResult.rows[0];

      // 2. Verificar si ya está asignado
      const existingResult = await pool.query(
        'SELECT id FROM company_modules WHERE company_id = $1 AND system_module_id = $2',
        [COMPANY_ID, module.id]
      );

      if (existingResult.rows.length > 0) {
        console.log(`⚠️  "${moduleKey}" ya está asignado a ISI - actualizando a activo`);
        await pool.query(
          'UPDATE company_modules SET is_active = true WHERE company_id = $1 AND system_module_id = $2',
          [COMPANY_ID, module.id]
        );
      } else {
        // 3. Insertar asignación
        await pool.query(`
          INSERT INTO company_modules (company_id, system_module_id, is_active, activo, fecha_asignacion, created_at, updated_at)
          VALUES ($1, $2, true, true, NOW(), NOW(), NOW())
        `, [COMPANY_ID, module.id]);
        console.log(`✅ "${moduleKey}" (${module.name}) asignado a ISI`);
      }
    }

    // 4. Verificar resultado
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('📋 MÓDULOS ACTUALES DE ISI:');
    console.log('═══════════════════════════════════════════════════════════════════════');

    const finalResult = await pool.query(`
      SELECT sm.module_key, sm.name, sm.category
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = $1 AND cm.is_active = true
      ORDER BY sm.category, sm.module_key
    `, [COMPANY_ID]);

    finalResult.rows.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(25)} | ${m.name.padEnd(35)} | ${m.category}`);
    });

    console.log('');
    console.log(`Total: ${finalResult.rows.length} módulos asignados a ISI`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

assignModules();
