const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

async function createCompany() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('PASO 8 (cont): CREAR EMPRESA INACTIVA');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Obtener contrato y lead
  const contract = await client.query(`
    SELECT c.id, c.contract_code, c.trace_id, c.budget_id, c.contracted_employees, b.lead_id, b.vendor_id
    FROM contracts c JOIN budgets b ON b.id = c.budget_id
    WHERE c.id = 'f6548460-4483-4173-8834-dc1f68e1a2d9'
  `);
  const ct = contract.rows[0];

  const lead = await client.query('SELECT id, company_name, contact_name, contact_email, contact_phone, company_province, company_city FROM sales_leads WHERE id = $1', [ct.lead_id]);
  const l = lead.rows[0];

  console.log('Contrato FIRMADO:', ct.contract_code);
  console.log('Lead:', l.company_name);

  // CREAR EMPRESA INACTIVA
  const slug = l.company_name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-6);

  const companyResult = await client.query(`
    INSERT INTO companies (
      name, slug, email, phone, country, state, city,
      status, is_active, onboarding_status, trace_id,
      license_type, subscription_type,
      max_employees, contracted_employees,
      active_modules,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 'Argentina', $5, $6,
      'pending', false, 'CONTRACT_SIGNED', $7,
      'enterprise', 'enterprise',
      $8, $8,
      $9::jsonb,
      NOW(), NOW()
    ) RETURNING company_id
  `, [
    l.company_name,
    slug,
    l.contact_email,
    l.contact_phone,
    l.company_province,
    l.company_city,
    ct.trace_id,
    ct.contracted_employees,
    JSON.stringify({})
  ]);

  const companyId = companyResult.rows[0].company_id;

  console.log('\n✅ EMPRESA CREADA (INACTIVA):');
  console.log('   Company ID:', companyId);
  console.log('   Nombre:', l.company_name);
  console.log('   Status: pending');
  console.log('   is_active: false');
  console.log('   onboarding_status: CONTRACT_SIGNED');
  console.log('   Trace ID:', ct.trace_id);

  // Actualizar Budget y Contract con company_id
  await client.query('UPDATE budgets SET company_id = $1, updated_at = NOW() WHERE id = $2', [companyId, ct.budget_id]);
  await client.query('UPDATE contracts SET company_id = $1, updated_at = NOW() WHERE id = $2', [companyId, ct.id]);
  console.log('\n✅ Budget y Contract actualizados con company_id:', companyId);

  // Marcar lead como customer
  await client.query(`
    UPDATE sales_leads SET
      lifecycle_stage = 'customer',
      lifecycle_changed_at = NOW(),
      converted_to_customer_at = NOW(),
      converted_company_id = $1,
      customer_company_id = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [companyId, l.id]);
  console.log('✅ Lead marcado como customer');

  // Registrar actividad
  await client.query(`
    INSERT INTO sales_lead_activities (id, lead_id, activity_type, activity_description, score_change, created_at, created_by)
    VALUES ($1, $2, $3, $4, 10, NOW(), $5)
  `, [uuidv4(), l.id, 'demo_attended', 'Contrato firmado. Empresa creada (INACTIVA). Pendiente factura y pago.', ct.vendor_id]);

  // Verificar
  const company = await client.query('SELECT company_id, name, status, is_active, onboarding_status FROM companies WHERE company_id = $1', [companyId]);
  console.log('\n───────────────────────────────────────────────────────────');
  console.log('Empresa:', JSON.stringify(company.rows[0], null, 2));
  console.log('COMPANY_ID=' + companyId);
  console.log('───────────────────────────────────────────────────────────');

  await client.end();
}

createCompany().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
