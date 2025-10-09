/**
 * 📊 CREAR TABLA DE LOG DE DETECCIONES BIOMÉTRICAS
 * ===============================================
 * Registra TODAS las detecciones faciales, aunque no generen registro de asistencia
 * Permite auditoría y análisis de efectividad del sistema
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database-postgresql');

async function createDetectionsTable() {
  try {
    console.log('📊 Creando tabla biometric_detections...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS biometric_detections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER NOT NULL,
        employee_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,

        -- Resultado de la detección
        similarity DECIMAL(5,3) NOT NULL,
        quality_score DECIMAL(5,3),

        -- ¿Se registró en attendances?
        was_registered BOOLEAN NOT NULL DEFAULT false,
        attendance_id UUID REFERENCES attendances(id),

        -- Tipo de operación (si se registró)
        operation_type VARCHAR(20), -- 'clock_in', 'clock_out', null si no se registró

        -- Razón por la que no se registró (si aplica)
        skip_reason VARCHAR(100), -- 'recent_registration', 'cooldown', null

        -- Metadatos
        detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        processing_time_ms INTEGER,
        kiosk_mode BOOLEAN DEFAULT false,

        created_at TIMESTAMP DEFAULT NOW(),

        -- Índices para búsqueda rápida
        CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(company_id),
        CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES users(user_id)
      );

      -- Índices
      CREATE INDEX IF NOT EXISTS idx_detections_company ON biometric_detections(company_id);
      CREATE INDEX IF NOT EXISTS idx_detections_employee ON biometric_detections(employee_id);
      CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON biometric_detections(detection_timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_detections_registered ON biometric_detections(was_registered);
      CREATE INDEX IF NOT EXISTS idx_detections_company_time ON biometric_detections(company_id, detection_timestamp);
    `);

    console.log('✅ Tabla biometric_detections creada exitosamente');
    console.log('');
    console.log('📋 Estructura:');
    console.log('  - Registra TODAS las detecciones faciales');
    console.log('  - was_registered = true: generó registro en attendances');
    console.log('  - was_registered = false: solo detección, no registro (por cooldown)');
    console.log('  - skip_reason: motivo por el cual no se registró');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createDetectionsTable();
