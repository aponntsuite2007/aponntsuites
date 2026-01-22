/**
 * CIRCUITO VENDEDOR - PASO 2: Asignar Lead al Vendedor
 * Verificar estructura y asignar el vendedor al circuito de Pablo Rivas
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

async function assignLead() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO VENDEDOR - PASO 2: ASIGNAR LEAD Y VERIFICAR');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Ver estructura de sales_leads
  console.log('1. ESTRUCTURA DE SALES_LEADS...\n');
  const leadCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sales_leads' AND column_name LIKE '%vendor%'
  `);
  console.log('Columnas con "vendor":', leadCols.rows.map(r => r.column_name).join(', ') || 'NINGUNA');

  // Buscar columna de asignación
  const assignCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sales_leads'
    AND (column_name LIKE '%assign%' OR column_name LIKE '%staff%' OR column_name LIKE '%owner%')
  `);
  console.log('Columnas de asignación:', assignCols.rows.map(r => r.column_name).join(', ') || 'NINGUNA');

  // 2. Ver el lead de Pablo Rivas
  console.log('\n2. LEAD DE PABLO RIVAS...\n');
  const lead = await client.query(`
    SELECT * FROM sales_leads WHERE customer_company_id = $1
  `, [COMPANY_ID]);

  if (lead.rows.length > 0) {
    const l = lead.rows[0];
    console.log('   Lead ID:', l.id);
    console.log('   Empresa:', l.company_name);
    console.log('   Stage:', l.lifecycle_stage);
    console.log('   Score:', l.total_score);
    console.log('   Assigned to (si existe):', l.assigned_to || l.owner_id || 'N/A');
  }

  // 3. Ver budgets - tiene vendor_id?
  console.log('\n3. VERIFICANDO PRESUPUESTOS...\n');
  const budgetCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'budgets'
    AND (column_name LIKE '%vendor%' OR column_name LIKE '%staff%' OR column_name LIKE '%sales%')
  `);
  console.log('Columnas vendor en budgets:', budgetCols.rows.map(r => r.column_name).join(', ') || 'NINGUNA');

  const budget = await client.query(`
    SELECT id, budget_code, status, vendor_id, company_id
    FROM budgets WHERE company_id = $1
  `, [COMPANY_ID]);

  if (budget.rows.length > 0) {
    const b = budget.rows[0];
    console.log('   Budget ID:', b.id);
    console.log('   Código:', b.budget_code);
    console.log('   Status:', b.status);
    console.log('   Vendor ID:', b.vendor_id || 'SIN ASIGNAR');
  }

  // 4. Ver contratos - tiene vendor_id?
  console.log('\n4. VERIFICANDO CONTRATOS...\n');
  const contractCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'contracts'
    AND (column_name LIKE '%vendor%' OR column_name LIKE '%staff%' OR column_name LIKE '%sales%')
  `);
  console.log('Columnas vendor en contracts:', contractCols.rows.map(r => r.column_name).join(', ') || 'NINGUNA');

  const contract = await client.query(`
    SELECT id, contract_code, status, vendor_id, company_id
    FROM contracts WHERE company_id = $1
  `, [COMPANY_ID]);

  if (contract.rows.length > 0) {
    const c = contract.rows[0];
    console.log('   Contract ID:', c.id);
    console.log('   Código:', c.contract_code);
    console.log('   Status:', c.status);
    console.log('   Vendor ID:', c.vendor_id || 'SIN ASIGNAR');
  }

  // 5. Ver facturas - tiene vendor_id?
  console.log('\n5. VERIFICANDO FACTURAS...\n');
  const invoiceCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'invoices'
    AND (column_name LIKE '%vendor%' OR column_name LIKE '%staff%' OR column_name LIKE '%sales%')
  `);
  console.log('Columnas vendor en invoices:', invoiceCols.rows.map(r => r.column_name).join(', ') || 'NINGUNA');

  const invoice = await client.query(`
    SELECT id, invoice_number, total_amount, status, company_id
    FROM invoices WHERE company_id = $1
  `, [COMPANY_ID]);

  if (invoice.rows.length > 0) {
    const i = invoice.rows[0];
    console.log('   Invoice ID:', i.id);
    console.log('   Número:', i.invoice_number);
    console.log('   Total: USD', parseFloat(i.total_amount).toFixed(2));
    console.log('   Status:', i.status);
  }

  // 6. Asignar vendedor donde corresponda
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('6. ASIGNANDO VENDEDOR AL CIRCUITO PABLO RIVAS...');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Asignar en budget si tiene vendor_id
  if (budgetCols.rows.some(c => c.column_name === 'vendor_id')) {
    await client.query('UPDATE budgets SET vendor_id = $1, updated_at = NOW() WHERE company_id = $2', [VENDOR_ID, COMPANY_ID]);
    console.log('✅ Budget actualizado con vendor_id');
  } else {
    // Agregar columna vendor_id si no existe
    try {
      await client.query('ALTER TABLE budgets ADD COLUMN IF NOT EXISTS vendor_id UUID');
      await client.query('UPDATE budgets SET vendor_id = $1, updated_at = NOW() WHERE company_id = $2', [VENDOR_ID, COMPANY_ID]);
      console.log('✅ Columna vendor_id agregada a budgets y asignado');
    } catch (e) {
      console.log('⚠️  Budget: ' + e.message);
    }
  }

  // Asignar en contract si tiene vendor_id
  if (contractCols.rows.some(c => c.column_name === 'vendor_id')) {
    await client.query('UPDATE contracts SET vendor_id = $1, updated_at = NOW() WHERE company_id = $2', [VENDOR_ID, COMPANY_ID]);
    console.log('✅ Contract actualizado con vendor_id');
  } else {
    try {
      await client.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_id UUID');
      await client.query('UPDATE contracts SET vendor_id = $1, updated_at = NOW() WHERE company_id = $2', [VENDOR_ID, COMPANY_ID]);
      console.log('✅ Columna vendor_id agregada a contracts y asignado');
    } catch (e) {
      console.log('⚠️  Contract: ' + e.message);
    }
  }

  // 7. Crear vendor_commission para este vendedor
  console.log('\n7. CREANDO COMISIÓN DEL VENDEDOR...\n');

  // Ver estructura de vendor_commissions
  const vcExists = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_commissions')
  `);

  if (vcExists.rows[0].exists) {
    // Verificar si ya existe
    const existingComm = await client.query(`
      SELECT id FROM vendor_commissions
      WHERE vendor_id = $1 AND company_id = $2 AND commission_type = 'sales'
    `, [VENDOR_ID, COMPANY_ID]);

    if (existingComm.rows.length === 0) {
      await client.query(`
        INSERT INTO vendor_commissions (
          id, vendor_id, company_id, commission_type, percentage,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `, [uuidv4(), VENDOR_ID, COMPANY_ID, 'sales', 15.00]);
      console.log('✅ Comisión de VENTA creada (15%)');
    } else {
      console.log('⚠️  Ya existe comisión de venta para este vendedor');
    }

    // Crear comisión de soporte
    const existingSupportComm = await client.query(`
      SELECT id FROM vendor_commissions
      WHERE vendor_id = $1 AND company_id = $2 AND commission_type = 'support'
    `, [VENDOR_ID, COMPANY_ID]);

    if (existingSupportComm.rows.length === 0) {
      await client.query(`
        INSERT INTO vendor_commissions (
          id, vendor_id, company_id, commission_type, percentage,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `, [uuidv4(), VENDOR_ID, COMPANY_ID, 'support', 5.00]);
      console.log('✅ Comisión de SOPORTE creada (5%)');
    } else {
      console.log('⚠️  Ya existe comisión de soporte para este vendedor');
    }
  } else {
    console.log('❌ Tabla vendor_commissions no existe');
  }

  // 8. Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('RESUMEN DE ASIGNACIONES:');
  console.log('═══════════════════════════════════════════════════════════');

  const finalBudget = await client.query('SELECT budget_code, vendor_id FROM budgets WHERE company_id = $1', [COMPANY_ID]);
  const finalContract = await client.query('SELECT contract_code, vendor_id FROM contracts WHERE company_id = $1', [COMPANY_ID]);
  const finalCommissions = await client.query(`
    SELECT commission_type, percentage FROM vendor_commissions
    WHERE vendor_id = $1 AND company_id = $2 AND is_active = true
  `, [VENDOR_ID, COMPANY_ID]);

  console.log(`\n   Vendedor: Carlos Mendez (${VENDOR_ID.substring(0,8)}...)`);
  console.log(`   Empresa: Pablo Rivas (Company ID: ${COMPANY_ID})`);
  console.log(`   Budget: ${finalBudget.rows[0]?.budget_code} → vendor: ${finalBudget.rows[0]?.vendor_id ? '✅' : '❌'}`);
  console.log(`   Contract: ${finalContract.rows[0]?.contract_code} → vendor: ${finalContract.rows[0]?.vendor_id ? '✅' : '❌'}`);
  console.log(`   Comisiones:`);
  finalCommissions.rows.forEach(c => {
    console.log(`     - ${c.commission_type}: ${c.percentage}%`);
  });

  await client.end();
}

assignLead().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
