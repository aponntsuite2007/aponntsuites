-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN COMPLETA: RECONSTRUIR TABLA audit_logs AL 100%
-- Fecha: 2025-10-20
-- Descripción: Reconstruye la tabla audit_logs desde cero con
--              TODAS las columnas del modelo AuditLog.js
-- ═══════════════════════════════════════════════════════════

-- PASO 1: Crear tipos ENUM necesarios
DO $$
BEGIN
    -- Tipo para environment
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_environment') THEN
        CREATE TYPE audit_log_environment AS ENUM ('local', 'render', 'production');
    END IF;

    -- Tipo para triggered_by
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_triggered_by') THEN
        CREATE TYPE audit_log_triggered_by AS ENUM ('manual', 'scheduled', 'auto-healing', 'deploy-hook');
    END IF;

    -- Tipo para test_type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_test_type') THEN
        CREATE TYPE audit_log_test_type AS ENUM (
            'endpoint',
            'database',
            'relation',
            'integration',
            'e2e',
            'performance',
            'security',
            'stress',
            'console-error',
            'render-logs'
        );
    END IF;

    -- Tipo para status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_status') THEN
        CREATE TYPE audit_log_status AS ENUM ('pass', 'fail', 'warning', 'skipped', 'in-progress');
    END IF;

    -- Tipo para severity
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_severity') THEN
        CREATE TYPE audit_log_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
    END IF;

    -- Tipo para http_method
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_http_method') THEN
        CREATE TYPE audit_log_http_method AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH');
    END IF;

    -- Tipo para fix_result
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_fix_result') THEN
        CREATE TYPE audit_log_fix_result AS ENUM ('success', 'failed', 'partial', 'not-attempted');
    END IF;

    RAISE NOTICE '✅ Tipos ENUM creados correctamente';
END $$;

-- PASO 2: Hacer backup de datos existentes (si los hay)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Crear tabla temporal de backup
        DROP TABLE IF EXISTS audit_logs_backup_20251020;

        CREATE TABLE audit_logs_backup_20251020 AS
        SELECT * FROM audit_logs;

        RAISE NOTICE '✅ Backup de audit_logs creado: audit_logs_backup_20251020';

        -- Eliminar tabla antigua
        DROP TABLE audit_logs CASCADE;

        RAISE NOTICE '✅ Tabla audit_logs antigua eliminada';
    ELSE
        RAISE NOTICE 'ℹ️  No existe tabla audit_logs previa';
    END IF;
END $$;

