/**
 * Script para agregar company_id a las tablas de vacaciones
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function addCompanyIdToVacationTables() {
  console.log('🔧 Conectando a PostgreSQL...');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida exitosamente\n');

    // Agregar company_id a vacation_scales
    console.log('📋 Agregando company_id a vacation_scales...');
    try {
      await sequelize.query(`
        ALTER TABLE vacation_scales
        ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1
      `);
      console.log('✅ company_id agregado a vacation_scales');
    } catch (e) {
      console.log('⚠️ vacation_scales: ' + e.message);
    }

    // Agregar company_id a extraordinary_licenses
    console.log('\n📋 Agregando company_id a extraordinary_licenses...');
    try {
      await sequelize.query(`
        ALTER TABLE extraordinary_licenses
        ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1
      `);
      console.log('✅ company_id agregado a extraordinary_licenses');
    } catch (e) {
      console.log('⚠️ extraordinary_licenses: ' + e.message);
    }

    // Verificar columnas
    console.log('\n📋 Verificando columnas de vacation_scales...');
    const [scales] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vacation_scales'
      ORDER BY ordinal_position
    `);
    scales.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📋 Verificando columnas de extraordinary_licenses...');
    const [licenses] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'extraordinary_licenses'
      ORDER BY ordinal_position
    `);
    licenses.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar
addCompanyIdToVacationTables();
