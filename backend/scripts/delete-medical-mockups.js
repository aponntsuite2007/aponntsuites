/**
 * CONSOLIDACIÓN MÓDULOS MÉDICOS - Eliminar Mockups
 * ===================================================
 * MANTENER: medical (Gestión Médica) - ÚNICO módulo real
 * ELIMINAR: medical-dashboard ($3), partners-medical (CORE) - Mockups sin implementación
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function deleteMedicalMockups() {
  console.log('🧹 CONSOLIDACIÓN MÓDULOS MÉDICOS\n');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // ========================================
    // 1. ELIMINAR medical-dashboard ($3)
    // ========================================
    console.log('📋 PASO 1: Eliminar medical-dashboard ($3)\n');

    const [dashboardInfo] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules WHERE module_key = 'medical-dashboard'
    `);

    if (dashboardInfo.length > 0) {
      const dashboardId = dashboardInfo[0].id;
      console.log(`📦 Módulo encontrado: ${dashboardInfo[0].name} (${dashboardInfo[0].module_key})`);
      console.log(`   Precio: $${dashboardInfo[0].base_price} | ${dashboardInfo[0].is_core ? 'CORE' : 'PREMIUM'}`);

      // Deactivar asignaciones
      const [assignments] = await db.sequelize.query(`
        SELECT COUNT(*) as count FROM company_modules
        WHERE system_module_id = '${dashboardId}'
      `);

      const assignmentsCount = parseInt(assignments[0].count);
      console.log(`   Asignaciones activas: ${assignmentsCount}`);

      if (assignmentsCount > 0) {
        await db.sequelize.query(`
          DELETE FROM company_modules WHERE system_module_id = '${dashboardId}'
        `);
        console.log(`   ✅ ${assignmentsCount} asignaciones eliminadas`);
      }

      // Eliminar módulo
      await db.sequelize.query(`
        DELETE FROM system_modules WHERE module_key = 'medical-dashboard'
      `);
      console.log('   ✅ Módulo medical-dashboard eliminado de BD\n');
    } else {
      console.log('   ⚠️  Módulo medical-dashboard no encontrado en BD\n');
    }

    // ========================================
    // 2. ELIMINAR partners-medical (CORE)
    // ========================================
    console.log('📋 PASO 2: Eliminar partners-medical (CORE)\n');

    const [partnersInfo] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules WHERE module_key = 'partners-medical'
    `);

    if (partnersInfo.length > 0) {
      const partnersId = partnersInfo[0].id;
      console.log(`📦 Módulo encontrado: ${partnersInfo[0].name} (${partnersInfo[0].module_key})`);
      console.log(`   Precio: $${partnersInfo[0].base_price} | ${partnersInfo[0].is_core ? 'CORE' : 'PREMIUM'}`);

      // Deactivar asignaciones
      const [assignments] = await db.sequelize.query(`
        SELECT COUNT(*) as count FROM company_modules
        WHERE system_module_id = '${partnersId}'
      `);

      const assignmentsCount = parseInt(assignments[0].count);
      console.log(`   Asignaciones activas: ${assignmentsCount}`);

      if (assignmentsCount > 0) {
        await db.sequelize.query(`
          DELETE FROM company_modules WHERE system_module_id = '${partnersId}'
        `);
        console.log(`   ✅ ${assignmentsCount} asignaciones eliminadas`);
      }

      // Eliminar módulo
      await db.sequelize.query(`
        DELETE FROM system_modules WHERE module_key = 'partners-medical'
      `);
      console.log('   ✅ Módulo partners-medical eliminado de BD\n');
    } else {
      console.log('   ⚠️  Módulo partners-medical no encontrado en BD\n');
    }

    // ========================================
    // 3. ELIMINAR FRONTEND: medical-dashboard.js (142 KB)
    // ========================================
    console.log('📋 PASO 3: Eliminar frontend medical-dashboard.js (142 KB)\n');

    const frontendPath = path.join(__dirname, '../public/js/modules/medical-dashboard.js');
    if (fs.existsSync(frontendPath)) {
      const stats = fs.statSync(frontendPath);
      const sizeKB = (stats.size / 1024).toFixed(2);

      // Crear backup
      const backupPath = frontendPath + '.backup';
      fs.copyFileSync(frontendPath, backupPath);
      console.log(`   💾 Backup creado: ${backupPath}`);

      // Eliminar archivo
      fs.unlinkSync(frontendPath);
      console.log(`   ✅ Archivo eliminado: medical-dashboard.js (${sizeKB} KB)\n`);
    } else {
      console.log('   ⚠️  Archivo medical-dashboard.js no encontrado\n');
    }

    // ========================================
    // 4. ELIMINAR BACKEND: medicalRoutes-simple.js (mockup)
    // ========================================
    console.log('📋 PASO 4: Eliminar backend medicalRoutes-simple.js (mockup)\n');

    const backendPath = path.join(__dirname, '../src/routes/medicalRoutes-simple.js');
    if (fs.existsSync(backendPath)) {
      const stats = fs.statSync(backendPath);
      const sizeKB = (stats.size / 1024).toFixed(2);

      // Crear backup
      const backupPath = backendPath + '.backup';
      fs.copyFileSync(backendPath, backupPath);
      console.log(`   💾 Backup creado: ${backupPath}`);

      // Eliminar archivo
      fs.unlinkSync(backendPath);
      console.log(`   ✅ Archivo eliminado: medicalRoutes-simple.js (${sizeKB} KB)\n`);
    } else {
      console.log('   ⚠️  Archivo medicalRoutes-simple.js no encontrado\n');
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('📊 RESUMEN FINAL\n');

    const [remaining] = await db.sequelize.query(`
      SELECT module_key, name, is_core, base_price
      FROM system_modules
      WHERE module_key LIKE '%medical%' OR name ILIKE '%médic%'
      ORDER BY module_key
    `);

    console.log(`✅ Módulos médicos restantes: ${remaining.length}\n`);
    remaining.forEach(m => {
      const type = m.is_core ? 'CORE' : 'PREMIUM';
      console.log(`   📦 ${m.module_key} (${m.name}) - ${type}, $${m.base_price}`);
    });

    console.log('\n✅ CONSOLIDACIÓN COMPLETADA');
    console.log('   Eliminados: medical-dashboard ($3), partners-medical (CORE)');
    console.log('   Mantenido: medical (Gestión Médica) - Módulo funcional');
    console.log('\n⚠️  SIGUIENTE PASO: Actualizar server.js (eliminar require de medicalRoutes-simple)');

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    await db.sequelize.close();
    process.exit(1);
  }
}

deleteMedicalMockups();
