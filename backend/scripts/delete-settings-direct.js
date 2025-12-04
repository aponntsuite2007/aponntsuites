/**
 * ELIMINAR MÓDULO "settings" - VERSION DIRECTA (evita trigger bugueado)
 *
 * Reemplazado por la ficha de empresa en panel-administrativo
 * NOTA: NO tocar tabla biometric_settings (la usan otros módulos)
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function deleteSettingsModule() {
  console.log('🗑️  ELIMINANDO MÓDULO "settings" (deprecado)\n');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // 1. Verificar módulo existe
    console.log('1️⃣  Verificando módulo settings...');

    const [moduleInfo] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules
      WHERE module_key = 'settings'
    `);

    if (moduleInfo.length === 0) {
      console.log('   ⚠️  Módulo "settings" no encontrado (ya eliminado?)\n');
      await db.sequelize.close();
      process.exit(0);
    }

    const settingsId = moduleInfo[0].id;
    console.log(`   ID: ${settingsId}`);
    console.log(`   Key: ${moduleInfo[0].module_key}`);
    console.log(`   Name: ${moduleInfo[0].name}`);
    console.log(`   Price: $${moduleInfo[0].base_price}`);
    console.log(`   Is Core: ${moduleInfo[0].is_core}\n`);

    // 2. Verificar asignaciones
    console.log('2️⃣  Verificando asignaciones en company_modules...');

    const [assignments] = await db.sequelize.query(`
      SELECT company_id, activo
      FROM company_modules
      WHERE system_module_id = '${settingsId}'
    `);

    console.log(`   Empresas con este módulo: ${assignments.length}`);
    const activas = assignments.filter(a => a.activo).length;
    console.log(`   Asignaciones activas: ${activas}\n`);

    // 3. ELIMINAR asignaciones DIRECTAMENTE (sin UPDATE que dispara trigger)
    if (assignments.length > 0) {
      console.log('3️⃣  Eliminando asignaciones...');

      const [deleteResult] = await db.sequelize.query(`
        DELETE FROM company_modules
        WHERE system_module_id = '${settingsId}'
      `);

      console.log(`   ✅ ${assignments.length} asignaciones eliminadas\n`);
    } else {
      console.log('3️⃣  Sin asignaciones que eliminar\n');
    }

    // 4. Eliminar de system_modules
    console.log('4️⃣  Eliminando de system_modules...');

    await db.sequelize.query(`
      DELETE FROM system_modules WHERE module_key = 'settings'
    `);

    console.log('   ✅ Módulo eliminado de BD\n');

    // 5. Eliminar archivo frontend
    console.log('5️⃣  Eliminando archivo frontend...');

    const frontendPath = path.join(__dirname, '../public/js/modules/settings.js');

    if (fs.existsSync(frontendPath)) {
      const stats = fs.statSync(frontendPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const lines = fs.readFileSync(frontendPath, 'utf-8').split('\n').length;

      fs.unlinkSync(frontendPath);
      console.log(`   ✅ Archivo eliminado: settings.js`);
      console.log(`   📊 ${lines} líneas, ${sizeKB} KB\n`);
    } else {
      console.log('   ℹ️  Archivo frontend ya no existe\n');
    }

    // 6. Verificar tabla biometric_settings (NO TOCAR)
    console.log('6️⃣  Verificando tabla biometric_settings...');

    const [tableCheck] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM biometric_settings
    `);

    console.log(`   ✅ Tabla biometric_settings intacta (${tableCheck[0].count} registros)`);
    console.log('   ℹ️  Tabla NO eliminada (usada por otros módulos biométricos)\n');

    // 7. Contar módulos finales
    console.log('7️⃣  Módulos finales:');

    const [counts] = await db.sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_core = true) as core,
        COUNT(*) FILTER (WHERE is_core = false) as premium
      FROM system_modules
      WHERE is_active = true
    `);

    console.log(`   Total activos: ${counts[0].total}`);
    console.log(`   CORE: ${counts[0].core}`);
    console.log(`   PREMIUM: ${counts[0].premium}\n`);

    // 8. Módulos con isAdministrative
    const [adminCounts] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE metadata->>'isAdministrative' = 'true'
        AND is_active = true
    `);

    console.log(`   Administrativos: ${adminCounts[0].count}`);
    console.log(`   Comerciales: ${counts[0].total - adminCounts[0].count}\n`);

    await db.sequelize.close();

    console.log('='.repeat(80));
    console.log('✅ ELIMINACIÓN DE "settings" COMPLETADA');
    console.log('='.repeat(80));
    console.log('\n📝 Ejecuta ahora:');
    console.log('   1. node scripts/regenerate-registry-with-administrative.js');
    console.log('   2. node scripts/consolidate-modules-simple.js\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    await db.sequelize.close();
    process.exit(1);
  }
}

deleteSettingsModule();
