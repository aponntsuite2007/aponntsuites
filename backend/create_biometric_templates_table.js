/**
 * Script para crear tabla biometric_templates
 */

const { Sequelize } = require('sequelize');

async function createBiometricTemplatesTable() {
  const sequelize = new Sequelize('asistencia_db', 'postgres', 'postgres', {
    host: 'localhost',
    dialect: 'postgres',
    logging: console.log
  });

  try {
    await sequelize.authenticate();
    console.log('📡 Conectado a PostgreSQL');

    // Crear tabla biometric_templates
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS biometric_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        employee_id UUID NOT NULL,
        embedding_encrypted TEXT NOT NULL,
        embedding_hash VARCHAR(64) NOT NULL,
        algorithm VARCHAR(50) NOT NULL DEFAULT 'face-api-js-v0.22.2',
        model_version VARCHAR(50) NOT NULL DEFAULT 'faceRecognitionNet',
        template_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
        quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
        confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
        face_size_ratio DECIMAL(3,2) CHECK (face_size_ratio >= 0.0 AND face_size_ratio <= 1.0),
        position_score DECIMAL(3,2) CHECK (position_score >= 0.0 AND position_score <= 1.0),
        lighting_score DECIMAL(3,2) CHECK (lighting_score >= 0.0 AND lighting_score <= 1.0),
        is_primary BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_validated BOOLEAN DEFAULT FALSE,
        match_count INTEGER DEFAULT 0,
        last_matched TIMESTAMPTZ,
        capture_session_id VARCHAR(100),
        capture_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-CBC',
        encryption_key_version VARCHAR(20) NOT NULL DEFAULT '1.0',
        created_by UUID,
        gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
        retention_expires TIMESTAMPTZ,
        embedding_magnitude DECIMAL(10,6),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Crear índices
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_biometric_templates_company ON biometric_templates(company_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_biometric_templates_employee ON biometric_templates(employee_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_biometric_templates_hash ON biometric_templates(embedding_hash);`);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_templates_primary_unique ON biometric_templates(company_id, employee_id, is_primary) WHERE is_primary = TRUE;`);

    console.log('✅ Tabla biometric_templates creada exitosamente con índices');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

createBiometricTemplatesTable();