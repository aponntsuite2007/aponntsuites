/**
 * Analizar relación entre notifications y notification-center
 */
const database = require('./src/config/database');
const fs = require('fs');

(async () => {
  try {
    const { SystemModule, sequelize } = database;

    console.log('\n🔍 ANÁLISIS DE MÓDULOS DE NOTIFICACIONES\n');
    console.log('='.repeat(80) + '\n');

    // 1. Buscar ambos módulos en system_modules
    const modules = await SystemModule.findAll({
      where: {
        module_key: ['notifications', 'notification-center']
      },
      raw: true
    });

    console.log('📦 MÓDULOS EN SYSTEM_MODULES:\n');

    modules.forEach(m => {
      console.log(`${m.module_key}:`);
      console.log(`  Nombre: ${m.name}`);
      console.log(`  Descripción: ${m.description}`);
      console.log(`  Parent: ${m.parent_module_key || 'null (módulo raíz)'}`);
      console.log(`  Core: ${m.is_core}`);
      console.log(`  Version: ${m.version}`);
      console.log(`  Category: ${m.category}`);
      console.log(`  Frontend: ${m.metadata?.frontend_file || 'N/A'}`);
      console.log(`  hideFromDashboard: ${m.metadata?.hideFromDashboard || false}`);
      console.log('');
    });

    // 2. Buscar archivos de backend relacionados
    console.log('='.repeat(80));
    console.log('\n📂 ARCHIVOS DE BACKEND:\n');

    const notifRoutes = fs.existsSync('./src/routes/notificationsRoutes.js');
    const notifCenterRoutes = fs.existsSync('./src/routes/notificationCenterRoutes.js');

    console.log(`  notifications: src/routes/notificationsRoutes.js - ${notifRoutes ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    console.log(`  notification-center: src/routes/notificationCenterRoutes.js - ${notifCenterRoutes ? '✅ EXISTE' : '❌ NO EXISTE'}`);

    // 3. Buscar archivos de frontend
    console.log('\n📂 ARCHIVOS DE FRONTEND:\n');

    const notifFrontend = fs.existsSync('./public/js/modules/notifications.js');
    const notifCenterFrontend = fs.existsSync('./public/js/modules/notification-center.js');

    console.log(`  notifications: public/js/modules/notifications.js - ${notifFrontend ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    console.log(`  notification-center: public/js/modules/notification-center.js - ${notifCenterFrontend ? '✅ EXISTE' : '❌ NO EXISTE'}`);

    // 4. Verificar si hay relación parent-child
    console.log('\n='.repeat(80));
    console.log('\n🔗 ANÁLISIS DE JERARQUÍA:\n');

    const notifModule = modules.find(m => m.module_key === 'notifications');
    const centerModule = modules.find(m => m.module_key === 'notification-center');

    if (notifModule && centerModule) {
      if (notifModule.parent_module_key === 'notification-center') {
        console.log('✅ notifications ES SUB-MÓDULO de notification-center');
      } else if (centerModule.parent_module_key === 'notifications') {
        console.log('✅ notification-center ES SUB-MÓDULO de notifications');
      } else {
        console.log('⚠️  SON MÓDULOS INDEPENDIENTES (sin relación parent-child)');
      }
    }

    // 5. Buscar referencias en código
    console.log('\n='.repeat(80));
    console.log('\n🔍 BUSCANDO REFERENCIAS EN CÓDIGO...\n');

    // Buscar en engineering-metadata.js
    if (fs.existsSync('./engineering-metadata.js')) {
      const metadataContent = fs.readFileSync('./engineering-metadata.js', 'utf8');

      const hasNotifications = metadataContent.includes('"notifications"');
      const hasNotificationCenter = metadataContent.includes('"notification-center"');

      console.log('engineering-metadata.js:');
      console.log(`  notifications: ${hasNotifications ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
      console.log(`  notification-center: ${hasNotificationCenter ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
    }

    console.log('\n='.repeat(80));
    console.log('\n📊 CONCLUSIÓN:\n');

    if (notifModule && centerModule) {
      if (notifModule.parent_module_key === 'notification-center') {
        console.log('✅ "notifications" DEBERÍA SER SUB-MÓDULO de "notification-center"');
        console.log('   → Recomendación: Mantener notifications como sub-módulo');
      } else if (!notifModule.description && centerModule.description) {
        console.log('⚠️  "notifications" parece ser un módulo LEGACY o TÉCNICO');
        console.log('   → "notification-center" es el módulo PRINCIPAL para usuarios');
        console.log('   → Recomendación: Ocultar "notifications" con hideFromDashboard: true');
      } else {
        console.log('ℹ️  Ambos módulos coexisten de forma independiente');
        console.log('   → Verificar si tienen funcionalidades diferentes o son duplicados');
      }
    }

    console.log('\n='.repeat(80) + '\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
