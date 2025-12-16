/**
 * 🔍 Investigar módulos específicos
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

const MODULES_TO_CHECK = ['dashboard', 'inbox', 'hours-cube-dashboard', 'resource-center', 'support-base'];

async function investigate() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 INVESTIGACIÓN DE MÓDULOS');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  for (const moduleKey of MODULES_TO_CHECK) {
    console.log('┌─────────────────────────────────────────────────────────────────────');
    console.log(`│ 📦 ${moduleKey.toUpperCase()}`);
    console.log('├─────────────────────────────────────────────────────────────────────');

    // 1. Info de BD
    const dbResult = await pool.query(
      'SELECT module_key, name, description, category, features FROM system_modules WHERE module_key = $1',
      [moduleKey]
    );

    if (dbResult.rows[0]) {
      const m = dbResult.rows[0];
      console.log(`│ Name: ${m.name}`);
      console.log(`│ Category: ${m.category}`);
      console.log(`│ Description: ${m.description || '(vacía)'}`);
      if (m.features && m.features.length > 0) {
        console.log(`│ Features: ${JSON.stringify(m.features).substring(0, 100)}...`);
      }
    } else {
      console.log('│ ❌ NO ENCONTRADO EN BD');
    }

    // 2. Buscar archivos relacionados
    const routesDir = path.join(__dirname, '../src/routes');
    const servicesDir = path.join(__dirname, '../src/services');

    // Buscar en routes
    const routeFiles = fs.readdirSync(routesDir).filter(f =>
      f.toLowerCase().includes(moduleKey.replace(/-/g, '').toLowerCase()) ||
      f.toLowerCase().includes(moduleKey.split('-')[0].toLowerCase())
    );

    if (routeFiles.length > 0) {
      console.log(`│ Routes: ${routeFiles.join(', ')}`);
    }

    // Buscar en services
    const serviceFiles = fs.readdirSync(servicesDir).filter(f =>
      f.toLowerCase().includes(moduleKey.replace(/-/g, '').toLowerCase()) ||
      f.toLowerCase().includes(moduleKey.split('-')[0].toLowerCase())
    );

    if (serviceFiles.length > 0) {
      console.log(`│ Services: ${serviceFiles.join(', ')}`);
    }

    console.log('└─────────────────────────────────────────────────────────────────────');
    console.log('');
  }

  await pool.end();
}

investigate().catch(console.error);