-- PASO 3: Crear tabla audit_logs completa con TODAS las columnas
CREATE TABLE audit_logs (
    -- PRIMARY KEY
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ═══════════════════════════════════════════════════════════
    -- METADATA
    -- ═══════════════════════════════════════════════════════════
    execution_id UUID NOT NULL,
    company_id INTEGER,
    environment audit_log_environment NOT NULL DEFAULT 'local',
    triggered_by audit_log_triggered_by NOT NULL DEFAULT 'manual',

    -- ═══════════════════════════════════════════════════════════
    -- TEST INFORMATION
    -- ═══════════════════════════════════════════════════════════
    test_type audit_log_test_type NOT NULL,
    module_name VARCHAR(255),
    test_name VARCHAR(255) NOT NULL,
    test_description TEXT,

    -- ═══════════════════════════════════════════════════════════
    -- RESULTS
    -- ═══════════════════════════════════════════════════════════
    status audit_log_status NOT NULL DEFAULT 'in-progress',
    severity audit_log_severity,

    -- ═══════════════════════════════════════════════════════════
    -- ERROR DETAILS
    -- ═══════════════════════════════════════════════════════════
    error_type VARCHAR(255),
    error_message TEXT,
    error_stack TEXT,
    error_file VARCHAR(255),
    error_line INTEGER,
    error_context JSONB,

    -- ═══════════════════════════════════════════════════════════
    -- REQUEST/RESPONSE (para tests de endpoints)
    -- ═══════════════════════════════════════════════════════════
    endpoint VARCHAR(255),
    http_method audit_log_http_method,
    request_body JSONB,
    request_headers JSONB,
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,

    -- ═══════════════════════════════════════════════════════════
    -- PERFORMANCE METRICS
    -- ═══════════════════════════════════════════════════════════
    metrics JSONB,

    -- ═══════════════════════════════════════════════════════════
    -- AUTO-HEALING
    -- ═══════════════════════════════════════════════════════════
    fix_attempted BOOLEAN DEFAULT FALSE,
    fix_strategy VARCHAR(255),
    fix_applied TEXT,
    fix_result audit_log_fix_result,
    fix_rollback_available BOOLEAN DEFAULT FALSE,

    -- ═══════════════════════════════════════════════════════════
    -- SUGGESTIONS (para fixes manuales)
    -- ═══════════════════════════════════════════════════════════
    suggestions JSONB,

    -- ═══════════════════════════════════════════════════════════
    -- EXECUTION TIMING
    -- ═══════════════════════════════════════════════════════════
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- ═══════════════════════════════════════════════════════════
    -- METADATA ADICIONAL
    -- ═══════════════════════════════════════════════════════════
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    test_data JSONB,

    -- ═══════════════════════════════════════════════════════════
    -- TIMESTAMPS AUTOMÁTICOS (requeridos por Sequelize)
    -- ═══════════════════════════════════════════════════════════
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- PASO 4: Crear índices para optimizar queries
CREATE INDEX idx_audit_logs_execution_id ON audit_logs(execution_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_environment ON audit_logs(environment);
CREATE INDEX idx_audit_logs_test_type ON audit_logs(test_type);
CREATE INDEX idx_audit_logs_module_name ON audit_logs(module_name);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_started_at ON audit_logs(started_at);
CREATE INDEX idx_audit_logs_tags ON audit_logs USING GIN(tags);

-- PASO 5: Comentarios en las columnas
COMMENT ON COLUMN audit_logs.execution_id IS 'Agrupa todos los tests de una misma ejecución';
COMMENT ON COLUMN audit_logs.company_id IS 'Empresa auditada (null = auditoría global del sistema)';
COMMENT ON COLUMN audit_logs.module_name IS 'users, attendance, kiosks, etc.';
COMMENT ON COLUMN audit_logs.test_name IS 'Nombre descriptivo del test';
COMMENT ON COLUMN audit_logs.severity IS 'Solo para fails y warnings';
COMMENT ON COLUMN audit_logs.error_type IS 'TypeError, ReferenceError, 401, 500, etc.';
COMMENT ON COLUMN audit_logs.error_file IS 'Archivo donde ocurrió el error';
COMMENT ON COLUMN audit_logs.error_context IS 'Código circundante, variables, estado';
COMMENT ON COLUMN audit_logs.endpoint IS '/api/users, /api/attendance, etc.';
COMMENT ON COLUMN audit_logs.response_time_ms IS 'Tiempo de respuesta en milisegundos';
COMMENT ON COLUMN audit_logs.metrics IS 'CPU, memoria, queries SQL, etc.';
COMMENT ON COLUMN audit_logs.fix_strategy IS 'auto-import, add-validation, fix-typo, etc.';
COMMENT ON COLUMN audit_logs.fix_applied IS 'Código del fix aplicado';
COMMENT ON COLUMN audit_logs.suggestions IS 'Array de sugerencias de fix con código y descripción';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Duración del test en milisegundos';
COMMENT ON COLUMN audit_logs.tags IS 'Para búsquedas y filtros: critical, auth, biometric, etc.';

-- PASO 6: Crear trigger para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_logs_updated_at();

-- MENSAJE FINAL
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ TABLA audit_logs RECONSTRUIDA AL 100%%';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Total de columnas: 39';
    RAISE NOTICE '📋 Total de índices: 9';
    RAISE NOTICE '🔧 Tipos ENUM creados: 7';
    RAISE NOTICE '⚡ Trigger updatedAt: ACTIVO';
    RAISE NOTICE '';
    RAISE NOTICE '💾 Backup de datos antiguos en: audit_logs_backup_20251020';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
