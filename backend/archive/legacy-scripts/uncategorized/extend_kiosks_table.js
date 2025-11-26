const { sequelize } = require('./src/config/database-postgresql');

/**
 * Script para extender la tabla kiosks con campos para:
 * - Departamentos autorizados
 * - Configuración de lector biométrico externo
 * - Logs de intentos no autorizados
 */

async function extendKiosksTable() {
  try {
    console.log('🔧 Extendiendo tabla kiosks...');

    // 1. Agregar campos a kiosks
    await sequelize.query(`
      -- Departamentos autorizados (array de IDs)
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]';

      -- Configuración de lector biométrico externo
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS has_external_reader BOOLEAN DEFAULT false;

      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS reader_model VARCHAR(100);

      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS reader_config JSONB DEFAULT '{}';

      -- IP Address del kiosko
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

      -- Puerto del kiosko
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 9998;

      -- Última conexión
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP;

      -- Versión de la APK
      ALTER TABLE kiosks
      ADD COLUMN IF NOT EXISTS apk_version VARCHAR(20);
    `);

    console.log('✅ Tabla kiosks extendida correctamente');

    // 2. Crear tabla de intentos no autorizados
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS unauthorized_access_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kiosk_id INTEGER REFERENCES kiosks(id),
        employee_id UUID REFERENCES users(user_id),
        company_id INTEGER NOT NULL,
        employee_name VARCHAR(255),
        employee_department VARCHAR(100),
        kiosk_authorized_departments JSONB,
        attempt_type VARCHAR(50), -- 'facial', 'fingerprint', 'password'
        biometric_similarity NUMERIC,
        security_photo BYTEA,
        timestamp TIMESTAMP DEFAULT NOW(),
        device_id VARCHAR(255),
        ip_address VARCHAR(50),
        reason VARCHAR(255), -- 'department_not_authorized', 'suspicious_photo', etc
        requires_hr_review BOOLEAN DEFAULT true,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_unauthorized_company ON unauthorized_access_attempts(company_id);
      CREATE INDEX IF NOT EXISTS idx_unauthorized_employee ON unauthorized_access_attempts(employee_id);
      CREATE INDEX IF NOT EXISTS idx_unauthorized_kiosk ON unauthorized_access_attempts(kiosk_id);
      CREATE INDEX IF NOT EXISTS idx_unauthorized_timestamp ON unauthorized_access_attempts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_unauthorized_requires_review ON unauthorized_access_attempts(requires_hr_review);
    `);

    console.log('✅ Tabla unauthorized_access_attempts creada correctamente');

    // 3. Crear tabla de autenticación por contraseña
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_auth_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES users(user_id),
        company_id INTEGER NOT NULL,
        kiosk_id INTEGER REFERENCES kiosks(id),
        password_valid BOOLEAN,
        facial_similarity NUMERIC, -- Del foto de seguridad
        security_photo BYTEA,
        success BOOLEAN,
        requires_hr_review BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT NOW(),
        device_id VARCHAR(255),
        ip_address VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_password_auth_company ON password_auth_attempts(company_id);
      CREATE INDEX IF NOT EXISTS idx_password_auth_employee ON password_auth_attempts(employee_id);
      CREATE INDEX IF NOT EXISTS idx_password_auth_timestamp ON password_auth_attempts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_password_auth_requires_review ON password_auth_attempts(requires_hr_review);
    `);

    console.log('✅ Tabla password_auth_attempts creada correctamente');

    // 4. Crear vista para RRHH
    await sequelize.query(`
      CREATE OR REPLACE VIEW v_hr_security_alerts AS
      SELECT
        'unauthorized_access' as alert_type,
        ua.id,
        ua.company_id,
        ua.employee_id,
        ua.employee_name,
        ua.employee_department,
        k.name as kiosk_name,
        ua.attempt_type,
        ua.reason,
        ua.timestamp,
        ua.requires_hr_review,
        ua.reviewed_by,
        ua.reviewed_at
      FROM unauthorized_access_attempts ua
      LEFT JOIN kiosks k ON ua.kiosk_id = k.id
      WHERE ua.requires_hr_review = true

      UNION ALL

      SELECT
        'password_suspicious' as alert_type,
        pa.id,
        pa.company_id,
        pa.employee_id,
        CONCAT(u."firstName", ' ', u."lastName") as employee_name,
        d.name as employee_department,
        k.name as kiosk_name,
        'password' as attempt_type,
        'suspicious_photo' as reason,
        pa.timestamp,
        pa.requires_hr_review,
        NULL as reviewed_by,
        NULL as reviewed_at
      FROM password_auth_attempts pa
      LEFT JOIN users u ON pa.employee_id = u.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN kiosks k ON pa.kiosk_id = k.id
      WHERE pa.requires_hr_review = true

      ORDER BY timestamp DESC;
    `);

    console.log('✅ Vista v_hr_security_alerts creada correctamente');

    // 5. Actualizar kiosks existentes con valores por defecto
    await sequelize.query(`
      UPDATE kiosks
      SET
        authorized_departments = '[]'::jsonb,
        has_external_reader = false,
        reader_config = '{}'::jsonb
      WHERE authorized_departments IS NULL;
    `);

    console.log('✅ Kiosks existentes actualizados');

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('Campos agregados a kiosks:');
    console.log('  - authorized_departments (JSONB)');
    console.log('  - has_external_reader (BOOLEAN)');
    console.log('  - reader_model (VARCHAR)');
    console.log('  - reader_config (JSONB)');
    console.log('  - ip_address, port, last_seen, apk_version');
    console.log('\nTablas creadas:');
    console.log('  - unauthorized_access_attempts');
    console.log('  - password_auth_attempts');
    console.log('\nVista creada:');
    console.log('  - v_hr_security_alerts');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

extendKiosksTable();
