/**
 * Script para exportar datos de PostgreSQL local a formato SQL
 * Para migrar a producción (Render)
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');

// Conectar a PostgreSQL LOCAL
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function exportData() {
  try {
    console.log('🔄 Conectando a PostgreSQL local...');
    await sequelize.authenticate();
    console.log('✅ Conectado');

    let sqlStatements = [];

    // Header
    sqlStatements.push('-- Datos exportados desde PostgreSQL local');
    sqlStatements.push(`-- Fecha: ${new Date().toISOString()}`);
    sqlStatements.push('-- IMPORTANTE: Ejecutar en orden');
    sqlStatements.push('');

    // 1. Exportar COMPANIES
    console.log('📋 Exportando empresas...');
    const [companies] = await sequelize.query(`
      SELECT * FROM companies ORDER BY company_id
    `);

    console.log(`   Encontradas: ${companies.length} empresas`);

    if (companies.length > 0) {
      sqlStatements.push('-- 1. COMPANIES');
      companies.forEach(company => {
        const values = [
          company.company_id ? `${company.company_id}` : 'DEFAULT',
          `'${escapeSql(company.name)}'`,
          `'${escapeSql(company.slug)}'`,
          company.email ? `'${escapeSql(company.email)}'` : 'NULL',
          company.phone ? `'${escapeSql(company.phone)}'` : 'NULL',
          company.address ? `'${escapeSql(company.address)}'` : 'NULL',
          company.city ? `'${escapeSql(company.city)}'` : 'NULL',
          company.country ? `'${escapeSql(company.country)}'` : "'Argentina'",
          company.tax_id ? `'${escapeSql(company.tax_id)}'` : 'NULL',
          company.is_active !== undefined ? company.is_active : 'true',
          company.max_employees || 50,
          company.contracted_employees || 1,
          company.license_type ? `'${escapeSql(company.license_type)}'` : "'basic'",
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO companies (company_id, name, slug, email, phone, address, city, country, tax_id, is_active, max_employees, contracted_employees, license_type, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (slug) DO NOTHING;`
        );
      });

      // Resetear sequence de company_id
      const maxId = Math.max(...companies.map(c => c.company_id || 0));
      sqlStatements.push(`SELECT setval('companies_company_id_seq', ${maxId}, true);`);
      sqlStatements.push('');
    }

    // 2. Exportar USERS
    console.log('👥 Exportando usuarios...');
    const [users] = await sequelize.query(`
      SELECT * FROM users ORDER BY user_id
    `);

    console.log(`   Encontrados: ${users.length} usuarios`);

    if (users.length > 0) {
      sqlStatements.push('-- 2. USERS');
      users.forEach(user => {
        const values = [
          user.user_id ? `'${user.user_id}'` : 'gen_random_uuid()',
          `'${escapeSql(user.employeeId || user.employeeId)}'`,
          `'${escapeSql(user.usuario)}'`,
          `'${escapeSql(user.firstName || user.firstName)}'`,
          `'${escapeSql(user.lastName || user.lastName)}'`,
          `'${escapeSql(user.email)}'`,
          `'${escapeSql(user.password)}'`,
          user.role ? `'${escapeSql(user.role)}'` : "'employee'",
          user.company_id || 'NULL',
          user.is_active !== undefined ? user.is_active : 'true',
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO users (user_id, "employeeId", usuario, "firstName", "lastName", email, password, role, company_id, is_active, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT ("employeeId") DO NOTHING;`
        );
      });
      sqlStatements.push('');
    }

    // 3. Exportar DEPARTMENTS
    console.log('🏢 Exportando departamentos...');
    const [departments] = await sequelize.query(`
      SELECT * FROM departments ORDER BY id
    `);

    console.log(`   Encontrados: ${departments.length} departamentos`);

    if (departments.length > 0) {
      sqlStatements.push('-- 3. DEPARTMENTS');
      departments.forEach(dept => {
        const values = [
          `'${escapeSql(dept.name)}'`,
          dept.company_id || 'NULL',
          dept.is_active !== undefined ? dept.is_active : 'true',
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO departments (name, company_id, is_active, created_at, updated_at) VALUES (${values.join(', ')});`
        );
      });
      sqlStatements.push('');
    }

    // 4. Exportar SHIFTS
    console.log('⏰ Exportando turnos...');
    const [shifts] = await sequelize.query(`
      SELECT * FROM shifts ORDER BY id
    `);

    console.log(`   Encontrados: ${shifts.length} turnos`);

    if (shifts.length > 0) {
      sqlStatements.push('-- 4. SHIFTS');
      shifts.forEach(shift => {
        const values = [
          `'${escapeSql(shift.name)}'`,
          shift.start_time ? `'${shift.start_time}'` : 'NULL',
          shift.end_time ? `'${shift.end_time}'` : 'NULL',
          shift.company_id || 'NULL',
          shift.is_active !== undefined ? shift.is_active : 'true',
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO shifts (name, start_time, end_time, company_id, is_active, created_at, updated_at) VALUES (${values.join(', ')});`
        );
      });
      sqlStatements.push('');
    }

    // 5. Exportar SYSTEM_MODULES
    console.log('📦 Exportando módulos del sistema...');
    const [systemModules] = await sequelize.query(`
      SELECT * FROM system_modules ORDER BY display_order
    `);

    console.log(`   Encontrados: ${systemModules.length} módulos del sistema`);

    if (systemModules.length > 0) {
      sqlStatements.push('-- 5. SYSTEM_MODULES');
      systemModules.forEach(sm => {
        const values = [
          sm.id ? `'${sm.id}'` : 'gen_random_uuid()',
          `'${escapeSql(sm.module_key)}'`,
          `'${escapeSql(sm.name)}'`,
          sm.description ? `'${escapeSql(sm.description)}'` : 'NULL',
          sm.category ? `'${escapeSql(sm.category)}'` : "'core'",
          sm.base_price || 0,
          sm.is_active !== undefined ? sm.is_active : 'true',
          sm.is_core !== undefined ? sm.is_core : 'false',
          sm.display_order || 0,
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO system_modules (id, module_key, name, description, category, base_price, is_active, is_core, display_order, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (module_key) DO NOTHING;`
        );
      });
      sqlStatements.push('');
    }

    // 6. Exportar COMPANY_MODULES
    console.log('🔗 Exportando módulos contratados por empresas...');
    const [companyModules] = await sequelize.query(`
      SELECT * FROM company_modules ORDER BY company_id
    `);

    console.log(`   Encontrados: ${companyModules.length} módulos contratados`);

    if (companyModules.length > 0) {
      sqlStatements.push('-- 6. COMPANY_MODULES');
      companyModules.forEach(cm => {
        const values = [
          cm.id ? `'${cm.id}'` : 'gen_random_uuid()',
          cm.company_id,
          cm.system_module_id ? `'${cm.system_module_id}'` : 'NULL',
          cm.is_active !== undefined ? cm.is_active : 'true',
          cm.contracted_price || 0,
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO company_modules (id, company_id, system_module_id, is_active, contracted_price, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;`
        );
      });
      sqlStatements.push('');
    }

    // 7. Exportar KIOSKS
    console.log('🖥️  Exportando kiosks...');
    const [kiosks] = await sequelize.query(`
      SELECT * FROM kiosks ORDER BY id
    `);

    console.log(`   Encontrados: ${kiosks.length} kiosks`);

    if (kiosks.length > 0) {
      sqlStatements.push('-- 7. KIOSKS');
      kiosks.forEach(kiosk => {
        const values = [
          `'${escapeSql(kiosk.name)}'`,
          kiosk.company_id || 'NULL',
          kiosk.is_active !== undefined ? kiosk.is_active : 'true',
          'NOW()',
          'NOW()'
        ];

        sqlStatements.push(
          `INSERT INTO kiosks (name, company_id, is_active, created_at, updated_at) VALUES (${values.join(', ')});`
        );
      });
      sqlStatements.push('');
    }

    // Escribir archivo
    const sqlContent = sqlStatements.join('\n');
    const filename = `migration-data-${Date.now()}.sql`;
    fs.writeFileSync(filename, sqlContent, 'utf-8');

    console.log('');
    console.log('✅ EXPORTACIÓN COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Archivo generado: ${filename}`);
    console.log(`📊 Resumen:`);
    console.log(`   - ${companies.length} empresas`);
    console.log(`   - ${users.length} usuarios`);
    console.log(`   - ${departments.length} departamentos`);
    console.log(`   - ${shifts.length} turnos`);
    console.log(`   - ${kiosks.length} kiosks`);
    console.log('');
    console.log('📋 SIGUIENTE PASO:');
    console.log(`   node import-to-render.js ${filename}`);
    console.log('');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Función para escapar strings SQL
function escapeSql(str) {
  if (!str) return '';
  return str.toString().replace(/'/g, "''");
}

exportData();
