/**
 * Sincroniza datos críticos de BD Local a Render
 */
const { Sequelize } = require('sequelize');

const renderDB = new Sequelize('aponnt_db', 'aponnt_db_user', 'G50GN9h8meeCVsfi51Z7SlPQn4ThyJXY', {
  host: 'dpg-d4op2lq4d50c7392i190-a.oregon-postgres.render.com',
  port: 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const localDB = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function syncSystemModules() {
  console.log('\n=== SINCRONIZANDO SYSTEM_MODULES ===\n');

  const [localMods] = await localDB.query('SELECT * FROM system_modules ORDER BY module_key');
  const [renderMods] = await renderDB.query('SELECT module_key FROM system_modules ORDER BY module_key');

  const renderKeys = new Set(renderMods.map(m => m.module_key));
  const missing = localMods.filter(m => !renderKeys.has(m.module_key));

  console.log('Módulos en LOCAL:', localMods.length);
  console.log('Módulos en RENDER:', renderMods.length);
  console.log('Faltantes en RENDER:', missing.length);

  if (missing.length > 0) {
    console.log('\nInsertando módulos faltantes:');
    for (const mod of missing) {
      try {
        await renderDB.query(`
          INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_core, display_order, features, requirements, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, NOW(), NOW())
          ON CONFLICT (module_key) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            color = EXCLUDED.color,
            category = EXCLUDED.category,
            base_price = EXCLUDED.base_price,
            is_core = EXCLUDED.is_core,
            display_order = EXCLUDED.display_order,
            features = EXCLUDED.features,
            requirements = EXCLUDED.requirements,
            updated_at = NOW()
        `, {
          bind: [
            mod.id,
            mod.module_key,
            mod.name,
            mod.description,
            mod.icon || '📦',
            mod.color || '#007bff',
            mod.category || 'additional',
            mod.base_price || 0,
            mod.is_core || false,
            mod.display_order || 0,
            JSON.stringify(mod.features || []),
            JSON.stringify(mod.requirements || [])
          ]
        });
        console.log('  ✅', mod.module_key);
      } catch(e) {
        console.log('  ❌', mod.module_key, '-', e.message.substring(0, 80));
      }
    }
  }

  const [newCount] = await renderDB.query('SELECT COUNT(*)::int as c FROM system_modules');
  console.log('\nTotal módulos en Render ahora:', newCount[0].c);
}

async function syncCompanies() {
  console.log('\n=== SINCRONIZANDO COMPANIES ===\n');

  const [localComps] = await localDB.query('SELECT * FROM companies ORDER BY company_id');
  const [renderComps] = await renderDB.query('SELECT company_id FROM companies ORDER BY company_id');

  const renderIds = new Set(renderComps.map(c => c.company_id));
  const missing = localComps.filter(c => !renderIds.has(c.company_id));

  console.log('Empresas en LOCAL:', localComps.length);
  console.log('Empresas en RENDER:', renderComps.length);
  console.log('Faltantes en RENDER:', missing.length);

  if (missing.length > 0) {
    console.log('\nInsertando empresas faltantes:');
    for (const comp of missing) {
      try {
        // Render usa company_id en vez de id, y phone en vez de contact_phone
        await renderDB.query(`
          INSERT INTO companies (company_id, name, slug, tax_id, contact_email, phone, address,
            license_type, max_employees, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (company_id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW()
        `, {
          bind: [
            comp.company_id,
            comp.name,
            comp.slug || comp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            comp.tax_id || 'Sin CUIT',
            comp.contact_email || 'sin-email@empresa.com',
            comp.contact_phone || comp.phone || 'Sin teléfono',
            comp.address || 'Sin dirección',
            comp.license_type || 'basic',
            comp.max_employees || 50,
            comp.is_active !== false
          ]
        });
        console.log('  ✅ ID:', comp.company_id, '-', comp.name);
      } catch(e) {
        console.log('  ❌ ID:', comp.company_id, '-', e.message.substring(0, 80));
      }
    }
  }

  const [newCount] = await renderDB.query('SELECT COUNT(*)::int as c FROM companies');
  console.log('\nTotal empresas en Render ahora:', newCount[0].c);
}

async function main() {
  try {
    console.log('Conectando a bases de datos...');
    await renderDB.authenticate();
    await localDB.authenticate();
    console.log('✅ Conectado a ambas BDs\n');

    await syncSystemModules();
    await syncCompanies();

    console.log('\n=== SINCRONIZACIÓN COMPLETADA ===\n');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await renderDB.close();
    await localDB.close();
  }
}

main();
