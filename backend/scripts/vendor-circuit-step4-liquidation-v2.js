/**
 * CIRCUITO VENDEDOR - PASO 4: Crear Liquidación de Comisiones (v2)
 * Generar liquidación desde la factura pagada
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

// IDs del paso anterior
const VENDOR_ID = 'd67aed34-3e66-4bb2-918f-3bbe27e215a0';
const COMPANY_ID = 109;

async function createLiquidation() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO VENDEDOR - PASO 4: CREAR LIQUIDACIÓN (v2)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Obtener factura y sus datos
  const invoice = await client.query(`
    SELECT id, invoice_number, total_amount, issue_date FROM invoices
    WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [COMPANY_ID]);

  const inv = invoice.rows[0];
  console.log('FACTURA PAGADA:');
  console.log(`   ID: ${inv.id}`);
  console.log(`   Número: ${inv.invoice_number}`);
  console.log(`   Total: USD ${parseFloat(inv.total_amount).toFixed(2)}`);

  // 2. Obtener comisiones del vendedor
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('COMISIONES DEL VENDEDOR:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const comms = await client.query(`
    SELECT id, commission_type, percentage, monthly_amount, base_commission_amount
    FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = $2 AND is_active = true
  `, [VENDOR_ID, COMPANY_ID]);

  let totalCommission = 0;
  const breakdown = [];

  comms.rows.forEach(c => {
    const amount = parseFloat(c.monthly_amount || 0);
    totalCommission += amount;
    console.log(`   ${c.commission_type.toUpperCase()}: ${c.percentage}% = USD ${amount.toFixed(2)}`);

    breakdown.push({
      vendor_id: VENDOR_ID,
      vendor_name: 'Carlos Mendez',
      amount: amount,
      type: c.commission_type === 'sales' ? 'DIRECT_SALES' : 'SUPPORT_TEMPORARY',
      percentage: parseFloat(c.percentage),
      base_amount: parseFloat(c.base_commission_amount || 0)
    });
  });

  console.log(`\n   TOTAL COMISIONES: USD ${totalCommission.toFixed(2)}`);

  // 3. Verificar si ya existe liquidación para esta empresa
  const existingLiq = await client.query(`
    SELECT id, liquidation_code, status FROM commission_liquidations
    WHERE company_id = $1 AND invoice_number = $2
  `, [COMPANY_ID, inv.invoice_number]);

  let liquidationId;
  let liquidationCode;
  let traceId;

  if (existingLiq.rows.length > 0) {
    liquidationId = existingLiq.rows[0].id;
    liquidationCode = existingLiq.rows[0].liquidation_code;
    console.log(`\n⚠️  Ya existe liquidación: ${liquidationCode} (${existingLiq.rows[0].status})`);
  } else {
    // 4. Crear liquidación
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('CREANDO LIQUIDACIÓN...');
    console.log('═══════════════════════════════════════════════════════════\n');

    liquidationId = uuidv4();
    traceId = `COMMISSION-${uuidv4()}`;
    liquidationCode = `LIQ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    await client.query(`
      INSERT INTO commission_liquidations (
        id, trace_id, company_id,
        liquidation_type, liquidation_code, liquidation_date,
        period_start, period_end,
        invoice_amount, invoice_number, invoice_date,
        total_commissionable, total_commission_amount,
        commission_breakdown, status, payment_method,
        source, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'ONBOARDING_IMMEDIATE', $4, NOW(),
        NOW(), NOW(),
        $5, $6, $7,
        $5, $8,
        $9, 'CALCULATED', 'TRANSFERENCIA',
        'onboarding', $10, NOW(), NOW()
      )
    `, [
      liquidationId,
      traceId,
      COMPANY_ID,
      liquidationCode,
      parseFloat(inv.total_amount),
      inv.invoice_number,
      inv.issue_date,
      totalCommission,
      JSON.stringify(breakdown),
      `Liquidación inmediata por onboarding - Factura ${inv.invoice_number} - Cliente: Pablo Rivas - Vendedor: Carlos Mendez`
    ]);

    console.log('✅ LIQUIDACIÓN CREADA:');
    console.log(`   ID: ${liquidationId}`);
    console.log(`   Código: ${liquidationCode}`);
    console.log(`   Trace ID: ${traceId}`);
  }

  // 5. Verificar/crear pagos individuales
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CREANDO PAGOS INDIVIDUALES...');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Obtener datos del vendedor
  const vendor = await client.query(`
    SELECT staff_id, first_name, last_name, cbu, bank_name, alias_cbu, tax_condition
    FROM aponnt_staff WHERE staff_id = $1
  `, [VENDOR_ID]);

  const v = vendor.rows[0];

  // Verificar pagos existentes
  const existingPayments = await client.query(`
    SELECT id FROM commission_payments WHERE liquidation_id = $1
  `, [liquidationId]);

  if (existingPayments.rows.length > 0) {
    console.log('⚠️  Ya existen pagos para esta liquidación');
  } else {
    // Crear pago para cada comisión
    for (const b of breakdown) {
      const paymentId = uuidv4();
      const paymentTraceId = `PAYMENT-${uuidv4()}`;
      const paymentCode = `PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

      // Calcular retención (21% si responsable inscripto, 0% si monotributista)
      const taxRate = v.tax_condition === 'responsable_inscripto' ? 0.21 : 0;
      const taxWithholding = b.amount * taxRate;
      const netAmount = b.amount - taxWithholding;

      await client.query(`
        INSERT INTO commission_payments (
          id, trace_id, liquidation_id, vendor_id, company_id,
          payment_code, payment_date, commission_amount, tax_withholding, net_amount,
          commission_type, commission_percentage, payment_method, bank_name, cbu, alias,
          status, scheduled_date, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14, $15,
          'PENDING', NOW() + INTERVAL '3 days', $16, NOW(), NOW()
        )
      `, [
        paymentId, paymentTraceId, liquidationId, VENDOR_ID, COMPANY_ID,
        paymentCode, b.amount, taxWithholding, netAmount,
        b.type, b.percentage, 'TRANSFERENCIA', v.bank_name, v.cbu, v.alias_cbu,
        `Pago ${b.type} - ${v.first_name} ${v.last_name}`
      ]);

      console.log(`✅ Pago ${b.type} creado:`);
      console.log(`   Código: ${paymentCode}`);
      console.log(`   Monto bruto: USD ${b.amount.toFixed(2)}`);
      console.log(`   Retención: USD ${taxWithholding.toFixed(2)} (${(taxRate * 100).toFixed(0)}%)`);
      console.log(`   Neto a pagar: USD ${netAmount.toFixed(2)}`);
      console.log(`   CBU: ${v.cbu}`);
      console.log('');
    }
  }

  // 6. Resumen final
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RESUMEN LIQUIDACIÓN Y PAGOS:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const liq = await client.query(`
    SELECT liquidation_code, status, invoice_amount, total_commission_amount
    FROM commission_liquidations WHERE id = $1
  `, [liquidationId]);

  const payments = await client.query(`
    SELECT payment_code, commission_type, commission_amount, tax_withholding, net_amount, status
    FROM commission_payments WHERE liquidation_id = $1
  `, [liquidationId]);

  console.log(`LIQUIDACIÓN: ${liq.rows[0].liquidation_code}`);
  console.log(`   Status: ${liq.rows[0].status}`);
  console.log(`   Factura: USD ${parseFloat(liq.rows[0].invoice_amount).toFixed(2)}`);
  console.log(`   Total Comisiones: USD ${parseFloat(liq.rows[0].total_commission_amount).toFixed(2)}`);

  console.log('\nPAGOS:');
  let totalNet = 0;
  payments.rows.forEach(p => {
    totalNet += parseFloat(p.net_amount);
    console.log(`   ${p.payment_code}: ${p.commission_type}`);
    console.log(`      Bruto: USD ${parseFloat(p.commission_amount).toFixed(2)} | Neto: USD ${parseFloat(p.net_amount).toFixed(2)} | Status: ${p.status}`);
  });

  console.log(`\nTOTAL NETO A PAGAR: USD ${totalNet.toFixed(2)}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VARIABLES PARA SIGUIENTE PASO:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`LIQUIDATION_ID=${liquidationId}`);
  console.log(`LIQUIDATION_CODE=${liquidationCode || liq.rows[0].liquidation_code}`);

  await client.end();
}

createLiquidation().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
