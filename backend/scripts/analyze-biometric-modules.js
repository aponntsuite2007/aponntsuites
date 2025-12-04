/**
 * ANALIZAR TODOS LOS MÓDULOS RELACIONADOS CON BIOMETRÍA
 */

const db = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function analyzeBiometricModules() {
  await db.sequelize.authenticate();

  console.log('\n🔍 ANÁLISIS DE MÓDULOS BIOMÉTRICOS\n');
  console.log('='.repeat(100));

  // 1. Buscar módulos en BD
  const [modules] = await db.sequelize.query(`
    SELECT id, module_key, name, base_price, is_core, is_active, icon, description
    FROM system_modules
    WHERE (
      module_key LIKE '%biometric%' OR
      module_key LIKE '%biometria%' OR
      name ILIKE '%biométric%' OR
      name ILIKE '%biometric%'
    )
    AND is_active = true
    ORDER BY module_key
  `);

  console.log(`\n📊 Total módulos encontrados: ${modules.length}\n`);

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    console.log(`${i + 1}. ${m.module_key}`);
    console.log(`   Nombre: ${m.name}`);
    console.log(`   Precio: $${m.base_price}`);
    console.log(`   CORE: ${m.is_core}`);
    console.log(`   Icon: ${m.icon || 'N/A'}`);
    console.log(`   Desc: ${m.description || 'N/A'}`);

    // Verificar si tiene backend
    const backendPath = path.join(__dirname, `../src/routes/${m.module_key}Routes.js`);
    const hasBackend = fs.existsSync(backendPath);

    // Verificar si tiene frontend
    const frontendPath = path.join(__dirname, `../public/js/modules/${m.module_key}.js`);
    const hasFrontend = fs.existsSync(frontendPath);

    console.log(`   Backend: ${hasBackend ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Frontend: ${hasFrontend ? '✅ SÍ' : '❌ NO'}`);

    if (hasBackend) {
      const stats = fs.statSync(backendPath);
      console.log(`   Backend size: ${(stats.size / 1024).toFixed(2)} KB`);
    }

    if (hasFrontend) {
      const stats = fs.statSync(frontendPath);
      const lines = fs.readFileSync(frontendPath, 'utf-8').split('\n').length;
      console.log(`   Frontend: ${lines} líneas, ${(stats.size / 1024).toFixed(2)} KB`);
    }

    console.log('');
  }

  console.log('='.repeat(100));
  console.log('\n📋 RESUMEN:\n');

  const withBackend = modules.filter(m => {
    const backendPath = path.join(__dirname, `../src/routes/${m.module_key}Routes.js`);
    return fs.existsSync(backendPath);
  });

  const withFrontend = modules.filter(m => {
    const frontendPath = path.join(__dirname, `../public/js/modules/${m.module_key}.js`);
    return fs.existsSync(frontendPath);
  });

  const complete = modules.filter(m => {
    const backendPath = path.join(__dirname, `../src/routes/${m.module_key}Routes.js`);
    const frontendPath = path.join(__dirname, `../public/js/modules/${m.module_key}.js`);
    return fs.existsSync(backendPath) && fs.existsSync(frontendPath);
  });

  const mockups = modules.filter(m => {
    const backendPath = path.join(__dirname, `../src/routes/${m.module_key}Routes.js`);
    const frontendPath = path.join(__dirname, `../public/js/modules/${m.module_key}.js`);
    return !fs.existsSync(backendPath) && !fs.existsSync(frontendPath);
  });

  console.log(`   Módulos CON backend: ${withBackend.length}`);
  withBackend.forEach(m => console.log(`      - ${m.module_key}`));

  console.log(`\n   Módulos CON frontend: ${withFrontend.length}`);
  withFrontend.forEach(m => console.log(`      - ${m.module_key}`));

  console.log(`\n   Módulos COMPLETOS (backend + frontend): ${complete.length}`);
  complete.forEach(m => console.log(`      - ${m.module_key}`));

  console.log(`\n   Módulos SIN IMPLEMENTACIÓN (mockups): ${mockups.length}`);
  mockups.forEach(m => console.log(`      - ${m.module_key} (${m.name})`));

  console.log('\n' + '='.repeat(100));

  await db.sequelize.close();
  process.exit(0);
}

analyzeBiometricModules();
