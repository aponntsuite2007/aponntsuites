const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

async function createInvoice() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('PASO 9: GENERAR FACTURA');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Obtener empresa
  const company = await client.query(`
    SELECT c.company_id, c.name, c.email, c.trace_id, c.contracted_employees,
           b.total_monthly, b.selected_modules
    FROM companies c
    JOIN budgets b ON b.company_id = c.company_id
    WHERE c.company_id = 109
  `);
  const co = company.rows[0];

  console.log('Empresa:', co.name, '(ID:', co.company_id + ')');
  console.log('Trace ID:', co.trace_id);
  console.log('Total mensual:', 'USD', co.total_monthly);

  // Crear factura
  const invoiceNumber = 'FAC-2026-' + Date.now().toString().slice(-6);
  const subtotal = parseFloat(co.total_monthly);
  const taxRate = 21.00;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  const invoiceResult = await client.query(`
    INSERT INTO invoices (
      company_id, invoice_number,
      billing_period_month, billing_period_year,
      subtotal, tax_rate, tax_amount, total_amount, currency,
      status, issue_date, due_date,
      internal_notes, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, NOW(), NOW()
    ) RETURNING id
  `, [
    co.company_id,
    invoiceNumber,
    new Date().getMonth() + 1,
    new Date().getFullYear(),
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    'USD',
    'PENDING',
    dueDate,
    `trace_id: ${co.trace_id} | Factura de alta - 35 módulos - 50 empleados`
  ]);

  const invoiceId = invoiceResult.rows[0].id;

  console.log('\n✅ FACTURA CREADA:');
  console.log('   Invoice ID:', invoiceId);
  console.log('   Número:', invoiceNumber);
  console.log('   \n   📊 DETALLE:');
  console.log('   - Subtotal: USD', subtotal.toFixed(2));
  console.log('   - IVA (21%):', 'USD', taxAmount.toFixed(2));
  console.log('   - TOTAL: USD', totalAmount.toFixed(2));
  console.log('   - Vencimiento:', dueDate.toISOString().split('T')[0]);
  console.log('   - Status: PENDING');

  // Actualizar onboarding_status de la empresa
  await client.query(`
    UPDATE companies SET onboarding_status = 'INVOICE_GENERATED', updated_at = NOW()
    WHERE company_id = $1
  `, [co.company_id]);
  console.log('\n✅ Empresa actualizada: onboarding_status = INVOICE_GENERATED');

  // Verificar
  const invoice = await client.query('SELECT id, invoice_number, total_amount, status, due_date FROM invoices WHERE id = $1', [invoiceId]);
  console.log('\n───────────────────────────────────────────────────────────');
  console.log('Factura:', JSON.stringify(invoice.rows[0], null, 2));
  console.log('INVOICE_ID=' + invoiceId);
  console.log('───────────────────────────────────────────────────────────');

  // ═══════════════════════════════════════════════════════════════════
  // ANÁLISIS DE FUNCIONALIDAD FALTANTE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  FUNCIONALIDAD FALTANTE PARA PROCESO DE FACTURACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. ❌ FALTA: Columna para PDF de factura');
  console.log('   - Agregar: invoice_pdf_path VARCHAR(500)');
  console.log('   - Agregar: invoice_pdf_uploaded_at TIMESTAMP');
  console.log('   - Agregar: invoice_pdf_uploaded_by UUID');

  console.log('\n2. ❌ FALTA: Sistema de envío de factura por email');
  console.log('   - Agregar: sent_to_email VARCHAR(255)');
  console.log('   - Agregar: sent_at ya existe ✅');
  console.log('   - Endpoint: POST /api/invoices/:id/send-email');
  console.log('   - Integrar con NotificationUnifiedService');

  console.log('\n3. ❌ FALTA: Upload de PDF desde panel');
  console.log('   - Endpoint: POST /api/invoices/:id/upload-pdf');
  console.log('   - Almacenar en: uploads/invoices/{company_id}/{invoice_number}.pdf');
  console.log('   - UI: Botón "Subir PDF" en detalle de factura');

  console.log('\n4. ❌ FALTA: Vincular factura con contrato');
  console.log('   - Agregar: contract_id UUID REFERENCES contracts(id)');
  console.log('   - Trazabilidad: Presupuesto → Contrato → Factura');

  console.log('\n5. ✅ EXISTE: Sistema de notificaciones (NotificationUnifiedService)');
  console.log('   - Puede enviar emails con attachments');
  console.log('   - Necesita integración con invoices');

  console.log('\n───────────────────────────────────────────────────────────');
  console.log('PRÓXIMO PASO: Implementar upload de PDF y envío por email');
  console.log('───────────────────────────────────────────────────────────');

  await client.end();
}

createInvoice().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
