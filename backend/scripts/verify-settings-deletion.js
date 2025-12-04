/**
 * VERIFICAR QUE SE ELIMINÓ EL MÓDULO "settings" CORRECTAMENTE
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function verify() {
  try {
    await db.sequelize.authenticate();

    console.log('🔍 VERIFICACIÓN COMPLETA:\n');

    // 1. Ver si módulo EXISTE en BD
    const [existing] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules
      WHERE module_key = 'settings'
    `);

    console.log('1️⃣  MÓDULO en BD:');
    if (existing.length > 0) {
      console.log('   ❌ MÓDULO AÚN EXISTE:');
      existing.forEach(m => {
        console.log(`      ID: ${m.id}`);
        console.log(`      Key: ${m.module_key}`);
        console.log(`      Name: ${m.name}`);
      });
      console.log('');
    } else {
      console.log('   ✅ Módulo NO encontrado en BD (eliminado correctamente)\n');
    }

    // 2. Ver si archivo frontend existe
    console.log('2️⃣  ARCHIVO FRONTEND:');

    const frontendPath = path.join(__dirname, '../public/js/modules/settings.js');

    if (fs.existsSync(frontendPath)) {
      const stats = fs.statSync(frontendPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   ❌ Archivo settings.js TODAVÍA EXISTE (${sizeKB} KB)\n`);
    } else {
      console.log('   ✅ Archivo settings.js NO existe (eliminado correctamente)\n');
    }

    // 3. Ver asignaciones en company_modules
    console.log('3️⃣  ASIGNACIONES EN COMPANY_MODULES:');

    const [assignments] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE sm.module_key = 'settings'
    `);

    const assignmentsCount = (assignments && assignments[0]) ? parseInt(assignments[0].count) : 0;

    if (assignmentsCount > 0) {
      console.log(`   ❌ Hay ${assignmentsCount} asignaciones todavía\n`);
    } else {
      console.log('   ✅ Sin asignaciones (eliminadas correctamente)\n');
    }

    // 4. Verificar tabla biometric_settings (NO debe estar eliminada)
    console.log('4️⃣  TABLA biometric_settings:');

    const [tableCheck] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM biometric_settings
    `);

    console.log(`   ✅ Tabla intacta (${tableCheck[0].count} registros)`);
    console.log('   ℹ️  Tabla NO eliminada (usada por otros módulos)\n');

    // 5. Contar módulos totales
    console.log('5️⃣  MÓDULOS FINALES:');

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

    // 6. Administrativos
    const [adminCounts] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE metadata->>'isAdministrative' = 'true'
        AND is_active = true
    `);

    console.log(`   Administrativos: ${adminCounts[0].count}`);
    console.log(`   Comerciales: ${counts[0].total - adminCounts[0].count}\n`);

    // 7. RESUMEN
    console.log('📊 RESUMEN:');
    if (existing.length === 0 && !fs.existsSync(frontendPath) && assignmentsCount === 0) {
      console.log('   ✅ ÉXITO: Módulo "settings" eliminado completamente');
      console.log('   ✅ BD: Módulo no existe');
      console.log('   ✅ Frontend: Archivo no existe');
      console.log('   ✅ Asignaciones: Ninguna');
      console.log('   ✅ Tabla biometric_settings intacta\n');
    } else {
      console.log('   ⚠️  ADVERTENCIA: Revisar estado de eliminación\n');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

verify();
