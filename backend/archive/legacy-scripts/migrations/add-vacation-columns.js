/**
 * Script para agregar columnas faltantes a las tablas de vacaciones
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

async function addMissingColumns() {
  console.log('🔧 Conectando a PostgreSQL...');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida exitosamente\n');

    // Agregar columnas a vacation_requests
    console.log('📋 Agregando columnas a vacation_requests...');

    const columnsToAdd = [
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS coverage_assignments JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS supporting_documents JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS auto_generation_data JSONB`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS compatibility_score DECIMAL(5,2)`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS conflicts JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE vacation_requests ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb`
    ];

    for (const sql of columnsToAdd) {
      await sequelize.query(sql);
      console.log(`✅ ${sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0]}`);
    }

    console.log('\n📋 Agregando columnas a task_compatibility...');

    const taskCompatColumns = [
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS last_performance_score DECIMAL(5,2)`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS total_coverage_hours INTEGER DEFAULT 0`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS successful_coverages INTEGER DEFAULT 0`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT true`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS last_calculation_date TIMESTAMP`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS calculation_data JSONB`,
      `ALTER TABLE task_compatibility ADD COLUMN IF NOT EXISTS manual_notes TEXT`
    ];

    for (const sql of taskCompatColumns) {
      await sequelize.query(sql);
      console.log(`✅ ${sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0]}`);
    }

    // Cambiar tipos de columna de INTEGER a UUID
    console.log('\n📋 Actualizando tipos de columna a UUID...');

    try {
      // Verificar si ya son UUID
      const [result] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'vacation_requests' AND column_name = 'user_id'
      `);

      if (result[0]?.data_type !== 'uuid') {
        await sequelize.query(`ALTER TABLE vacation_requests ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid`);
        console.log('✅ user_id convertido a UUID');
      } else {
        console.log('✅ user_id ya es UUID');
      }

      await sequelize.query(`ALTER TABLE vacation_requests ALTER COLUMN approved_by TYPE UUID USING CASE WHEN approved_by IS NULL THEN NULL ELSE approved_by::text::uuid END`);
      console.log('✅ approved_by convertido a UUID');
    } catch (e) {
      console.log('⚠️ Error convirtiendo a UUID (puede que ya estén convertidas):', e.message);
    }

    try {
      const [result2] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'task_compatibility' AND column_name = 'primary_user_id'
      `);

      if (result2[0]?.data_type !== 'uuid') {
        await sequelize.query(`ALTER TABLE task_compatibility ALTER COLUMN primary_user_id TYPE UUID USING primary_user_id::text::uuid`);
        await sequelize.query(`ALTER TABLE task_compatibility ALTER COLUMN cover_user_id TYPE UUID USING cover_user_id::text::uuid`);
        console.log('✅ primary_user_id y cover_user_id convertidos a UUID');
      } else {
        console.log('✅ primary_user_id y cover_user_id ya son UUID');
      }
    } catch (e) {
      console.log('⚠️ Error convirtiendo task_compatibility a UUID:', e.message);
    }

    console.log('\n🎉 ¡COLUMNAS AGREGADAS EXITOSAMENTE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar
addMissingColumns();
