/**
 * CIRCUITO VENDEDOR - PASO 3: Crear Comisiones
 * Crear las comisiones del vendedor para el circuito de Pablo Rivas
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

async function createCommissions() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO VENDEDOR - PASO 3: CREAR COMISIONES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Obtener datos de la factura
  const invoice = await client.query(`
    SELECT id, invoice_number, total_amount, status
    FROM invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [COMPANY_ID]);

  const inv = invoice.rows[0];
  console.log('FACTURA PAGADA:');
  console.log(`   Número: ${inv.invoice_number}`);
  console.log(`   Total: USD ${parseFloat(inv.total_amount).toFixed(2)}`);
  console.log(`   Status: ${inv.status}`);

  // 2. Verificar comisiones existentes
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VERIFICANDO COMISIONES EXISTENTES...');
  console.log('═══════════════════════════════════════════════════════════\n');

  const existingComm = await client.query(`
    SELECT id, commission_type, percentage, monthly_amount
    FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = $2 AND is_active = true
  `, [VENDOR_ID, COMPANY_ID]);

  if (existingComm.rows.length > 0) {
    console.log('Comisiones existentes:');
    existingComm.rows.forEach(c => {
      console.log(`   - ${c.commission_type}: ${c.percentage}% (monto: ${c.monthly_amount || 'N/A'})`);
    });
  } else {
    console.log('No hay comisiones existentes. Creando...');
  }

  // 3. Crear comisión de VENTA (15%)
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('CREANDO COMISIONES...');
  console.log('═══════════════════════════════════════════════════════════\n');

  const salesComm = existingComm.rows.find(c => c.commission_type === 'sales');
  if (!salesComm) {
    const salesAmount = parseFloat(inv.total_amount) * 0.15;
    await client.query(`
      INSERT INTO vendor_commissions (
        vendor_id, company_id, commission_type, percentage,
        monthly_amount, base_commission_amount, total_users,
        is_active, is_transferable, start_date, last_calculated,
        created_at, updated_at
      ) VALUES ($1, $2, 'sales', 15.00, $3, $4, 50, true, false, NOW(), NOW(), NOW(), NOW())
    `, [VENDOR_ID, COMPANY_ID, salesAmount, parseFloat(inv.total_amount)]);
    console.log(`✅ Comisión VENTA creada: 15% = USD ${salesAmount.toFixed(2)}`);
  } else {
    console.log(`⚠️  Comisión VENTA ya existe: ${salesComm.percentage}%`);
  }

  // 4. Crear comisión de SOPORTE (5% mensual)
  const supportComm = existingComm.rows.find(c => c.commission_type === 'support');
  if (!supportComm) {
    // Obtener total mensual del presupuesto
    const budget = await client.query(`
      SELECT total_monthly FROM budgets WHERE company_id = $1 LIMIT 1
    `, [COMPANY_ID]);
    const monthlyAmount = parseFloat(budget.rows[0]?.total_monthly || inv.total_amount);
    const supportAmount = monthlyAmount * 0.05;

    await client.query(`
      INSERT INTO vendor_commissions (
        vendor_id, company_id, commission_type, percentage,
        monthly_amount, base_commission_amount, total_users,
        is_active, is_transferable, start_date, last_calculated,
        created_at, updated_at
      ) VALUES ($1, $2, 'support', 5.00, $3, $4, 50, true, true, NOW(), NOW(), NOW(), NOW())
    `, [VENDOR_ID, COMPANY_ID, supportAmount, monthlyAmount]);
    console.log(`✅ Comisión SOPORTE creada: 5% mensual = USD ${supportAmount.toFixed(2)}/mes`);
  } else {
    console.log(`⚠️  Comisión SOPORTE ya existe: ${supportComm.percentage}%`);
  }

  // 5. Verificar vendor_statistics
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('ACTUALIZANDO ESTADÍSTICAS DEL VENDEDOR...');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Verificar si existe la tabla vendor_statistics
  const statsExists = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_statistics')
  `);

  if (statsExists.rows[0].exists) {
    // Verificar si ya tiene registro
    const existingStats = await client.query(`
      SELECT id FROM vendor_statistics WHERE vendor_id = $1
    `, [VENDOR_ID]);

    const allComms = await client.query(`
      SELECT commission_type, percentage, monthly_amount
      FROM vendor_commissions
      WHERE vendor_id = $1 AND is_active = true
    `, [VENDOR_ID]);

    const salesTotal = allComms.rows.find(c => c.commission_type === 'sales')?.monthly_amount || 0;
    const supportTotal = allComms.rows.find(c => c.commission_type === 'support')?.monthly_amount || 0;

    if (existingStats.rows.length === 0) {
      await client.query(`
        INSERT INTO vendor_statistics (
          vendor_id, total_companies, sales_companies, support_companies,
          total_users, sales_users, support_users,
          sales_commission_percentage, support_commission_percentage,
          total_sales_commission_usd, monthly_sales_commission_usd,
          total_support_commission_usd, monthly_support_commission_usd,
          grand_total_commission_usd, created_at, updated_at
        ) VALUES ($1, 1, 1, 1, 50, 50, 50, 15.00, 5.00, $2, $2, $3, $3, $4, NOW(), NOW())
      `, [VENDOR_ID, salesTotal, supportTotal, parseFloat(salesTotal) + parseFloat(supportTotal)]);
      console.log('✅ Estadísticas creadas para el vendedor');
    } else {
      await client.query(`
        UPDATE vendor_statistics SET
          total_companies = total_companies + 1,
          sales_companies = sales_companies + 1,
          support_companies = support_companies + 1,
          total_users = total_users + 50,
          sales_users = sales_users + 50,
          support_users = support_users + 50,
          total_sales_commission_usd = total_sales_commission_usd + $1,
          monthly_sales_commission_usd = $1,
          total_support_commission_usd = total_support_commission_usd + $2,
          monthly_support_commission_usd = $2,
          grand_total_commission_usd = grand_total_commission_usd + $3,
          updated_at = NOW()
        WHERE vendor_id = $4
      `, [salesTotal, supportTotal, parseFloat(salesTotal) + parseFloat(supportTotal), VENDOR_ID]);
      console.log('✅ Estadísticas actualizadas');
    }
  } else {
    console.log('⚠️  Tabla vendor_statistics no existe');
  }

  // 6. Resumen de comisiones
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RESUMEN DE COMISIONES - VENDEDOR CARLOS MENDEZ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const finalComms = await client.query(`
    SELECT commission_type, percentage, monthly_amount, base_commission_amount
    FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = $2 AND is_active = true
  `, [VENDOR_ID, COMPANY_ID]);

  let totalComm = 0;
  finalComms.rows.forEach(c => {
    const amount = parseFloat(c.monthly_amount || 0);
    totalComm += amount;
    console.log(`   ${c.commission_type.toUpperCase()}: ${c.percentage}% = USD ${amount.toFixed(2)}`);
    console.log(`      Base: USD ${parseFloat(c.base_commission_amount || 0).toFixed(2)}`);
  });

  console.log(`\n   TOTAL COMISIONES: USD ${totalComm.toFixed(2)}`);

  // 7. Variables para siguiente paso
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VARIABLES PARA SIGUIENTES PASOS:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`VENDOR_ID=${VENDOR_ID}`);
  console.log(`COMPANY_ID=${COMPANY_ID}`);
  console.log(`INVOICE_ID=${inv.id}`);
  console.log(`TOTAL_COMMISSION=${totalComm.toFixed(2)}`);

  await client.end();
}

createCommissions().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
