/**
 * Registrar módulo user-support y asignarlo a ISI
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function registerModule() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📦 REGISTRANDO MÓDULO user-support');
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    // 1. Verificar si ya existe
    const existing = await pool.query(
      "SELECT id, module_key, name FROM system_modules WHERE module_key = 'user-support'"
    );

    let moduleId;

    if (existing.rows.length > 0) {
      console.log('✅ Módulo ya existe:', existing.rows[0].name);
      moduleId = existing.rows[0].id;
    } else {
      // 2. Insertar con gen_random_uuid()
      const insertResult = await pool.query(`
        INSERT INTO system_modules (id, module_key, name, category, description, is_active, is_core, created_at, updated_at)
        VALUES (gen_random_uuid(), 'user-support', 'Soporte / Tickets', 'support', 'Dashboard de tickets de soporte para usuarios con dark theme', true, true, NOW(), NOW())
        RETURNING id, module_key, name
      `);
      console.log('✅ Módulo creado:', insertResult.rows[0].name);
      moduleId = insertResult.rows[0].id;
    }

    // 3. Asignar a ISI (company_id = 11)
    const assignExisting = await pool.query(
      'SELECT * FROM company_modules WHERE company_id = 11 AND system_module_id = $1',
      [moduleId]
    );

    if (assignExisting.rows.length > 0) {
      console.log('✅ Ya asignado a ISI');
    } else {
      await pool.query(`
        INSERT INTO company_modules (company_id, system_module_id, is_active, created_at, updated_at)
        VALUES (11, $1, true, NOW(), NOW())
      `, [moduleId]);
      console.log('✅ Asignado a ISI (company_id=11)');
    }

    // 4. Verificar módulos actuales de ISI
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 MÓDULOS ACTUALES DE ISI:');
    console.log('═══════════════════════════════════════════════════════════════');

    const modules = await pool.query(`
      SELECT sm.module_key, sm.name, sm.category
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11 AND cm.is_active = true
      ORDER BY sm.category, sm.module_key
    `);

    modules.rows.forEach((m, i) => {
      const badge = m.module_key === 'user-support' ? ' ⭐ NUEVO' : '';
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(25)} | ${m.name}${badge}`);
    });

    console.log('');
    console.log(`Total: ${modules.rows.length} módulos`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

registerModule();
