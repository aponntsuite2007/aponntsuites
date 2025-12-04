/**
 * FASE 2: RENOMBRAR Y CREAR MÓDULOS BIOMÉTRICOS
 *
 * 1. Renombrar: biometric-dashboard → biometric-registration (CORE)
 * 2. Crear: emotional-analysis (PREMIUM)
 */

const db = require('../src/config/database');

async function renameAndCreateModules() {
  console.log('🔧 RENOMBRANDO Y CREANDO MÓDULOS BIOMÉTRICOS\n');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // 1. RENOMBRAR biometric-dashboard → biometric-registration
    console.log('1️⃣  Renombrando biometric-dashboard...');

    const [dashboardInfo] = await db.sequelize.query(`
      SELECT id, module_key, name FROM system_modules
      WHERE module_key = 'biometric-dashboard'
    `);

    if (dashboardInfo.length > 0) {
      await db.sequelize.query(`
        UPDATE system_modules
        SET
          module_key = 'biometric-registration',
          name = 'Registro Biométrico',
          description = 'Captura y registro de biometría facial de empleados para control de acceso',
          icon = '📸',
          is_core = true,
          base_price = 0.00
        WHERE module_key = 'biometric-dashboard'
      `);

      console.log('   ✅ biometric-dashboard → biometric-registration (CORE, $0)\n');
    } else {
      console.log('   ⚠️  biometric-dashboard no encontrado\n');
    }

    // 2. VERIFICAR si emotional-analysis ya existe
    console.log('2️⃣  Verificando emotional-analysis...');

    const [emotionalExists] = await db.sequelize.query(`
      SELECT id, module_key FROM system_modules
      WHERE module_key = 'emotional-analysis'
    `);

    if (emotionalExists.length > 0) {
      console.log('   ℹ️  emotional-analysis ya existe\n');
    } else {
      // Crear módulo emotional-analysis
      await db.sequelize.query(`
        INSERT INTO system_modules (
          module_key, name, icon, category, is_core, base_price,
          description, is_active, metadata
        ) VALUES (
          'emotional-analysis',
          'Análisis Emocional y Fatiga',
          '📊',
          'biometric',
          false,
          15.00,
          'Análisis avanzado de emociones, fatiga y wellness basado en Azure Face API',
          true,
          '{"requiresConsent": true, "usesAzure": true, "features": ["emotions", "fatigue", "wellness", "posture"]}'::jsonb
        )
      `);

      console.log('   ✅ emotional-analysis creado (PREMIUM, $15.00)\n');
    }

    // 3. ACTUALIZAR biometric-consent para asegurar que es CORE
    console.log('3️⃣  Actualizando biometric-consent...');

    await db.sequelize.query(`
      UPDATE system_modules
      SET
        is_core = true,
        base_price = 0.00,
        description = 'Gestión de consentimientos biométricos (Ley 25.326 - GDPR)'
      WHERE module_key = 'biometric-consent'
    `);

    console.log('   ✅ biometric-consent actualizado (CORE, $0)\n');

    // 4. RESUMEN FINAL
    console.log('4️⃣  Módulos biométricos finales:');

    const [biometricModules] = await db.sequelize.query(`
      SELECT module_key, name, is_core, base_price, description
      FROM system_modules
      WHERE module_key IN ('biometric-registration', 'biometric-consent', 'emotional-analysis')
      ORDER BY is_core DESC, module_key
    `);

    biometricModules.forEach(m => {
      const type = m.is_core ? 'CORE' : 'PREMIUM';
      console.log(`   ${type} | ${m.module_key}`);
      console.log(`        Nombre: ${m.name}`);
      console.log(`        Precio: $${m.base_price}`);
      console.log(`        Desc: ${m.description}`);
      console.log('');
    });

    // 5. CONTAR TOTALES
    const [counts] = await db.sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_core = true) as core,
        COUNT(*) FILTER (WHERE is_core = false) as premium
      FROM system_modules
      WHERE is_active = true
    `);

    console.log('📊 TOTALES:');
    console.log(`   Total: ${counts[0].total}`);
    console.log(`   CORE: ${counts[0].core}`);
    console.log(`   PREMIUM: ${counts[0].premium}\n`);

    await db.sequelize.close();

    console.log('='.repeat(80));
    console.log('✅ RENOMBRADO Y CREACIÓN COMPLETADOS');
    console.log('='.repeat(80));

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    await db.sequelize.close();
    process.exit(1);
  }
}

renameAndCreateModules();
