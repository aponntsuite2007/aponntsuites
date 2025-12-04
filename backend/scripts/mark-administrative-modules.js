/**
 * MARCAR MÓDULOS ADMINISTRATIVOS (NO COMERCIALIZABLES)
 *
 * Estos módulos son CORE del sistema pero NO son comercializables para clientes.
 * Son usados internamente por panel-administrativo y panel-empresa pero no se
 * presupuestan ni aparecen en el catálogo comercial.
 */

const db = require('../src/config/database');

// 7 módulos administrativos (NO comercializables)
const ADMINISTRATIVE_MODULES = [
  'companies',           // Multi-tenancy interno
  'vendors',            // Gestión de vendedores y comisiones
  'partners',           // Gestión de partners y asociados
  'auditor',            // Sistema de auditoría y testing
  'licensing-management', // Administración de licencias
  'knowledge-base',     // Base de conocimiento para soporte
  'resource-center'     // Biblioteca de recursos y documentación
];

async function markAdministrativeModules() {
  console.log('🛠️  MARCANDO MÓDULOS ADMINISTRATIVOS');
  console.log('='.repeat(80));
  console.log('');
  console.log('Estos módulos son CORE pero NO comercializables:');
  console.log('- NO aparecen en catálogo para clientes');
  console.log('- NO se presupuestan');
  console.log('- Uso interno del sistema (panel-admin y panel-empresa)');
  console.log('');

  try {
    await db.sequelize.authenticate();
    console.log('✅ Conectado a BD\n');

    // Verificar que el campo metadata existe en BD
    const [columns] = await db.sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'system_modules' AND column_name = 'metadata'
    `);

    if (columns.length === 0) {
      console.log('⚠️  Campo "metadata" no existe en system_modules');
      console.log('   Vamos a usar otra estrategia (campo category)');
    }

    console.log('📋 MÓDULOS A MARCAR COMO ADMINISTRATIVOS:\n');

    for (const moduleKey of ADMINISTRATIVE_MODULES) {
      // Obtener módulo actual
      const [current] = await db.sequelize.query(
        `SELECT module_key, name, is_core, category, metadata
         FROM system_modules
         WHERE module_key = :key`,
        { replacements: { key: moduleKey } }
      );

      if (current.length === 0) {
        console.log(`   ⚠️  ${moduleKey.padEnd(25)} | NO ENCONTRADO`);
        continue;
      }

      const mod = current[0];

      // Actualizar metadata para marcar como administrativo
      let metadata = mod.metadata || {};
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }

      metadata.isAdministrative = true;
      metadata.isCommercial = false;
      metadata.usage = 'internal';
      metadata.visibleInCatalog = false;

      await db.sequelize.query(
        `UPDATE system_modules
         SET metadata = :metadata
         WHERE module_key = :key`,
        {
          replacements: {
            metadata: JSON.stringify(metadata),
            key: moduleKey
          }
        }
      );

      console.log(`   ✓ ${moduleKey.padEnd(25)} | ${mod.name}`);
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE CLASIFICACIÓN\n');

    const [coreCommercial] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE is_core = true
        AND is_active = true
        AND (metadata->>'isAdministrative' IS NULL OR metadata->>'isAdministrative' = 'false')
    `);

    const [coreAdmin] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE is_core = true
        AND is_active = true
        AND metadata->>'isAdministrative' = 'true'
    `);

    const [premium] = await db.sequelize.query(`
      SELECT COUNT(*) as count
      FROM system_modules
      WHERE is_core = false AND is_active = true
    `);

    console.log(`CORE Comercial (presupuestables):     ${coreCommercial[0].count}`);
    console.log(`CORE Administrativo (NO comercial):   ${coreAdmin[0].count}`);
    console.log(`PREMIUM (comercializables):           ${premium[0].count}`);
    console.log(`TOTAL:                                ${coreCommercial[0].count + coreAdmin[0].count + premium[0].count}`);

    console.log('\n📋 CORE COMERCIALES (los que SÍ van al catálogo):\n');
    const [coreCommercialModules] = await db.sequelize.query(`
      SELECT module_key, name
      FROM system_modules
      WHERE is_core = true
        AND is_active = true
        AND (metadata->>'isAdministrative' IS NULL OR metadata->>'isAdministrative' = 'false')
      ORDER BY module_key
    `);

    coreCommercialModules.forEach(m => {
      console.log(`   ✓ ${m.module_key.padEnd(35)} | ${m.name}`);
    });

    await db.sequelize.close();

    console.log('\n' + '='.repeat(80));
    console.log('✅ MÓDULOS ADMINISTRATIVOS MARCADOS');
    console.log('='.repeat(80));
    console.log('\n📝 PRÓXIMO PASO:');
    console.log('   1. Regenerar registry con nueva clasificación');
    console.log('   2. Actualizar frontend para separar tabs');
    console.log('   3. "💰 Módulos Comerciales" → Solo comercializables');
    console.log('   4. "🛠️ Módulos Administrativos" → Uso interno\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

markAdministrativeModules();
