/**
 * ============================================================================
 * MIGRATION: Agregar columnas faltantes a audit_test_logs
 * ============================================================================
 *
 * Agrega las columnas que el modelo Sequelize espera pero que no están
 * en la tabla:
 * - environment
 * - triggered_by
 * - tags
 * - severity
 * - test_description
 * - Y otras columnas del modelo AuditLog.js
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

-- Agregar columnas de metadata
ALTER TABLE audit_test_logs
ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
ADD COLUMN IF NOT EXISTS test_description TEXT;

-- Agregar columnas de error detallado
ALTER TABLE audit_test_logs
ADD COLUMN IF NOT EXISTS error_file VARCHAR(500),
ADD COLUMN IF NOT EXISTS error_line INTEGER,
ADD COLUMN IF NOT EXISTS error_context JSONB;

-- Agregar columnas de endpoints (para tests de API)
ALTER TABLE audit_test_logs
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(500),
ADD COLUMN IF NOT EXISTS http_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS request_body JSONB,
ADD COLUMN IF NOT EXISTS request_headers JSONB,
ADD COLUMN IF NOT EXISTS response_status INTEGER,
ADD COLUMN IF NOT EXISTS response_body JSONB,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

-- Agregar columnas de métricas y fix
ALTER TABLE audit_test_logs
ADD COLUMN IF NOT EXISTS metrics JSONB,
ADD COLUMN IF NOT EXISTS fix_applied TEXT,
ADD COLUMN IF NOT EXISTS fix_result VARCHAR(50),
ADD COLUMN IF NOT EXISTS suggestions JSONB;

-- Agregar columnas de notas y test_data
ALTER TABLE audit_test_logs
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS test_data JSONB,
ADD COLUMN IF NOT EXISTS tags VARCHAR(100)[];

COMMIT;

COMMENT ON COLUMN audit_test_logs.environment IS 'local, render, production';
COMMENT ON COLUMN audit_test_logs.triggered_by IS 'manual, scheduled, auto-healing, deploy-hook';
COMMENT ON COLUMN audit_test_logs.severity IS 'critical, high, medium, low, info';
COMMENT ON COLUMN audit_test_logs.tags IS 'Tags para filtros: critical, auth, biometric, etc.';
