/**
 * Script para verificar tabla biometric_detections
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Aedr15150302'
});

async function checkBiometricDetections() {
  try {
    // 1. Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'biometric_detections'
      );
    `);

    console.log('📊 Tabla biometric_detections existe:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla NO existe. Creándola...');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS biometric_detections (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL,
          employee_id UUID NOT NULL,
          employee_name VARCHAR(255),
          similarity DECIMAL(5,4),
          was_registered BOOLEAN DEFAULT false,
          attendance_id UUID,
          operation_type VARCHAR(50),
          skip_reason VARCHAR(100),
          detection_timestamp TIMESTAMP DEFAULT NOW(),
          processing_time_ms INTEGER,
          kiosk_mode BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      console.log('✅ Tabla creada exitosamente');
      return;
    }

    // 2. Contar registros totales
    const totalCount = await pool.query('SELECT COUNT(*) FROM biometric_detections');
    console.log('📈 Total de detecciones registradas:', totalCount.rows[0].count);

    // 3. Contar por was_registered
    const registeredCount = await pool.query('SELECT COUNT(*) FROM biometric_detections WHERE was_registered = true');
    const skippedCount = await pool.query('SELECT COUNT(*) FROM biometric_detections WHERE was_registered = false');

    console.log('  ✅ Registradas en attendance:', registeredCount.rows[0].count);
    console.log('  ⏭️ Skipped (cooldown):', skippedCount.rows[0].count);

    // 4. Últimas 5 detecciones
    const recent = await pool.query(`
      SELECT
        detection_timestamp,
        employee_name,
        similarity,
        was_registered,
        operation_type,
        skip_reason
      FROM biometric_detections
      ORDER BY detection_timestamp DESC
      LIMIT 5
    `);

    console.log('\n🕐 Últimas 5 detecciones:');
    recent.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.detection_timestamp.toISOString().slice(11, 19)} - ${row.employee_name} - Sim:${row.similarity} - Registrado:${row.was_registered} - ${row.operation_type || 'N/A'} - ${row.skip_reason || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBiometricDetections();
