/**
 * CIRCUITO VENDEDOR - PASO 1: Crear Vendedor
 * Crear un vendedor real en aponnt_staff
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

async function createVendor() {
  await client.connect();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('CIRCUITO VENDEDOR - PASO 1: CREAR VENDEDOR');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Ver estructura de tablas
  console.log('1. VERIFICANDO TABLAS...\n');

  // Ver staff existente
  const existingStaff = await client.query(`
    SELECT staff_id, first_name, last_name, email, role_id, area, level, country, is_active
    FROM aponnt_staff
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 3
  `);

  console.log('Staff existente:');
  existingStaff.rows.forEach(s => {
    console.log(`  - ${s.first_name} ${s.last_name} (${s.email}) | area: ${s.area} | level: ${s.level}`);
  });

  // Ver si ya existe un role_id que podamos usar
  let roleId = null;
  if (existingStaff.rows.length > 0) {
    roleId = existingStaff.rows[0].role_id;
    console.log(`\nUsando role_id existente: ${roleId}`);
  } else {
    // Crear un role_id genérico
    roleId = uuidv4();
    console.log(`\nGenerando nuevo role_id: ${roleId}`);
  }

  // 2. Crear el vendedor
  console.log('\n2. CREANDO VENDEDOR...\n');

  const vendorData = {
    staff_id: uuidv4(),
    first_name: 'Carlos',
    last_name: 'Mendez',
    email: 'carlos.mendez@aponnt.com',
    phone: '+54 9 2657 123456',
    document_type: 'DNI',
    document_number: '30123456',
    role_id: roleId,
    country: 'AR', // Código ISO de país
    nationality: 'AR',
    level: 1, // Vendedor directo
    area: 'comercial',
    language_preference: 'es',
    contract_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    cbu: '0110012230001234567890',
    bank_name: 'Banco Nación',
    bank_account_type: 'caja_ahorro',
    alias_cbu: 'CARLOS.MENDEZ.APONNT',
    accepts_support_packages: true,
    accepts_auctions: true,
    whatsapp_number: '+54 9 2657 123456',
    global_rating: 4.5,
    is_active: true,
    tax_id: '20-30123456-9',
    tax_condition: 'monotributista',
    accepts_electronic_payment: true,
    bank_data_verified: true,
    bank_data_verified_at: new Date()
  };

  // Verificar si ya existe
  const existing = await client.query(
    'SELECT staff_id FROM aponnt_staff WHERE email = $1',
    [vendorData.email]
  );

  let vendorId;
  if (existing.rows.length > 0) {
    vendorId = existing.rows[0].staff_id;
    console.log('⚠️  Vendedor ya existe, usando ID existente:', vendorId);
  } else {
    await client.query(`
      INSERT INTO aponnt_staff (
        staff_id, first_name, last_name, email, phone,
        document_type, document_number, role_id,
        country, nationality, level, area, language_preference,
        contract_type, hire_date, cbu, bank_name, bank_account_type,
        alias_cbu, accepts_support_packages, accepts_auctions,
        whatsapp_number, global_rating, is_active,
        tax_id, tax_condition, accepts_electronic_payment,
        bank_data_verified, bank_data_verified_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW()
      )
    `, [
      vendorData.staff_id, vendorData.first_name, vendorData.last_name,
      vendorData.email, vendorData.phone, vendorData.document_type,
      vendorData.document_number, vendorData.role_id, vendorData.country,
      vendorData.nationality, vendorData.level, vendorData.area,
      vendorData.language_preference, vendorData.contract_type,
      vendorData.hire_date, vendorData.cbu, vendorData.bank_name,
      vendorData.bank_account_type, vendorData.alias_cbu,
      vendorData.accepts_support_packages, vendorData.accepts_auctions,
      vendorData.whatsapp_number, vendorData.global_rating,
      vendorData.is_active, vendorData.tax_id, vendorData.tax_condition,
      vendorData.accepts_electronic_payment, vendorData.bank_data_verified,
      vendorData.bank_data_verified_at
    ]);
    vendorId = vendorData.staff_id;
    console.log('✅ VENDEDOR CREADO:');
  }

  // 3. Verificar vendedor creado
  const vendor = await client.query(`
    SELECT staff_id, first_name, last_name, email, phone, area, level,
           country, cbu, bank_name, alias_cbu, global_rating, is_active,
           tax_id, tax_condition
    FROM aponnt_staff WHERE staff_id = $1
  `, [vendorId]);

  const v = vendor.rows[0];
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VENDEDOR CREADO/VERIFICADO:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Staff ID: ${v.staff_id}`);
  console.log(`   Nombre: ${v.first_name} ${v.last_name}`);
  console.log(`   Email: ${v.email}`);
  console.log(`   Teléfono: ${v.phone}`);
  console.log(`   Área: ${v.area}`);
  console.log(`   Nivel: ${v.level} (1=vendedor directo)`);
  console.log(`   País: ${v.country}`);
  console.log(`   CBU: ${v.cbu}`);
  console.log(`   Banco: ${v.bank_name}`);
  console.log(`   Alias CBU: ${v.alias_cbu}`);
  console.log(`   Rating: ${v.global_rating}/5`);
  console.log(`   CUIT: ${v.tax_id}`);
  console.log(`   Condición: ${v.tax_condition}`);
  console.log(`   Activo: ${v.is_active}`);

  // 4. Verificar el lead de Pablo Rivas
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VERIFICANDO LEAD PABLO RIVAS:');
  console.log('═══════════════════════════════════════════════════════════');

  const lead = await client.query(`
    SELECT id, company_name, vendor_id, lifecycle_stage, customer_company_id, total_score
    FROM sales_leads WHERE customer_company_id = 109
  `);

  if (lead.rows.length > 0) {
    const l = lead.rows[0];
    console.log(`   Lead ID: ${l.id}`);
    console.log(`   Empresa: ${l.company_name}`);
    console.log(`   Vendor asignado: ${l.vendor_id || 'SIN ASIGNAR'}`);
    console.log(`   Stage: ${l.lifecycle_stage}`);
    console.log(`   Company ID: ${l.customer_company_id}`);
    console.log(`   Score: ${l.total_score}`);
  } else {
    console.log('   ❌ No se encontró lead de Pablo Rivas');
  }

  // 5. Guardar el vendor_id para los siguientes pasos
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('VARIABLES PARA SIGUIENTES PASOS:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`VENDOR_ID=${vendorId}`);
  console.log(`LEAD_ID=${lead.rows[0]?.id || 'N/A'}`);
  console.log(`COMPANY_ID=109`);

  await client.end();
}

createVendor().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
