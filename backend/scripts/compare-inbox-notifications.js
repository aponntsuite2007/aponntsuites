/**
 * 🔍 Comparar inbox vs notification-center
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system',
  port: 5432
});

async function compare() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 COMPARACIÓN: INBOX vs NOTIFICATION-CENTER');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  // Info de BD
  const modules = await pool.query(`
    SELECT module_key, name, description
    FROM system_modules
    WHERE module_key IN ('inbox', 'notification-center')
  `);

  modules.rows.forEach(m => {
    console.log(`📦 ${m.module_key.toUpperCase()}`);
    console.log(`   Name: ${m.name}`);
    console.log(`   Desc: ${m.description}`);
    console.log('');
  });

  // Archivos de cada uno
  const routesDir = path.join(__dirname, '../src/routes');
  const servicesDir = path.join(__dirname, '../src/services');

  console.log('📁 ARCHIVOS RELACIONADOS CON NOTIFICACIONES:');
  console.log('─────────────────────────────────────────────────────────────────────');

  // Routes
  const allRoutes = fs.readdirSync(routesDir);
  const notifRoutes = allRoutes.filter(f =>
    f.toLowerCase().includes('notif') ||
    f.toLowerCase().includes('inbox')
  );
  console.log('Routes:');
  notifRoutes.forEach(f => console.log(`  - ${f}`));

  // Services
  const allServices = fs.readdirSync(servicesDir);
  const notifServices = allServices.filter(f =>
    f.toLowerCase().includes('notif') ||
    f.toLowerCase().includes('inbox')
  );
  console.log('Services:');
  notifServices.forEach(f => console.log(`  - ${f}`));

  // Tablas relacionadas
  console.log('');
  console.log('📊 TABLAS DE NOTIFICACIONES EN BD:');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (table_name LIKE '%notif%' OR table_name LIKE '%inbox%')
    ORDER BY table_name
  `);

  tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

  // Verificar uso de inbox en panel-empresa
  console.log('');
  console.log('🔗 REFERENCIAS EN CÓDIGO:');
  console.log('─────────────────────────────────────────────────────────────────────');

  // Leer server.js para ver qué rutas están montadas
  const serverPath = path.join(__dirname, '../server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');

  const inboxMount = serverContent.includes('/api/inbox') || serverContent.includes("'inbox'");
  const notifCenterMount = serverContent.includes('/api/notification-center') || serverContent.includes("'notification-center'");
  const notifUnifiedMount = serverContent.includes('notificationUnified') || serverContent.includes('/api/notifications/unified');

  console.log(`  server.js monta /api/inbox: ${inboxMount ? '✅ SÍ' : '❌ NO'}`);
  console.log(`  server.js monta notification-center: ${notifCenterMount ? '✅ SÍ' : '❌ NO'}`);
  console.log(`  server.js monta notificationUnified: ${notifUnifiedMount ? '✅ SÍ' : '❌ NO'}`);

  await pool.end();
}

compare().catch(console.error);
