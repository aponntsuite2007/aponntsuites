/**
 * Eliminar completamente el módulo resource-center de la base de datos
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function removeModule() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🗑️  ELIMINANDO MÓDULO resource-center COMPLETAMENTE');
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    // 1. Obtener ID del módulo
    const moduleResult = await pool.query(
      "SELECT id, module_key, name FROM system_modules WHERE module_key = 'resource-center'"
    );

    if (moduleResult.rows.length === 0) {
      console.log('⚠️  Módulo resource-center no existe en system_modules');
    } else {
      const module = moduleResult.rows[0];
      console.log(`📦 Módulo encontrado: ${module.name} (ID: ${module.id})`);

      // 2. Eliminar de company_modules (todas las empresas)
      const deleteCompanyModules = await pool.query(
        'DELETE FROM company_modules WHERE system_module_id = $1 RETURNING company_id',
        [module.id]
      );
      console.log(`✅ Eliminado de ${deleteCompanyModules.rows.length} empresas (company_modules)`);

      // 3. Eliminar de system_modules
      const deleteSystemModule = await pool.query(
        'DELETE FROM system_modules WHERE id = $1 RETURNING module_key',
        [module.id]
      );
      if (deleteSystemModule.rows.length > 0) {
        console.log(`✅ Eliminado de system_modules: ${deleteSystemModule.rows[0].module_key}`);
      }
    }

    // 4. Verificar resultado final
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 VERIFICACIÓN FINAL:');
    console.log('═══════════════════════════════════════════════════════════════');

    const verifyResult = await pool.query(
      "SELECT module_key, name FROM system_modules WHERE module_key LIKE '%resource%' OR name LIKE '%Recursos%'"
    );

    if (verifyResult.rows.length === 0) {
      console.log('✅ No quedan módulos con "resource" o "Recursos" en la DB');
    } else {
      console.log('⚠️  Módulos restantes con "resource":');
      verifyResult.rows.forEach(m => console.log(`   - ${m.module_key}: ${m.name}`));
    }

    // 5. Mostrar módulos de ISI actuales
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 MÓDULOS ACTUALES DE ISI (company_id=11):');
    console.log('═══════════════════════════════════════════════════════════════');

    const isiModules = await pool.query(`
      SELECT sm.module_key, sm.name
      FROM company_modules cm
      JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = 11 AND cm.is_active = true
      ORDER BY sm.module_key
    `);

    isiModules.rows.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m.module_key.padEnd(28)} | ${m.name}`);
    });

    console.log('');
    console.log(`Total: ${isiModules.rows.length} módulos`);
    console.log('');
    console.log('✅ LIMPIEZA COMPLETADA');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

removeModule();
