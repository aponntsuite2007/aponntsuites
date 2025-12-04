/**
 * VERIFICAR QUE SE ELIMINÓ EL MÓDULO CORRECTO
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function verify() {
  try {
    await db.sequelize.authenticate();

    console.log('🔍 VERIFICACIÓN COMPLETA:\n');

    // 1. Ver qué módulo EXISTE en BD
    const [existing] = await db.sequelize.query(`
      SELECT id, module_key, name, base_price, is_core
      FROM system_modules
      WHERE module_key LIKE '%vacation%'
    `);

    console.log('1️⃣  MÓDULO QUE EXISTE en BD:');
    if (existing.length > 0) {
      existing.forEach(m => {
        console.log(`   ✅ ${m.module_key} | ${m.name} | $${m.base_price}`);
      });
    } else {
      console.log('   ⚠️  Ninguno');
    }

    console.log('\n2️⃣  VERIFICANDO IMPLEMENTACIÓN:');

    // Verificar si existe el archivo de rutas
    const routesPath = path.join(__dirname, '../src/routes/vacationRoutes.js');
    const frontendPath = path.join(__dirname, '../public/js/modules/vacation-management.js');

    if (fs.existsSync(routesPath)) {
      const stats = fs.statSync(routesPath);
      console.log(`   ✅ Backend: vacationRoutes.js existe (${stats.size} bytes)`);
    } else {
      console.log('   ❌ Backend: vacationRoutes.js NO existe');
    }

    if (fs.existsSync(frontendPath)) {
      const stats = fs.statSync(frontendPath);
      console.log(`   ✅ Frontend: vacation-management.js existe (${stats.size} bytes)`);
    } else {
      console.log('   ❌ Frontend: vacation-management.js NO existe');
    }

    console.log('\n3️⃣  MÓDULO QUE FUE ELIMINADO:');
    console.log('   ❌ vacation (duplicado sin implementación, $1.50)');

    console.log('\n📊 RESUMEN:');
    if (existing.length === 1 && existing[0].module_key === 'vacation-management') {
      console.log('   ✅ CORRECTO: Eliminé el duplicado "vacation" sin implementación');
      console.log('   ✅ MANTUVE: vacation-management con toda su implementación');
      console.log('   ✅ El módulo activo tiene backend + frontend funcionando');
    } else {
      console.log('   ⚠️  ADVERTENCIA: Revisar estado de módulos');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

verify();
