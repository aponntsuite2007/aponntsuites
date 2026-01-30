#!/usr/bin/env node
/**
 * Script para agregar datos de prueba a ISI (company_id: 11)
 * Para completar los 6 SKIPs del test E2E
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL\n');

    const COMPANY_ID = 11; // ISI

    // 1. Verificar tablas existentes
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    console.log(`📋 Total tablas: ${tables.length}`);

    const relevant = tables.filter(t =>
      t.tablename.includes('vacation') ||
      t.tablename.includes('balance') ||
      t.tablename.includes('sector') ||
      t.tablename.includes('fiscal')
    );
    console.log('📋 Tablas relevantes:');
    relevant.forEach(t => console.log(`   - ${t.tablename}`));

    // 2. Obtener usuario admin de ISI
    const [users] = await sequelize.query(`
      SELECT user_id, "firstName", "lastName", role FROM users WHERE company_id = ${COMPANY_ID} LIMIT 5
    `);
    console.log('\n👤 Usuarios ISI:');
    users.forEach(u => console.log(`   ${u.user_id.substring(0,8)}... - ${u.firstName} ${u.lastName} (${u.role})`));

    const adminUser = users.find(u => u.role === 'admin') || users[0];
    if (!adminUser) {
      console.log('❌ No hay usuarios en ISI');
      return;
    }
    console.log(`\n🎯 Usuario de prueba: ${adminUser.firstName} ${adminUser.lastName}`);

    // 3. Verificar/Crear departamento para sectors
    const [depts] = await sequelize.query(`
      SELECT id, name FROM departments WHERE company_id = ${COMPANY_ID} LIMIT 3
    `);
    console.log('\n🏢 Departamentos ISI:');
    if (depts.length > 0) {
      depts.forEach(d => console.log(`   ${d.id} - ${d.name}`));
    } else {
      console.log('   (vacío) - Creando departamento...');
      await sequelize.query(`
        INSERT INTO departments (company_id, name, description, created_at, updated_at)
        VALUES (${COMPANY_ID}, 'Departamento Test E2E', 'Creado para tests', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `);
    }

    // 4. Verificar/Crear sector raíz para FK
    const [sectors] = await sequelize.query(`
      SELECT id, name FROM sectors WHERE company_id = ${COMPANY_ID} LIMIT 3
    `);
    console.log('\n📍 Sectores ISI:');
    if (sectors.length > 0) {
      sectors.forEach(s => console.log(`   ${s.id} - ${s.name}`));
    } else {
      // Get department_id first
      const [dept] = await sequelize.query(`
        SELECT id FROM departments WHERE company_id = ${COMPANY_ID} LIMIT 1
      `);
      if (dept.length > 0) {
        console.log('   (vacío) - Creando sector raíz...');
        await sequelize.query(`
          INSERT INTO sectors (company_id, department_id, name, code, description, created_at, updated_at)
          VALUES (${COMPANY_ID}, ${dept[0].id}, 'Sector Raíz E2E', 'SEC-ROOT', 'Sector raíz para tests', NOW(), NOW())
          ON CONFLICT DO NOTHING
        `);
        console.log('   ✅ Sector raíz creado');
      }
    }

    // 5. Verificar tabla fiscal_periods
    const hasFiscalPeriods = tables.some(t => t.tablename === 'fiscal_periods');
    console.log(`\n📅 Tabla fiscal_periods: ${hasFiscalPeriods ? 'existe' : 'NO EXISTE'}`);

    if (hasFiscalPeriods) {
      const [periods] = await sequelize.query(`
        SELECT id, name, status FROM fiscal_periods WHERE company_id = ${COMPANY_ID} LIMIT 3
      `);
      if (periods.length > 0) {
        console.log('   Períodos existentes:');
        periods.forEach(p => console.log(`   ${p.id} - ${p.name} (${p.status})`));
      } else {
        console.log('   (vacío) - Creando período fiscal 2026...');
        try {
          await sequelize.query(`
            INSERT INTO fiscal_periods (company_id, name, start_date, end_date, status, created_at, updated_at)
            VALUES (${COMPANY_ID}, 'Período Fiscal 2026', '2026-01-01', '2026-12-31', 'active', NOW(), NOW())
          `);
          console.log('   ✅ Período fiscal creado');
        } catch (e) {
          console.log(`   ⚠️ ${e.message.substring(0, 80)}`);
        }
      }
    }

    // 6. Verificar vacation balance (puede estar en users o tabla separada)
    const hasVacationBalance = tables.some(t => t.tablename.includes('vacation') && t.tablename.includes('balance'));
    console.log(`\n🏖️ Tabla vacation_balance: ${hasVacationBalance ? 'existe' : 'NO EXISTE (balance en users?)'}`);

    // Check if users table has vacation_days column
    const [userCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE '%vacation%'
    `);
    if (userCols.length > 0) {
      console.log('   Columnas de vacaciones en users:');
      userCols.forEach(c => console.log(`   - ${c.column_name}`));

      // Update vacation balance for admin user
      console.log(`\n   Actualizando balance de vacaciones para ${adminUser.firstName}...`);
      try {
        await sequelize.query(`
          UPDATE users SET vacation_days = COALESCE(vacation_days, 0) + 15
          WHERE user_id = '${adminUser.user_id}'
        `);
        console.log('   ✅ +15 días de vacaciones agregados');
      } catch (e) {
        console.log(`   ⚠️ ${e.message.substring(0, 80)}`);
      }
    }

    // 7. Verificar resultado final
    console.log('\n═══════════════════════════════════════');
    console.log('📊 RESUMEN DE DATOS AGREGADOS');
    console.log('═══════════════════════════════════════');

    const [finalSectors] = await sequelize.query(`
      SELECT COUNT(*) as count FROM sectors WHERE company_id = ${COMPANY_ID}
    `);
    console.log(`Sectores: ${finalSectors[0].count}`);

    const [finalDepts] = await sequelize.query(`
      SELECT COUNT(*) as count FROM departments WHERE company_id = ${COMPANY_ID}
    `);
    console.log(`Departamentos: ${finalDepts[0].count}`);

    if (hasFiscalPeriods) {
      const [finalPeriods] = await sequelize.query(`
        SELECT COUNT(*) as count FROM fiscal_periods WHERE company_id = ${COMPANY_ID}
      `);
      console.log(`Períodos fiscales: ${finalPeriods[0].count}`);
    }

    await sequelize.close();
    console.log('\n✅ Script completado');

  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();
