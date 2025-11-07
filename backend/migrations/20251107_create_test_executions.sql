-- ============================================================================
-- MIGRATION: Test Executions Persistence
-- Crear tabla para persistir ejecuciones de tests E2E
-- ============================================================================

-- Crear tabla test_executions
CREATE TABLE IF NOT EXISTS test_executions (
    id SERIAL PRIMARY KEY,
    execution_id UUID NOT NULL UNIQUE,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
    module VARCHAR(100) NOT NULL,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    company_name VARCHAR(255),

    -- Configuración
    cycles INTEGER NOT NULL DEFAULT 1,
    slow_mo INTEGER NOT NULL DEFAULT 50,
    base_url VARCHAR(500),

    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'starting', 'running', 'completed', 'failed', 'killed', 'error')),

    -- Resultados
    total_tests INTEGER DEFAULT 0,
    ui_tests_passed INTEGER DEFAULT 0,
    ui_tests_failed INTEGER DEFAULT 0,
    db_tests_passed INTEGER DEFAULT 0,
    db_tests_failed INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),

    -- Tiempos
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds DECIMAL(10,2),

    -- Detalles
    errors JSONB DEFAULT '[]'::jsonb,
    tickets JSONB DEFAULT '[]'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_test_executions_execution_id ON test_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_company_id ON test_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_environment ON test_executions(environment);
CREATE INDEX IF NOT EXISTS idx_test_executions_module ON test_executions(module);
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_test_executions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Calcular duración si end_time se está seteando
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time));
    END IF;

    -- Calcular success rate automáticamente
    IF NEW.total_tests > 0 THEN
        NEW.success_rate = ROUND(
            ((NEW.ui_tests_passed + NEW.db_tests_passed)::DECIMAL / NEW.total_tests::DECIMAL) * 100,
            2
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_test_executions_timestamp ON test_executions;
CREATE TRIGGER trigger_update_test_executions_timestamp
    BEFORE UPDATE ON test_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_test_executions_timestamp();

-- Función para cleanup automático (ejecuciones > 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_test_executions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM test_executions
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'killed', 'error');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener métricas de testing
CREATE OR REPLACE FUNCTION get_testing_metrics(
    p_company_id INTEGER DEFAULT NULL,
    p_environment VARCHAR DEFAULT NULL,
    p_module VARCHAR DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    avg_success_rate DECIMAL,
    avg_duration DECIMAL,
    total_tests BIGINT,
    total_errors BIGINT,
    total_tickets BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed' AND success_rate >= 80)::BIGINT as successful_executions,
        COUNT(*) FILTER (WHERE status IN ('failed', 'error') OR success_rate < 80)::BIGINT as failed_executions,
        ROUND(AVG(success_rate), 2) as avg_success_rate,
        ROUND(AVG(duration_seconds), 2) as avg_duration,
        SUM(total_tests)::BIGINT as total_tests,
        SUM(jsonb_array_length(COALESCE(errors, '[]'::jsonb)))::BIGINT as total_errors,
        SUM(jsonb_array_length(COALESCE(tickets, '[]'::jsonb)))::BIGINT as total_tickets
    FROM test_executions
    WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND (p_environment IS NULL OR environment = p_environment)
    AND (p_module IS NULL OR module = p_module);
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE test_executions IS 'Registro de ejecuciones de tests E2E automatizados';
COMMENT ON COLUMN test_executions.execution_id IS 'UUID único de la ejecución';
COMMENT ON COLUMN test_executions.success_rate IS 'Porcentaje de tests exitosos (calculado automáticamente)';
COMMENT ON COLUMN test_executions.logs IS 'Array de logs en formato JSON';

-- Datos de ejemplo (opcional, comentar en producción)
-- INSERT INTO test_executions (execution_id, environment, module, company_id, status, total_tests, ui_tests_passed, db_tests_passed)
-- VALUES (gen_random_uuid(), 'local', 'users', 11, 'completed', 10, 8, 2);
