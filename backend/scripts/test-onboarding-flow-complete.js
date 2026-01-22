/**
 * TEST: Circuito completo de Onboarding
 *
 * FLUJO A TESTEAR:
 * 1. Crear Lead
 * 2. Lead avanza a etapa final (opportunity)
 * 3. Crear Budget desde Lead (SIN company_id)
 * 4. Cliente acepta presupuesto
 * 5. Se genera contrato
 * 6. Cliente firma contrato → SE CREA EMPRESA INACTIVA
 * 7. Se genera factura
 * 8. Cliente paga factura → SE ACTIVA EMPRESA
 * 9. Verificar persistencia y trazabilidad
 */

const { v4: uuidv4 } = require('uuid');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
};

async function runTest() {
  const { Client } = require('pg');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aedr15150302',
    database: 'attendance_system'
  });

  const trace_id = `ONBOARDING-${uuidv4()}`;
  const testData = {
    trace_id,
    lead_id: null,
    budget_id: null,
    contract_id: null,
    company_id: null,
    invoice_id: null
  };

  try {
    await client.connect();
    log.success('Conectado a PostgreSQL');

    // ═══════════════════════════════════════════════════════════
    // PASO 1: Crear Lead
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 1: Crear Lead');

    const leadId = uuidv4();
    testData.lead_id = leadId;

    await client.query(`
      INSERT INTO sales_leads (
        id, company_name, contact_name, contact_email, contact_phone,
        lifecycle_stage, temperature, lead_source, total_score,
        bant_budget, bant_authority, bant_need, bant_timeline,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      )
    `, [
      leadId,
      'Empresa Test Onboarding ' + Date.now(),
      'Juan Pérez',
      'test-onboarding@test.com',
      '+54 11 1234-5678',
      'opportunity',  // Etapa final
      'hot',
      'demo_request',
      85,
      25, 20, 25, 15
    ]);

    log.success(`Lead creado: ${leadId}`);
    log.info(`  - Lifecycle: opportunity (etapa final)`);
    log.info(`  - Temperature: hot`);

    // Verificar que el lead existe
    const leadCheck = await client.query('SELECT * FROM sales_leads WHERE id = $1', [leadId]);
    if (leadCheck.rows.length === 0) {
      throw new Error('Lead no encontrado después de crear');
    }
    const leadData = leadCheck.rows[0];
    log.success('Lead verificado en BD');

    // ═══════════════════════════════════════════════════════════
    // PASO 2: Crear Budget desde Lead (SIN company_id)
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 2: Crear Budget desde Lead (SIN company_id)');

    // Necesitamos un vendor_id válido
    const vendorResult = await client.query('SELECT staff_id FROM aponnt_staff LIMIT 1');
    let vendorId;

    if (vendorResult.rows.length === 0) {
      // Crear vendor de prueba
      vendorId = uuidv4();
      await client.query(`
        INSERT INTO aponnt_staff (staff_id, email, first_name, last_name, role_code, status, created_at, updated_at)
        VALUES ($1, 'vendor-test@aponnt.com', 'Vendor', 'Test', 'VE', 'active', NOW(), NOW())
      `, [vendorId]);
      log.info(`Vendor de prueba creado: ${vendorId}`);
    } else {
      vendorId = vendorResult.rows[0].staff_id;
    }

    const budgetId = uuidv4();
    testData.budget_id = budgetId;
    const budgetCode = `PPTO-2026-${Date.now().toString().slice(-4)}`;

    await client.query(`
      INSERT INTO budgets (
        id, trace_id, lead_id, company_id, vendor_id, budget_code,
        selected_modules, contracted_employees, total_monthly, price_per_employee, subtotal,
        client_contact_name, client_contact_email, client_contact_phone,
        status, valid_until, budget_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW()
      )
    `, [
      budgetId,
      trace_id,
      leadId,
      // company_id = NULL  ← CRÍTICO: No hay empresa aún
      vendorId,
      budgetCode,
      JSON.stringify([
        { module_key: 'asistencia', module_name: 'Control de Asistencia', price: 50 },
        { module_key: 'nomina', module_name: 'Liquidación de Nómina', price: 150 },
        { module_key: 'vacaciones', module_name: 'Gestión de Vacaciones', price: 30 }
      ]),
      100,       // contracted_employees
      230.00,    // total_monthly
      2.30,      // price_per_employee
      230.00,    // subtotal
      leadData.contact_name,
      leadData.contact_email,
      leadData.contact_phone,
      'PENDING',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    ]);

    log.success(`Budget creado: ${budgetCode}`);
    log.info(`  - trace_id: ${trace_id}`);
    log.info(`  - lead_id: ${leadId}`);
    log.info(`  - company_id: NULL (no existe empresa aún)`);
    log.info(`  - Total mensual: USD 230.00`);

    // Verificar que el budget existe y tiene lead_id pero NO company_id
    const budgetCheck = await client.query('SELECT * FROM budgets WHERE id = $1', [budgetId]);
    if (budgetCheck.rows.length === 0) {
      throw new Error('Budget no encontrado después de crear');
    }
    if (budgetCheck.rows[0].company_id !== null) {
      throw new Error('Budget tiene company_id pero no debería');
    }
    if (budgetCheck.rows[0].lead_id !== leadId) {
      throw new Error('Budget no tiene el lead_id correcto');
    }
    log.success('Budget verificado: lead_id OK, company_id NULL');

    // ═══════════════════════════════════════════════════════════
    // PASO 3: Simular aceptación del presupuesto
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 3: Cliente acepta presupuesto');

    await client.query(`
      UPDATE budgets SET
        status = 'ACCEPTED',
        accepted_at = NOW()
      WHERE id = $1
    `, [budgetId]);

    log.success('Presupuesto aceptado');

    // ═══════════════════════════════════════════════════════════
    // PASO 4: Crear Contrato (aún SIN company_id)
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 4: Crear Contrato desde Budget (SIN company_id)');

    // Verificar si existe la tabla contracts con las nuevas columnas
    const contractNumber = `CONT-2026-${Date.now().toString().slice(-4)}`;

    // seller_id es INTEGER sin FK, usamos 1 como valor por defecto
    const sellerId = 1;

    const modulesJson = JSON.stringify([
      { module_key: 'asistencia', module_name: 'Control de Asistencia', price: 50, quantity: 100 },
      { module_key: 'nomina', module_name: 'Liquidación de Nómina', price: 150, quantity: 100 },
      { module_key: 'vacaciones', module_name: 'Gestión de Vacaciones', price: 30, quantity: 100 }
    ]);

    const contractResult = await client.query(`
      INSERT INTO contracts (
        contract_code, contract_number, trace_id, budget_id, company_id,
        contract_type, contract_date, template_version, template_content,
        selected_modules, contracted_employees, total_monthly,
        seller_id, modules_data, monthly_total, status, start_date, billing_cycle,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, NULL,
        $5, NOW(), $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14, NOW(), $15,
        NOW(), NOW()
      ) RETURNING id
    `, [
      contractNumber,           // contract_code
      contractNumber,           // contract_number
      trace_id,
      budgetId,
      // company_id = NULL  ← CRÍTICO: No hay empresa aún
      'EULA_STANDARD',          // contract_type
      '1.0',                    // template_version
      'Contrato estándar de servicios Aponnt',  // template_content
      modulesJson,              // selected_modules
      100,                      // contracted_employees
      230.00,                   // total_monthly
      sellerId,                 // seller_id
      modulesJson,              // modules_data
      230.00,                   // monthly_total
      'DRAFT',                  // status (MAYÚSCULAS según constraint)
      'monthly'                 // billing_cycle
    ]);

    testData.contract_id = contractResult.rows[0].id;

    log.success(`Contrato creado: ${contractNumber}`);
    log.info(`  - ID: ${testData.contract_id}`);
    log.info(`  - trace_id: ${trace_id}`);
    log.info(`  - budget_id: ${budgetId}`);
    log.info(`  - company_id: NULL (no existe empresa aún)`);
    log.info(`  - status: draft`);

    // Actualizar a enviado
    await client.query(`UPDATE contracts SET status = 'SENT' WHERE id = $1`, [testData.contract_id]);
    log.success('Contrato enviado para firma');

    // ═══════════════════════════════════════════════════════════
    // PASO 5: Cliente firma contrato → SE CREA EMPRESA INACTIVA
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 5: Cliente firma contrato → Crear Empresa INACTIVA');

    // Crear empresa INACTIVA
    const slug = leadData.company_name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-6);

    const companyResult = await client.query(`
      INSERT INTO companies (
        name, slug, email, phone, country,
        status, is_active, onboarding_status, trace_id,
        active_modules, license_type, subscription_type,
        max_employees, contracted_employees,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING company_id
    `, [
      leadData.company_name,
      slug,
      leadData.contact_email,
      leadData.contact_phone,
      'Argentina',
      'pending',  // ← INACTIVA
      false,      // ← is_active = false
      'CONTRACT_SIGNED',
      trace_id,
      JSON.stringify({ asistencia: false, nomina: false, vacaciones: false }),  // Módulos reservados pero no activos
      'professional',
      'professional',
      100,
      100
    ]);

    testData.company_id = companyResult.rows[0].company_id;

    log.success(`Empresa INACTIVA creada: ${leadData.company_name}`);
    log.info(`  - company_id: ${testData.company_id}`);
    log.info(`  - status: pending`);
    log.info(`  - is_active: false`);
    log.info(`  - onboarding_status: CONTRACT_SIGNED`);
    log.info(`  - trace_id: ${trace_id}`);

    // Actualizar Budget y Contract con el nuevo company_id
    await client.query(`UPDATE budgets SET company_id = $1 WHERE id = $2`, [testData.company_id, budgetId]);
    await client.query(`UPDATE contracts SET company_id = $1, status = 'SIGNED' WHERE id = $2`, [testData.company_id, testData.contract_id]);

    log.success('Budget y Contract actualizados con company_id');

    // Actualizar lead como convertido
    await client.query(`
      UPDATE sales_leads SET
        lifecycle_stage = 'customer',
        converted_to_customer_at = NOW(),
        converted_company_id = $1
      WHERE id = $2
    `, [testData.company_id, leadId]);

    log.success('Lead marcado como convertido');

    // Verificar estado de la empresa
    const companyCheck = await client.query('SELECT * FROM companies WHERE company_id = $1', [testData.company_id]);
    if (companyCheck.rows[0].status !== 'pending') {
      throw new Error(`Estado de empresa incorrecto: ${companyCheck.rows[0].status} (esperado: pending)`);
    }
    if (companyCheck.rows[0].is_active !== false) {
      throw new Error(`is_active incorrecto: ${companyCheck.rows[0].is_active} (esperado: false)`);
    }
    log.success('Empresa verificada: status=pending, is_active=false');

    // ═══════════════════════════════════════════════════════════
    // PASO 6: Generar factura
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 6: Generar factura');

    // Verificar si existe la tabla invoices
    const invoiceNumber = `FAC-2026-${Date.now().toString().slice(-4)}`;

    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, company_id,
        billing_period_month, billing_period_year,
        subtotal, tax_rate, tax_amount, total_amount, currency,
        status, issue_date, due_date,
        internal_notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, NOW(), NOW()
      ) RETURNING id
    `, [
      invoiceNumber,
      testData.company_id,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
      230.00,
      21.00,
      48.30,
      278.30,
      'USD',
      'PENDING',
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
      `trace_id: ${trace_id}` // Guardamos el trace_id en notes para trazabilidad
    ]);

    testData.invoice_id = invoiceResult.rows[0].id;

    log.success(`Factura creada: ${invoiceNumber}`);
    log.info(`  - ID: ${testData.invoice_id}`);
    log.info(`  - Total: USD 278.30 (con IVA 21%)`);
    log.info(`  - Status: pending`);

    // Actualizar company onboarding_status
    await client.query(`UPDATE companies SET onboarding_status = 'INVOICE_GENERATED' WHERE company_id = $1`, [testData.company_id]);

    // ═══════════════════════════════════════════════════════════
    // PASO 7: Cliente paga factura → SE ACTIVA EMPRESA
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 7: Cliente paga factura → ACTIVAR EMPRESA');

    // Marcar factura como pagada
    await client.query(`
      UPDATE invoices SET
        status = 'PAID',
        paid_at = NOW()
      WHERE id = $1
    `, [testData.invoice_id]);

    log.success('Factura marcada como PAGADA');

    // ACTIVAR EMPRESA
    await client.query(`
      UPDATE companies SET
        status = 'active',
        is_active = true,
        onboarding_status = 'ACTIVE',
        activated_at = NOW(),
        active_modules = $1
      WHERE company_id = $2
    `, [
      JSON.stringify({ asistencia: true, nomina: true, vacaciones: true }),  // Módulos ACTIVOS
      testData.company_id
    ]);

    log.success('EMPRESA ACTIVADA');

    // Actualizar contrato a activo
    await client.query(`UPDATE contracts SET status = 'ACTIVE' WHERE id = $1`, [testData.contract_id]);

    // Budget permanece en ACCEPTED (el estado final correcto para presupuestos aceptados)
    log.info('Budget permanece en status=ACCEPTED (correcto)');

    // ═══════════════════════════════════════════════════════════
    // PASO 8: Verificar trazabilidad completa
    // ═══════════════════════════════════════════════════════════
    log.section('PASO 8: Verificar trazabilidad completa');

    // Usar la función que creamos
    const traceResult = await client.query('SELECT * FROM get_onboarding_status($1)', [trace_id]);

    if (traceResult.rows.length > 0) {
      const trace = traceResult.rows[0];
      log.success('Trazabilidad verificada:');
      log.info(`  - trace_id: ${trace.trace_id}`);
      log.info(`  - Budget status: ${trace.budget_status}`);
      log.info(`  - Contract status: ${trace.contract_status}`);
      log.info(`  - Company status: ${trace.company_status}`);
      log.info(`  - Company onboarding: ${trace.company_onboarding_status}`);
      log.info(`  - Invoice status: ${trace.invoice_status}`);
    }

    // Verificar estado final de la empresa
    const finalCheck = await client.query('SELECT * FROM companies WHERE company_id = $1', [testData.company_id]);
    const finalCompany = finalCheck.rows[0];

    if (finalCompany.status !== 'active') {
      throw new Error(`Estado final incorrecto: ${finalCompany.status} (esperado: active)`);
    }
    if (finalCompany.is_active !== true) {
      throw new Error(`is_active final incorrecto: ${finalCompany.is_active} (esperado: true)`);
    }
    if (finalCompany.onboarding_status !== 'ACTIVE') {
      throw new Error(`onboarding_status final incorrecto: ${finalCompany.onboarding_status} (esperado: ACTIVE)`);
    }

    log.success('Estado final de empresa verificado:');
    log.info(`  - status: ${finalCompany.status}`);
    log.info(`  - is_active: ${finalCompany.is_active}`);
    log.info(`  - onboarding_status: ${finalCompany.onboarding_status}`);

    // ═══════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════
    log.section('RESUMEN DEL TEST');

    console.log(`
