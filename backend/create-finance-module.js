/**
 * Crear módulo de Finanzas y asignarlo a empresa ISI
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function createFinanceModule() {
  try {
    console.log('🏦 Creando módulo de Finanzas...');

    // 1. Crear módulo principal en system_modules
    const moduleData = {
      module_key: 'finance-dashboard',
      name: 'Finanzas',
      description: 'Sistema Financiero Empresarial: Tesorería, Presupuestos, Plan de Cuentas, Asientos Contables, Flujo de Caja, Centro de Costos y Reportes Financieros',
      category: 'finance',
      icon: '💰',
      is_core: false,
      requires_hardware: false,
      module_type: 'dashboard',
      available_in: 'company',
      showInMenu: true,
      frontend_files: JSON.stringify([
        'finance-dashboard.js',
        'finance-budget.js',
        'finance-cash-flow.js',
        'finance-chart-of-accounts.js',
        'finance-cost-centers.js',
        'finance-journal-entries.js',
        'finance-reports.js',
        'finance-treasury.js',
        'finance-executive-dashboard.js'
      ]),
      api_endpoints: JSON.stringify([
        '/api/finance/dashboard',
        '/api/finance/accounts',
        '/api/finance/budget',
        '/api/finance/treasury',
        '/api/finance/reports'
      ])
    };

    const insertResult = await pool.query(
      `INSERT INTO system_modules
       (module_key, name, description, category, icon, is_core, requires_hardware,
        module_type, available_in, "showInMenu", frontend_files, api_endpoints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (module_key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         frontend_files = EXCLUDED.frontend_files,
         api_endpoints = EXCLUDED.api_endpoints
       RETURNING module_key, name, icon`,
      [
        moduleData.module_key,
        moduleData.name,
        moduleData.description,
        moduleData.category,
        moduleData.icon,
        moduleData.is_core,
        moduleData.requires_hardware,
        moduleData.module_type,
        moduleData.available_in,
        moduleData.showInMenu,
        moduleData.frontend_files,
        moduleData.api_endpoints
      ]
    );

    console.log('✅ Módulo creado en system_modules:');
    console.log('   Key:', insertResult.rows[0].module_key);
    console.log('   Name:', insertResult.rows[0].name);
    console.log('   Icon:', insertResult.rows[0].icon);

    // 2. Asignar a empresa ISI (company_id = 11)
    const companyId = 11;

    const assignResult = await pool.query(
      `INSERT INTO company_modules (company_id, module_key, is_active, pricing_tier)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, module_key) DO UPDATE SET
         is_active = EXCLUDED.is_active,
         pricing_tier = EXCLUDED.pricing_tier
       RETURNING company_id, module_key, is_active`,
      [companyId, moduleData.module_key, true, 'premium']
    );

    console.log('✅ Módulo asignado a empresa ISI:');
    console.log('   Company ID:', assignResult.rows[0].company_id);
    console.log('   Module Key:', assignResult.rows[0].module_key);
    console.log('   Active:', assignResult.rows[0].is_active);

    // 3. Verificar
    const verifyResult = await pool.query(
      `SELECT sm.module_key, sm.name, sm.icon, cm.is_active, cm.company_id
       FROM system_modules sm
       INNER JOIN company_modules cm ON sm.module_key = cm.module_key
       WHERE sm.module_key = $1 AND cm.company_id = $2`,
      [moduleData.module_key, companyId]
    );

    if (verifyResult.rows.length > 0) {
      console.log('\n✅ VERIFICACIÓN EXITOSA:');
      console.log('   Módulo:', verifyResult.rows[0].name);
      console.log('   Icon:', verifyResult.rows[0].icon);
      console.log('   Empresa:', verifyResult.rows[0].company_id);
      console.log('   Activo:', verifyResult.rows[0].is_active);
      console.log('\n🎉 Módulo de Finanzas listo para usar en panel-empresa.html');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

createFinanceModule();
