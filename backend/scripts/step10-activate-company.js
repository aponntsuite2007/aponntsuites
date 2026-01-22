const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

async function activateCompany() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('PASO 10: CONFIRMAR PAGO → ACTIVAR EMPRESA');
  console.log('═══════════════════════════════════════════════════════════\n');

  const companyId = 109;

  // Obtener factura
  const invoice = await client.query(`
    SELECT id, invoice_number, total_amount FROM invoices
    WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [companyId]);
  const inv = invoice.rows[0];

  // Obtener módulos del presupuesto
  const budget = await client.query(`
    SELECT selected_modules FROM budgets WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [companyId]);
  const modules = budget.rows[0].selected_modules;

  console.log('Factura:', inv.invoice_number);
  console.log('Total:', 'USD', inv.total_amount);

  // 1. Marcar factura como PAGADA
  await client.query(`
    UPDATE invoices SET
      status = 'PAID',
      paid_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [inv.id]);
  console.log('\n✅ FACTURA MARCADA COMO PAGADA');

  // 2. ACTIVAR EMPRESA
  // Convertir módulos a formato active_modules
  const activeModules = {};
  modules.forEach(m => {
    activeModules[m.module_key] = true;
  });

  await client.query(`
    UPDATE companies SET
      status = 'active',
      is_active = true,
      onboarding_status = 'ACTIVE',
      activated_at = NOW(),
      active_modules = $1::jsonb,
      updated_at = NOW()
    WHERE company_id = $2
  `, [JSON.stringify(activeModules), companyId]);

  console.log('\n✅ EMPRESA ACTIVADA:');
  console.log('   - status: active');
  console.log('   - is_active: true');
  console.log('   - onboarding_status: ACTIVE');
  console.log('   - Módulos activos:', Object.keys(activeModules).length);

  // 3. Actualizar contrato a ACTIVE
  await client.query(`
    UPDATE contracts SET status = 'ACTIVE', updated_at = NOW()
    WHERE company_id = $1 AND status = 'SIGNED'
  `, [companyId]);
  console.log('\n✅ Contrato actualizado a ACTIVE');

  // 4. Verificar estado final
  const company = await client.query(`
    SELECT company_id, name, status, is_active, onboarding_status, activated_at, trace_id
    FROM companies WHERE company_id = $1
  `, [companyId]);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO COMPLETADO - ESTADO FINAL');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('EMPRESA:');
  console.log(JSON.stringify(company.rows[0], null, 2));

  // 5. Trazabilidad completa
  const trace = await client.query(`SELECT * FROM get_onboarding_status($1)`, [company.rows[0].trace_id]);
  console.log('\nTRAZABILIDAD (get_onboarding_status):');
  console.log(JSON.stringify(trace.rows[0], null, 2));

  // 6. Resumen del circuito
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('           RESUMEN DEL CIRCUITO DE PABLO RIVAS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const lead = await client.query(`SELECT lifecycle_stage, total_score FROM sales_leads WHERE customer_company_id = $1`, [companyId]);
  const budgetInfo = await client.query(`SELECT budget_code, status FROM budgets WHERE company_id = $1`, [companyId]);
  const contractInfo = await client.query(`SELECT contract_code, status FROM contracts WHERE company_id = $1`, [companyId]);
  const invoiceInfo = await client.query(`SELECT invoice_number, status, total_amount FROM invoices WHERE company_id = $1`, [companyId]);

  console.log('👤 CLIENTE: Pablo Rivas');
  console.log('   Email: pablorivasjordan52@gmail.com');
  console.log('   Ubicación: Villa Mercedes, San Luis, Argentina');
  console.log('   Empleados: 50');
  console.log('   Módulos: 35\n');

  console.log('📊 LEAD:');
  console.log('   Lifecycle:', lead.rows[0]?.lifecycle_stage);
  console.log('   Score final:', lead.rows[0]?.total_score);

  console.log('\n💰 PRESUPUESTO:');
  console.log('   Código:', budgetInfo.rows[0]?.budget_code);
  console.log('   Status:', budgetInfo.rows[0]?.status);

  console.log('\n📄 CONTRATO:');
  console.log('   Código:', contractInfo.rows[0]?.contract_code);
  console.log('   Status:', contractInfo.rows[0]?.status);

  console.log('\n🧾 FACTURA:');
  console.log('   Número:', invoiceInfo.rows[0]?.invoice_number);
  console.log('   Total: USD', invoiceInfo.rows[0]?.total_amount);
  console.log('   Status:', invoiceInfo.rows[0]?.status);

  console.log('\n🏢 EMPRESA:');
  console.log('   Company ID:', company.rows[0].company_id);
  console.log('   Status:', company.rows[0].status);
  console.log('   Activa:', company.rows[0].is_active);
  console.log('   Onboarding:', company.rows[0].onboarding_status);
  console.log('   Activada:', company.rows[0].activated_at);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('              ✅ CIRCUITO COMPLETADO EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════════');

  await client.end();
}

activateCompany().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
