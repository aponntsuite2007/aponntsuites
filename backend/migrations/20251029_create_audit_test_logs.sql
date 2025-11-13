/**
 * ============================================================================
 * MIGRATION: Crear tabla audit_test_logs
 * ============================================================================
 *
 * Crea una tabla específica para almacenar resultados de tests del sistema
 * de auditoría automatizada (IntelligentTestingOrchestrator).
 *
 * Esta tabla es diferente de 'audit_logs' (que registra acciones de usuarios).
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

-- 1. Crear tabla audit_test_logs
CREATE TABLE IF NOT EXISTS audit_test_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL,
    company_id INTEGER NOT NULL,

    -- Información del test
    module_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    test_type VARCHAR(50) DEFAULT 'e2e', -- e2e, unit, integration, performance
    test_category VARCHAR(100),

    -- Resultados
    status VARCHAR(50) NOT NULL, -- pending, running, passed, failed, warning, fixed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Errores y diagnóstico
    error_type VARCHAR(100),
    error_message TEXT,
    error_stack TEXT,
    screenshot_path VARCHAR(500),

    -- Reparación automática
    fix_attempted BOOLEAN DEFAULT FALSE,
    fix_strategy VARCHAR(100),
    fix_code TEXT,
    fix_applied BOOLEAN DEFAULT FALSE,
    fix_successful BOOLEAN,

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign keys
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_test_logs_execution_id
ON audit_test_logs(execution_id);

CREATE INDEX IF NOT EXISTS idx_audit_test_logs_company_id
ON audit_test_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_audit_test_logs_module_name
ON audit_test_logs(module_name);

CREATE INDEX IF NOT EXISTS idx_audit_test_logs_status
ON audit_test_logs(status);

CREATE INDEX IF NOT EXISTS idx_audit_test_logs_execution_status
ON audit_test_logs(execution_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_test_logs_created_at
ON audit_test_logs(created_at DESC);

-- 3. Función para obtener resumen de ejecución
CREATE OR REPLACE FUNCTION get_execution_summary(exec_id UUID)
RETURNS TABLE(
    total_tests BIGINT,
    tests_passed BIGINT,
    tests_failed BIGINT,
    tests_warning BIGINT,
    avg_duration_ms NUMERIC,
    execution_duration_seconds NUMERIC,
    modules_tested TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_tests,
        COUNT(*) FILTER (WHERE status IN ('passed', 'pass'))::BIGINT as tests_passed,
        COUNT(*) FILTER (WHERE status IN ('failed', 'fail'))::BIGINT as tests_failed,
        COUNT(*) FILTER (WHERE status = 'warning')::BIGINT as tests_warning,
        ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
        ROUND(EXTRACT(EPOCH FROM (MAX(completed_at) - MIN(started_at)))::NUMERIC, 2) as execution_duration_seconds,
        ARRAY_AGG(DISTINCT module_name ORDER BY module_name) as modules_tested
    FROM audit_test_logs
    WHERE execution_id = exec_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para obtener health score de módulo
CREATE OR REPLACE FUNCTION get_module_health(mod_name VARCHAR, days_back INTEGER DEFAULT 7)
RETURNS TABLE(
    module_name VARCHAR,
    health_score NUMERIC,
    total_tests BIGINT,
    success_rate NUMERIC,
    avg_duration_ms NUMERIC,
    last_test_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mod_name as module_name,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('passed', 'pass'))::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
        END as health_score,
        COUNT(*)::BIGINT as total_tests,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('passed', 'pass'))::NUMERIC / COUNT(*)::NUMERIC * 100), 2)
        END as success_rate,
        ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
        MAX(started_at) as last_test_at
    FROM audit_test_logs
    WHERE module_name = mod_name
      AND created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- 5. Comentarios para documentación
COMMENT ON TABLE audit_test_logs IS 'Logs de tests automatizados del sistema de auditoría';
COMMENT ON COLUMN audit_test_logs.execution_id IS 'UUID que agrupa todos los tests de una misma ejecución';
COMMENT ON COLUMN audit_test_logs.status IS 'Estado del test: pending, running, passed, failed, warning, fixed';
COMMENT ON COLUMN audit_test_logs.fix_attempted IS 'Si se intentó una reparación automática';
COMMENT ON COLUMN audit_test_logs.fix_strategy IS 'Estrategia usada: auto_fix, suggest_only, manual';

COMMIT;
