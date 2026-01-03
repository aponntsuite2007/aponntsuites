/**
 * Analizar módulo "Bandeja Notificaciones" vs "notification-center"
 */
const database = require('./src/config/database');

(async () => {
  try {
    const { SystemModule, sequelize } = database;

    console.log('\n🔍 ANÁLISIS DE MÓDULOS DE NOTIFICACIONES (BANDEJA)\n');
    console.log('='.repeat(80) + '\n');

    // 1. Buscar módulos relacionados con bandeja/inbox/notificaciones
    const [modules] = await sequelize.query(`
      SELECT
        module_key,
        name,
        description,
        version,
        category,
        is_core,
        parent_module_key,
        metadata
      FROM system_modules
      WHERE
        name ILIKE '%bandeja%'
        OR name ILIKE '%inbox%'
        OR module_key LIKE '%inbox%'
        OR module_key LIKE '%notification%'
      ORDER BY name
    `);

    console.log('📦 MÓDULOS RELACIONADOS CON NOTIFICACIONES/BANDEJA:\n');

    modules.forEach(m => {
      console.log(`${m.module_key}:`);
      console.log(`  Nombre: ${m.name}`);
      console.log(`  Descripción: ${m.description}`);
      console.log(`  Versión: ${m.version}`);
      console.log(`  Categoría: ${m.category}`);
      console.log(`  Core: ${m.is_core}`);
      console.log(`  Parent: ${m.parent_module_key || 'null (módulo raíz)'}`);
      console.log(`  Metadata:`);
      if (m.metadata) {
        console.log(`    - hideFromDashboard: ${m.metadata.hideFromDashboard || false}`);
        console.log(`    - frontend_file: ${m.metadata.frontend_file || 'N/A'}`);
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n🔍 VERIFICACIÓN DE ARCHIVOS:\n');

    const fs = require('fs');

    // Verificar archivos frontend
    modules.forEach(m => {
      const frontendPath = `./public/js/modules/${m.module_key}.js`;
      const exists = fs.existsSync(frontendPath);
      console.log(`  ${m.module_key}: ${exists ? '✅ TIENE' : '❌ NO TIENE'} frontend (${frontendPath})`);
    });

    console.log('\n='.repeat(80));
    console.log('\n🔍 VERIFICACIÓN DE RUTAS BACKEND:\n');

    // Verificar rutas backend
    modules.forEach(m => {
      const routePath = `./src/routes/${m.module_key}Routes.js`;
      const exists = fs.existsSync(routePath);
      console.log(`  ${m.module_key}: ${exists ? '✅ TIENE' : '❌ NO TIENE'} rutas backend (${routePath})`);
    });

    console.log('\n='.repeat(80));
    console.log('\n📊 CONCLUSIÓN:\n');

    const inbox = modules.find(m => m.module_key === 'inbox');
    const notifCenter = modules.find(m => m.module_key === 'notification-center');

    if (inbox && notifCenter) {
      console.log('🔴 MÓDULO "inbox" (Bandeja Notificaciones):');
      console.log(`   - Versión: ${inbox.version}`);
      console.log(`   - Descripción: ${inbox.description}`);
      console.log(`   - Core: ${inbox.is_core}`);

      console.log('\n🟢 MÓDULO "notification-center":');
      console.log(`   - Versión: ${notifCenter.version}`);
      console.log(`   - Descripción: ${notifCenter.description}`);
      console.log(`   - Core: ${notifCenter.is_core}`);

      console.log('\n⚠️  RECOMENDACIÓN:');
      console.log('   - Si ambos hacen lo mismo → ELIMINAR el más antiguo/incompleto');
      console.log('   - Si uno es sub-módulo del otro → Configurar parent_module_key');
      console.log('   - Si son diferentes → Documentar diferencias claramente');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