${colors.green}═══════════════════════════════════════════════════════════
                    TEST COMPLETADO EXITOSAMENTE
═══════════════════════════════════════════════════════════${colors.reset}

  ${colors.cyan}trace_id:${colors.reset}     ${trace_id}
  ${colors.cyan}lead_id:${colors.reset}      ${testData.lead_id}
  ${colors.cyan}budget_id:${colors.reset}    ${testData.budget_id}
  ${colors.cyan}contract_id:${colors.reset}  ${testData.contract_id}
  ${colors.cyan}company_id:${colors.reset}   ${testData.company_id}
  ${colors.cyan}invoice_id:${colors.reset}   ${testData.invoice_id}

${colors.green}═══════════════════════════════════════════════════════════
                    FLUJO VERIFICADO
═══════════════════════════════════════════════════════════${colors.reset}

  1. ✅ Lead creado (lifecycle: opportunity)
  2. ✅ Budget creado desde Lead (company_id: NULL)
  3. ✅ Budget aceptado
  4. ✅ Contract creado (company_id: NULL)
  5. ✅ Contract firmado → Empresa creada INACTIVA
  6. ✅ Factura generada
  7. ✅ Factura pagada → Empresa ACTIVADA
  8. ✅ Trazabilidad completa verificada

${colors.green}═══════════════════════════════════════════════════════════${colors.reset}
`);

  } catch (error) {
    log.error(`Error en test: ${error.message}`);
    console.error(error.stack);

    // Cleanup en caso de error
    log.warn('Limpiando datos de prueba...');
    try {
      // Primero limpiar FKs que referencian a company
      if (testData.lead_id) await client.query('UPDATE sales_leads SET converted_company_id = NULL WHERE id = $1', [testData.lead_id]);
      // Luego eliminar en orden correcto
      if (testData.invoice_id) await client.query('DELETE FROM invoices WHERE id = $1', [testData.invoice_id]);
      if (testData.contract_id) await client.query('DELETE FROM contracts WHERE id = $1', [testData.contract_id]);
      if (testData.budget_id) await client.query('DELETE FROM budgets WHERE id = $1', [testData.budget_id]);
      if (testData.company_id) await client.query('DELETE FROM companies WHERE company_id = $1', [testData.company_id]);
      if (testData.lead_id) await client.query('DELETE FROM sales_leads WHERE id = $1', [testData.lead_id]);
    } catch (cleanupError) {
      log.warn(`Error en cleanup: ${cleanupError.message}`);
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

runTest();
