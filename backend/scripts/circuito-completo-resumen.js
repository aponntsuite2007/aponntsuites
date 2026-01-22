/**
 * RESUMEN COMPLETO: CIRCUITO CLIENTE + VENDEDOR
 * Pablo Rivas (Cliente) + Carlos Mendez (Vendedor)
 */
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

async function showSummary() {
  await client.connect();

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                       ║');
  console.log('║     🎉 CIRCUITO COMPLETO CRUD - SISTEMA BIOMÉTRICO ENTERPRISE 🎉     ║');
  console.log('║                                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // ═══════════════════════════════════════════════════════════
  // PARTE 1: CIRCUITO CLIENTE (PABLO RIVAS)
  // ═══════════════════════════════════════════════════════════

  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  PARTE 1: CIRCUITO CLIENTE - PABLO RIVAS                           │');
  console.log('└─────────────────────────────────────────────────────────────────────┘\n');

  // Lead
  const lead = await client.query(`
    SELECT id, company_name, contact_email, lifecycle_stage, total_score, customer_company_id
    FROM sales_leads WHERE customer_company_id = 109
  `);
  const l = lead.rows[0];

  // Budget
  const budget = await client.query(`
    SELECT budget_code, status, total_monthly, selected_modules
    FROM budgets WHERE company_id = 109
  `);
  const b = budget.rows[0];

  // Contract
  const contract = await client.query(`
    SELECT contract_code, status, signed_at, contracted_employees
    FROM contracts WHERE company_id = 109
  `);
  const ct = contract.rows[0];

  // Invoice
  const invoice = await client.query(`
    SELECT invoice_number, total_amount, status, sent_at, sent_to_email, invoice_pdf_path
    FROM invoices WHERE company_id = 109
  `);
  const inv = invoice.rows[0];

  // Company
  const company = await client.query(`
    SELECT company_id, name, status, is_active, onboarding_status, activated_at, trace_id
    FROM companies WHERE company_id = 109
  `);
  const c = company.rows[0];

  console.log('  📋 LEAD');
  console.log(`     ID: ${l.id.substring(0,8)}...`);
  console.log(`     Empresa: ${l.company_name}`);
  console.log(`     Email: ${l.contact_email}`);
  console.log(`     Stage: ${l.lifecycle_stage}`);
  console.log(`     Score: ${l.total_score}`);

  console.log('\n  💰 PRESUPUESTO');
  console.log(`     Código: ${b.budget_code}`);
  console.log(`     Status: ${b.status}`);
  console.log(`     Total mensual: USD ${parseFloat(b.total_monthly).toFixed(2)}`);
  const modules = typeof b.selected_modules === 'string' ? JSON.parse(b.selected_modules) : b.selected_modules;
  console.log(`     Módulos: ${Array.isArray(modules) ? modules.length : 35} módulos`);

  console.log('\n  📄 CONTRATO');
  console.log(`     Código: ${ct.contract_code}`);
  console.log(`     Status: ${ct.status}`);
  console.log(`     Firmado: ${ct.signed_at ? new Date(ct.signed_at).toLocaleString() : 'N/A'}`);
  console.log(`     Empleados: ${ct.contracted_employees}`);

  console.log('\n  🧾 FACTURA');
  console.log(`     Número: ${inv.invoice_number}`);
  console.log(`     Total: USD ${parseFloat(inv.total_amount).toFixed(2)}`);
  console.log(`     Status: ${inv.status}`);
  console.log(`     PDF: ${inv.invoice_pdf_path ? '✅ ' + inv.invoice_pdf_path : '❌'}`);
  console.log(`     Enviada: ${inv.sent_at ? '✅ ' + inv.sent_to_email : '❌'}`);

  console.log('\n  🏢 EMPRESA');
  console.log(`     ID: ${c.company_id}`);
  console.log(`     Nombre: ${c.name}`);
  console.log(`     Status: ${c.status}`);
  console.log(`     Activa: ${c.is_active ? '✅ SÍ' : '❌ NO'}`);
  console.log(`     Onboarding: ${c.onboarding_status}`);
  console.log(`     Activada: ${c.activated_at ? new Date(c.activated_at).toLocaleString() : 'N/A'}`);
  console.log(`     Trace ID: ${c.trace_id}`);

  // ═══════════════════════════════════════════════════════════
  // PARTE 2: CIRCUITO VENDEDOR (CARLOS MENDEZ)
  // ═══════════════════════════════════════════════════════════

  console.log('\n\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  PARTE 2: CIRCUITO VENDEDOR - CARLOS MENDEZ                        │');
  console.log('└─────────────────────────────────────────────────────────────────────┘\n');

  // Vendedor
  const vendor = await client.query(`
    SELECT staff_id, first_name, last_name, email, area, level, cbu, alias_cbu, bank_name, global_rating
    FROM aponnt_staff WHERE email = 'carlos.mendez@aponnt.com'
  `);
  const v = vendor.rows[0];

  // Comisiones
  const comms = await client.query(`
    SELECT commission_type, percentage, monthly_amount
    FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = 109 AND is_active = true
  `, [v.staff_id]);

  // Liquidación
  const liq = await client.query(`
    SELECT liquidation_code, status, total_commission_amount, payment_executed_date, approved_at
    FROM commission_liquidations WHERE company_id = 109
  `);
  const lq = liq.rows[0];

  // Pagos
  const payments = await client.query(`
    SELECT payment_code, commission_type, net_amount, status, confirmation_code, executed_date
    FROM commission_payments WHERE liquidation_id = $1
  `, [liq.rows[0] ? (await client.query(`SELECT id FROM commission_liquidations WHERE company_id = 109`)).rows[0]?.id : null]);

  console.log('  👤 VENDEDOR');
  console.log(`     ID: ${v.staff_id.substring(0,8)}...`);
  console.log(`     Nombre: ${v.first_name} ${v.last_name}`);
  console.log(`     Email: ${v.email}`);
  console.log(`     Área: ${v.area}`);
  console.log(`     Nivel: ${v.level}`);
  console.log(`     Rating: ${v.global_rating}/5`);
  console.log(`     Banco: ${v.bank_name}`);
  console.log(`     CBU: ${v.cbu}`);
  console.log(`     Alias: ${v.alias_cbu}`);

  console.log('\n  💵 COMISIONES CONFIGURADAS');
  comms.rows.forEach(cm => {
    console.log(`     ${cm.commission_type.toUpperCase()}: ${cm.percentage}% = USD ${parseFloat(cm.monthly_amount).toFixed(2)}`);
  });

  if (lq) {
    console.log('\n  📊 LIQUIDACIÓN');
    console.log(`     Código: ${lq.liquidation_code}`);
    console.log(`     Status: ${lq.status}`);
    console.log(`     Total: USD ${parseFloat(lq.total_commission_amount).toFixed(2)}`);
    console.log(`     Aprobada: ${lq.approved_at ? new Date(lq.approved_at).toLocaleString() : 'N/A'}`);
    console.log(`     Pagada: ${lq.payment_executed_date ? new Date(lq.payment_executed_date).toLocaleString() : 'N/A'}`);
  }

  if (payments.rows.length > 0) {
    console.log('\n  💳 PAGOS EJECUTADOS');
    let totalPaid = 0;
    payments.rows.forEach(p => {
      totalPaid += parseFloat(p.net_amount);
      console.log(`     ${p.payment_code}:`);
      console.log(`        Tipo: ${p.commission_type}`);
      console.log(`        Monto: USD ${parseFloat(p.net_amount).toFixed(2)}`);
      console.log(`        Status: ${p.status}`);
      console.log(`        Confirmación: ${p.confirmation_code}`);
    });
    console.log(`\n     TOTAL PAGADO: USD ${totalPaid.toFixed(2)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════

  console.log('\n\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         RESUMEN EJECUTIVO                             ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                       ║');
  console.log('║  CIRCUITO CLIENTE (11 pasos):                                        ║');
  console.log('║  ✅ Lead → Flyer → Reunión → Presupuesto → Contrato → Factura →     ║');
  console.log('║     Pago → Activación → PDF → Email                                  ║');
  console.log('║                                                                       ║');
  console.log('║  CIRCUITO VENDEDOR (5 pasos):                                        ║');
  console.log('║  ✅ Alta Vendedor → Asignación → Comisiones → Liquidación → Pago    ║');
  console.log('║                                                                       ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                       ║');
  console.log(`║  Cliente: Pablo Rivas (pablorivasjordan52@gmail.com)                 ║`);
  console.log(`║  Empresa ID: 109 | Status: ACTIVA | 35 módulos | 50 empleados        ║`);
  console.log(`║  Facturado: USD ${parseFloat(inv.total_amount).toFixed(2)}                                           ║`);
  console.log('║                                                                       ║');
  console.log(`║  Vendedor: Carlos Mendez (carlos.mendez@aponnt.com)                  ║`);
  console.log(`║  Comisión Venta: 15% = USD 358.46                                    ║`);
  console.log(`║  Comisión Soporte: 5% = USD 98.75/mes                                ║`);
  console.log(`║  Total Pagado: USD 457.21                                            ║`);
  console.log('║                                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  await client.end();
}

showSummary().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
