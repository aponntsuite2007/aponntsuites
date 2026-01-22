/**
 * CIRCUITO VENDEDOR - PASO 4: Crear Liquidación de Comisiones
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
const INVOICE_ID = 6;

async function createLiquidation() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO VENDEDOR - PASO 4: CREAR LIQUIDACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Verificar estructura de commission_liquidations
  console.log('1. VERIFICANDO TABLA commission_liquidations...\n');

  const clExists = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_liquidations')
  `);

  if (!clExists.rows[0].exists) {
    console.log('❌ Tabla commission_liquidations NO existe. Creando...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_liquidations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id VARCHAR(100) UNIQUE NOT NULL,
        invoice_id INTEGER REFERENCES invoices(id),
        company_id INTEGER REFERENCES companies(company_id),
        liquidation_type VARCHAR(50) NOT NULL DEFAULT 'ONBOARDING_IMMEDIATE',
        liquidation_code VARCHAR(50) UNIQUE NOT NULL,
        invoice_amount DECIMAL(15,2) NOT NULL,
        total_commission_amount DECIMAL(15,2) NOT NULL,
        commission_breakdown JSONB NOT NULL DEFAULT '[]',
        status VARCHAR(30) NOT NULL DEFAULT 'CALCULATED',
        approved_by UUID,
        approved_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla commission_liquidations creada');
  } else {
    console.log('✅ Tabla commission_liquidations existe');
  }

  // 2. Obtener comisiones del vendedor
  console.log('\n2. OBTENIENDO COMISIONES DEL VENDEDOR...\n');

  const comms = await client.query(`
    SELECT id, commission_type, percentage, monthly_amount, base_commission_amount
    FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = $2 AND is_active = true
  `, [VENDOR_ID, COMPANY_ID]);

  console.log('Comisiones activas:');
  let totalCommission = 0;
  const breakdown = [];

  comms.rows.forEach(c => {
    const amount = parseFloat(c.monthly_amount || 0);
    totalCommission += amount;
    console.log(`   - ${c.commission_type}: ${c.percentage}% = USD ${amount.toFixed(2)}`);

    breakdown.push({
      vendor_id: VENDOR_ID,
      vendor_name: 'Carlos Mendez',
      amount: amount,
      type: c.commission_type === 'sales' ? 'DIRECT_SALES' : 'SUPPORT_MONTHLY',
      percentage: parseFloat(c.percentage),
      base_amount: parseFloat(c.base_commission_amount || 0)
    });
  });

  console.log(`\n   TOTAL: USD ${totalCommission.toFixed(2)}`);

  // 3. Obtener factura
  const invoice = await client.query(`
    SELECT id, invoice_number, total_amount FROM invoices WHERE id = $1
  `, [INVOICE_ID]);

  const inv = invoice.rows[0];

  // 4. Verificar si ya existe liquidación
  const existingLiq = await client.query(`
    SELECT id, liquidation_code, status FROM commission_liquidations
    WHERE invoice_id = $1
  `, [INVOICE_ID]);

  let liquidationId;
  let liquidationCode;

  if (existingLiq.rows.length > 0) {
    liquidationId = existingLiq.rows[0].id;
    liquidationCode = existingLiq.rows[0].liquidation_code;
    console.log(`\n⚠️  Ya existe liquidación: ${liquidationCode} (${existingLiq.rows[0].status})`);
  } else {
    // 5. Crear liquidación
    console.log('\n3. CREANDO LIQUIDACIÓN...\n');

    liquidationId = uuidv4();
    const traceId = `COMMISSION-${uuidv4()}`;
    liquidationCode = `LIQ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    await client.query(`
      INSERT INTO commission_liquidations (
        id, trace_id, invoice_id, company_id,
        liquidation_type, liquidation_code,
        invoice_amount, total_commission_amount,
        commission_breakdown, status, payment_method,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'ONBOARDING_IMMEDIATE', $5, $6, $7, $8, 'CALCULATED', 'TRANSFERENCIA',
        $9, NOW(), NOW()
      )
    `, [
      liquidationId,
      traceId,
      INVOICE_ID,
      COMPANY_ID,
      liquidationCode,
      parseFloat(inv.total_amount),
      totalCommission,
      JSON.stringify(breakdown),
      `Liquidación automática por pago de factura ${inv.invoice_number} - Cliente: Pablo Rivas - Vendedor: Carlos Mendez`
    ]);

    console.log('✅ LIQUIDACIÓN CREADA:');
    console.log(`   ID: ${liquidationId}`);
    console.log(`   Código: ${liquidationCode}`);
    console.log(`   Trace ID: ${traceId}`);
    console.log(`   Monto Factura: USD ${parseFloat(inv.total_amount).toFixed(2)}`);
    console.log(`   Total Comisiones: USD ${totalCommission.toFixed(2)}`);
    console.log(`   Status: CALCULATED`);
  }

  // 6. Verificar tabla commission_payments
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('4. VERIFICANDO TABLA commission_payments...');
  console.log('═══════════════════════════════════════════════════════════\n');

  const cpExists = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commission_payments')
  `);

  if (!cpExists.rows[0].exists) {
    console.log('❌ Tabla commission_payments NO existe. Creando...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id VARCHAR(100) UNIQUE NOT NULL,
        liquidation_id UUID REFERENCES commission_liquidations(id),
        vendor_id UUID NOT NULL,
        company_id INTEGER,
        payment_code VARCHAR(50) UNIQUE NOT NULL,
        commission_amount DECIMAL(15,2) NOT NULL,
        tax_withholding DECIMAL(15,2) DEFAULT 0,
        net_amount DECIMAL(15,2) NOT NULL,
        commission_type VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50),
        bank_name VARCHAR(100),
        account_type VARCHAR(50),
        cbu VARCHAR(30),
        alias VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        scheduled_date DATE,
        paid_at TIMESTAMP WITH TIME ZONE,
        receipt_url VARCHAR(500),
        reconciled BOOLEAN DEFAULT FALSE,
        reconciled_by UUID,
        reconciled_at TIMESTAMP WITH TIME ZONE,
        notification_sent BOOLEAN DEFAULT FALSE,
        notification_sent_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla commission_payments creada');
  } else {
    console.log('✅ Tabla commission_payments existe');
  }

  // 7. Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RESUMEN LIQUIDACIÓN:');
  console.log('═══════════════════════════════════════════════════════════\n');

  const liq = await client.query(`
    SELECT * FROM commission_liquidations WHERE id = $1
  `, [liquidationId]);

  if (liq.rows.length > 0) {
    const l = liq.rows[0];
    console.log(`   Código: ${l.liquidation_code}`);
    console.log(`   Tipo: ${l.liquidation_type}`);
    console.log(`   Status: ${l.status}`);
    console.log(`   Factura: USD ${parseFloat(l.invoice_amount).toFixed(2)}`);
    console.log(`   Comisiones: USD ${parseFloat(l.total_commission_amount).toFixed(2)}`);
    console.log(`   Método pago: ${l.payment_method}`);

    console.log('\n   Breakdown:');
    const brk = JSON.parse(l.commission_breakdown);
    brk.forEach(b => {
      console.log(`     - ${b.vendor_name}: ${b.type} = USD ${b.amount.toFixed(2)} (${b.percentage}%)`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VARIABLES PARA SIGUIENTE PASO:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`LIQUIDATION_ID=${liquidationId}`);
  console.log(`LIQUIDATION_CODE=${liquidationCode}`);

  await client.end();
}

createLiquidation().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
