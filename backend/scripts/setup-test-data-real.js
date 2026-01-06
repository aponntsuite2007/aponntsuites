/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SETUP TEST DATA REAL - Crear empresa test completa con datos reales
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Crea en PostgreSQL:
 * 1. Empresa test: "Aponnt Testing Company"
 * 2. Usuario admin: admin@test.com con TODOS los permisos
 * 3. Departamentos base: RRHH, IT, Ventas, etc.
 * 4. Puestos base: Gerente, Empleado, etc.
 * 5. Turnos base: Mañana, Tarde, Noche
 * 6. Datos relacionales correctos (IDs válidos)
 *
 * USO:
 * node backend/scripts/setup-test-data-real.js
 *
 * @version 1.0.0
 * @date 2026-01-06
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const bcrypt = require('bcrypt');

// ═══════════════════════════════════════════════════════════════════════════
// CONEXIÓN A BASE DE DATOS - Usar config existente
// ═══════════════════════════════════════════════════════════════════════════

const database = require('../src/config/database');
const sequelize = database.sequelize;

// ═══════════════════════════════════════════════════════════════════════════
// DATOS DE TESTING
// ═══════════════════════════════════════════════════════════════════════════

const TEST_DATA = {
  company: {
    name: 'Aponnt Testing Company',
    slug: 'aponnt-empresa-demo',
    legal_name: 'Aponnt Testing Company S.A.',
    tax_id: '12-34567890-1',
    contact_email: 'testing@aponnt.com',
    contact_phone: '+54 11 1234-5678',
    address: 'Av. Test 1234',
    city: 'Buenos Aires',
    province: 'Buenos Aires',
    country: 'Argentina',
    is_active: true,
    max_employees: 100,
    license_type: 'enterprise'
  },

  admin: {
    employeeId: 'ADM-TEST-001',
    email: 'admin@test.com',
    password: 'Admin123!', // Se hasheará
    firstName: 'Admin',
    lastName: 'Testing',
    role: 'admin',
    email_verified: true,
    account_status: 'active'
  },

  departments: [
    { name: 'Recursos Humanos', code: 'RRHH', description: 'Gestión de personal' },
    { name: 'Tecnología', code: 'IT', description: 'Sistemas y desarrollo' },
    { name: 'Ventas', code: 'SALES', description: 'Área comercial' },
    { name: 'Administración', code: 'ADMIN', description: 'Administración general' },
    { name: 'Operaciones', code: 'OPS', description: 'Operaciones y logística' }
  ],

  positions: [
    { title: 'Gerente', level: 'senior', description: 'Gerencia de área' },
    { title: 'Supervisor', level: 'mid', description: 'Supervisión de equipo' },
    { title: 'Empleado', level: 'junior', description: 'Empleado operativo' },
    { title: 'Analista', level: 'mid', description: 'Análisis y reportes' },
    { title: 'Asistente', level: 'junior', description: 'Asistencia administrativa' }
  ],

  shifts: [
    {
      name: 'Turno Mañana',
      start_time: '08:00',
      end_time: '16:00',
      break_duration: 60,
      is_active: true
    },
    {
      name: 'Turno Tarde',
      start_time: '14:00',
      end_time: '22:00',
      break_duration: 60,
      is_active: true
    },
    {
      name: 'Turno Noche',
      start_time: '22:00',
      end_time: '06:00',
      break_duration: 60,
      is_active: true
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

async function checkExisting() {
  const [companies] = await sequelize.query(`
    SELECT company_id, name, slug
    FROM companies
    WHERE slug = :slug
  `, {
    replacements: { slug: TEST_DATA.company.slug }
  });

  return companies[0] || null;
}

async function deleteExisting(companyId) {
  console.log(`🗑️ Eliminando datos existentes de empresa ${companyId}...`);

  // Desactivar temporalmente los foreign key checks
  await sequelize.query('SET CONSTRAINTS ALL DEFERRED;');

  // Borrar en orden correcto (tablas dependientes primero)
  const tables = [
    'hour_bank_balances',
    'attendances',
    'vacation_requests',
    'sanctions',
    'training_enrollments',
    'employee_documents',
    'medical_records',
    'users',
    'shifts',
    'positions',
    'departments',
    'company_modules',
    'companies'
  ];

  for (const table of tables) {
    try {
      await sequelize.query(`DELETE FROM ${table} WHERE company_id = :id`, {
        replacements: { id: companyId }
      });
      console.log(`   ✅ ${table} limpiado`);
    } catch (e) {
      // Ignorar si la tabla no tiene company_id
      if (!e.message.includes('no existe la columna')) {
        console.log(`   ⚠️ ${table}: ${e.message}`);
      }
    }
  }

  // Finalmente borrar la empresa
  await sequelize.query('DELETE FROM companies WHERE company_id = :id', {
    replacements: { id: companyId }
  });

  console.log('   ✅ Datos antiguos eliminados');
}

async function createCompany() {
  console.log('\n📦 Creando empresa test...');

  const [result] = await sequelize.query(`
    INSERT INTO companies (
      name, slug, legal_name, tax_id, contact_email, contact_phone,
      address, city, province, country, is_active, max_employees, license_type,
      created_at, updated_at
    ) VALUES (
      :name, :slug, :legal_name, :tax_id, :contact_email, :contact_phone,
      :address, :city, :province, :country, :is_active, :max_employees, :license_type,
      NOW(), NOW()
    )
    RETURNING company_id, name, slug
  `, {
    replacements: TEST_DATA.company
  });

  const company = result[0];
  console.log(`   ✅ Empresa creada: ${company.name} (ID: ${company.company_id})`);

  return company;
}

async function createAdmin(companyId) {
  console.log('\n👤 Creando usuario admin...');

  // Hashear password
  const hashedPassword = await bcrypt.hash(TEST_DATA.admin.password, 10);

  const [result] = await sequelize.query(`
    INSERT INTO users (
      user_id, "employeeId", email, password, "firstName", "lastName",
      role, company_id, email_verified, account_status, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), :employeeId, :email, :password, :firstName, :lastName,
      :role, :company_id, :email_verified, :account_status, NOW(), NOW()
    )
    RETURNING user_id, "employeeId", email, role
  `, {
    replacements: {
      ...TEST_DATA.admin,
      password: hashedPassword,
      company_id: companyId
    }
  });

  const admin = result[0];
  console.log(`   ✅ Admin creado: ${admin.email} (${admin.employeeId})`);
  console.log(`   🔑 Password: ${TEST_DATA.admin.password}`);

  return admin;
}

async function createDepartments(companyId) {
  console.log('\n🏢 Creando departamentos...');

  const departments = [];

  for (const dept of TEST_DATA.departments) {
    const [result] = await sequelize.query(`
      INSERT INTO departments (
        name, code, description, company_id, is_active, created_at, updated_at
      ) VALUES (
        :name, :code, :description, :company_id, true, NOW(), NOW()
      )
      RETURNING department_id, name, code
    `, {
      replacements: {
        ...dept,
        company_id: companyId
      }
    });

    departments.push(result[0]);
    console.log(`   ✅ ${result[0].name} (${result[0].code})`);
  }

  return departments;
}

async function createPositions(companyId) {
  console.log('\n💼 Creando puestos...');

  const positions = [];

  for (const pos of TEST_DATA.positions) {
    const [result] = await sequelize.query(`
      INSERT INTO positions (
        title, level, description, company_id, is_active, created_at, updated_at
      ) VALUES (
        :title, :level, :description, :company_id, true, NOW(), NOW()
      )
      RETURNING position_id, title, level
    `, {
      replacements: {
        ...pos,
        company_id: companyId
      }
    });

    positions.push(result[0]);
    console.log(`   ✅ ${result[0].title} (${result[0].level})`);
  }

  return positions;
}

async function createShifts(companyId) {
  console.log('\n⏰ Creando turnos...');

  const shifts = [];

  for (const shift of TEST_DATA.shifts) {
    const [result] = await sequelize.query(`
      INSERT INTO shifts (
        name, start_time, end_time, break_duration, company_id, is_active, created_at, updated_at
      ) VALUES (
        :name, :start_time, :end_time, :break_duration, :company_id, :is_active, NOW(), NOW()
      )
      RETURNING shift_id, name, start_time, end_time
    `, {
      replacements: {
        ...shift,
        company_id: companyId
      }
    });

    shifts.push(result[0]);
    console.log(`   ✅ ${result[0].name} (${result[0].start_time} - ${result[0].end_time})`);
  }

  return shifts;
}

async function activateAllModules(companyId) {
  console.log('\n🔧 Activando todos los módulos para testing...');

  await sequelize.query(`
    INSERT INTO company_modules (company_id, module_id, enabled, created_at, updated_at)
    SELECT :company_id, module_id, true, NOW(), NOW()
    FROM system_modules
    WHERE is_active = true
    ON CONFLICT (company_id, module_id) DO UPDATE
    SET enabled = true
  `, {
    replacements: { company_id: companyId }
  });

  const [modules] = await sequelize.query(`
    SELECT COUNT(*) as count
    FROM company_modules
    WHERE company_id = :company_id AND enabled = true
  `, {
    replacements: { company_id: companyId }
  });

  console.log(`   ✅ ${modules[0].count} módulos activados`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN - Ejecutar setup completo
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 SETUP TEST DATA REAL - Creando empresa test completa');
  console.log('═'.repeat(80));

  try {
    // 1. Conectar a BD
    console.log('\n🔌 Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('   ✅ Conexión exitosa');

    // 2. Verificar si ya existe
    const existing = await checkExisting();
    if (existing) {
      console.log(`\n✅ Empresa test ya existe (ID: ${existing.company_id})`);
      console.log('   Reutilizando empresa existente...');
      console.log('   (Para eliminar y recrear, ejecutar manualmente DELETE FROM companies WHERE slug = \'aponnt-empresa-demo\')');

      // Obtener admin existente
      const [admins] = await sequelize.query(`
        SELECT user_id, "employeeId", email, role
        FROM users
        WHERE company_id = :id AND role = 'admin'
        LIMIT 1
      `, {
        replacements: { id: existing.company_id }
      });

      const admin = admins[0];

      // Resumen con datos existentes
      console.log('\n' + '═'.repeat(80));
      console.log('✅ USANDO EMPRESA TEST EXISTENTE');
      console.log('═'.repeat(80));
      console.log('\n📊 RESUMEN:');
      console.log(`   🏢 Empresa: ${existing.name} (ID: ${existing.company_id})`);
      if (admin) {
        console.log(`   👤 Admin: ${admin.email}`);
        console.log(`   🔑 EmployeeId: ${admin.employeeId}`);
      }
      console.log('\n📋 CREDENCIALES PARA LOGIN:');
      console.log(`   Empresa: ${existing.slug}`);
      console.log(`   Usuario: administrador (o ${admin?.employeeId || 'verificar en BD'})`);
      console.log(`   Password: admin123`);
      console.log('\n🎯 PRÓXIMO PASO:');
      console.log('   node backend/scripts/run-master-testing.js');
      console.log('═'.repeat(80) + '\n');

      await sequelize.close();
      return;
    }

    // 3. Crear empresa
    const company = await createCompany();

    // 4. Crear admin
    const admin = await createAdmin(company.company_id);

    // 5. Crear departamentos
    const departments = await createDepartments(company.company_id);

    // 6. Crear puestos
    const positions = await createPositions(company.company_id);

    // 7. Crear turnos
    const shifts = await createShifts(company.company_id);

    // 8. Activar todos los módulos
    await activateAllModules(company.company_id);

    // 9. Resumen final
    console.log('\n' + '═'.repeat(80));
    console.log('✅ SETUP COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log(`   🏢 Empresa: ${company.name} (ID: ${company.company_id})`);
    console.log(`   👤 Admin: ${admin.email}`);
    console.log(`   🔑 Password: ${TEST_DATA.admin.password}`);
    console.log(`   🏢 Departamentos: ${departments.length}`);
    console.log(`   💼 Puestos: ${positions.length}`);
    console.log(`   ⏰ Turnos: ${shifts.length}`);
    console.log('\n📋 CREDENCIALES PARA LOGIN:');
    console.log(`   Empresa: ${company.slug}`);
    console.log(`   Usuario: ${admin.employeeId}`);
    console.log(`   Password: ${TEST_DATA.admin.password}`);
    console.log('\n🎯 PRÓXIMO PASO:');
    console.log('   node backend/scripts/run-master-testing.js');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
main();
