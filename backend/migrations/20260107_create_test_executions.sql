/**
 * Migración: test_executions
 *
 * Tabla principal que registra cada ejecución de E2E Advanced Testing.
 * Una ejecución puede incluir múltiples fases y módulos.
 *
 * @version 2.0.0
 * @date 2026-01-07
 */

-- Tabla: test_executions
CREATE TABLE IF NOT EXISTS test_executions (
  id SERIAL PRIMARY KEY,

  -- Identificador único de la ejecución (UUID v4)
  execution_id VARCHAR(36) NOT NULL UNIQUE,

  -- Estado de la ejecución
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  -- Valores: running, passed, failed, warning, cancelled

  -- Modo de ejecución
  mode VARCHAR(20) NOT NULL,
  -- Valores: full, phases, modules, custom

  -- Fases ejecutadas (array JSON)
  phases_executed JSONB DEFAULT '[]',
  -- Ejemplo: ["e2e", "load", "security"]

  -- Módulos testeados (array JSON)
  modules_tested JSONB DEFAULT '[]',
  -- Ejemplo: ["users", "attendance", "departments"]
  -- [] significa TODOS los módulos

  -- Métricas agregadas
  total_tests INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  tests_skipped INTEGER NOT NULL DEFAULT 0,

  -- Confidence score (0-100)
  overall_score DECIMAL(5, 2) DEFAULT 0.00,

  -- Production ready flag
  production_ready BOOLEAN DEFAULT FALSE,

  -- Duración en milisegundos
  duration INTEGER DEFAULT 0,

  -- Usuario que ejecutó (FK a users)
  user_id INTEGER,

  -- Empresa que ejecutó (FK a companies) - Puede ser NULL si es global
  company_id INTEGER,

  -- Metadata adicional (configuración, opciones, etc.)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Foreign keys
  CONSTRAINT fk_test_executions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_test_executions_company
    FOREIGN KEY (company_id)
    REFERENCES companies(id)
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_test_executions_execution_id ON test_executions(execution_id);
CREATE INDEX idx_test_executions_status ON test_executions(status);
CREATE INDEX idx_test_executions_company_id ON test_executions(company_id);
CREATE INDEX idx_test_executions_created_at ON test_executions(created_at DESC);
CREATE INDEX idx_test_executions_overall_score ON test_executions(overall_score DESC);
CREATE INDEX idx_test_executions_production_ready ON test_executions(production_ready);

-- Índice compuesto para queries comunes
CREATE INDEX idx_test_executions_company_status_date
  ON test_executions(company_id, status, created_at DESC);

-- Comentarios de tabla
COMMENT ON TABLE test_executions IS 'Registro de ejecuciones de E2E Advanced Testing System';
COMMENT ON COLUMN test_executions.execution_id IS 'UUID único de la ejecución';
COMMENT ON COLUMN test_executions.status IS 'Estado: running, passed, failed, warning, cancelled';
COMMENT ON COLUMN test_executions.mode IS 'Modo de ejecución: full, phases, modules, custom';
COMMENT ON COLUMN test_executions.phases_executed IS 'Array JSON de fases ejecutadas';
COMMENT ON COLUMN test_executions.modules_tested IS 'Array JSON de módulos testeados ([] = TODOS)';
COMMENT ON COLUMN test_executions.overall_score IS 'Confidence score global (0-100)';
COMMENT ON COLUMN test_executions.production_ready IS 'True si overall_score >= 95%';
COMMENT ON COLUMN test_executions.duration IS 'Duración en milisegundos';

-- Función helper: Obtener resumen de ejecución
CREATE OR REPLACE FUNCTION get_execution_summary(exec_id VARCHAR)
RETURNS TABLE(
  execution_id VARCHAR,
  status VARCHAR,
  mode VARCHAR,
  total_phases INTEGER,
  total_tests INTEGER,
  pass_rate DECIMAL,
  overall_score DECIMAL,
  production_ready BOOLEAN,
  duration_formatted TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.execution_id,
    te.status,
    te.mode,
    jsonb_array_length(te.phases_executed) AS total_phases,
    te.total_tests,
    CASE
      WHEN te.total_tests > 0 THEN
        ROUND((te.tests_passed::DECIMAL / te.total_tests::DECIMAL) * 100, 2)
      ELSE 0
    END AS pass_rate,
    te.overall_score,
    te.production_ready,
    CASE
      WHEN te.duration < 1000 THEN te.duration || 'ms'
      WHEN te.duration < 60000 THEN ROUND(te.duration::DECIMAL / 1000, 2) || 's'
      WHEN te.duration < 3600000 THEN ROUND(te.duration::DECIMAL / 60000, 2) || 'min'
      ELSE ROUND(te.duration::DECIMAL / 3600000, 2) || 'h'
    END AS duration_formatted,
    te.created_at
  FROM test_executions te
  WHERE te.execution_id = exec_id;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Obtener últimas N ejecuciones
CREATE OR REPLACE FUNCTION get_recent_executions(
  num_executions INTEGER DEFAULT 10,
  filter_company_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
  execution_id VARCHAR,
  status VARCHAR,
  mode VARCHAR,
  phases_count INTEGER,
  tests_passed INTEGER,
  tests_failed INTEGER,
  overall_score DECIMAL,
  production_ready BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.execution_id,
    te.status,
    te.mode,
    jsonb_array_length(te.phases_executed) AS phases_count,
    te.tests_passed,
    te.tests_failed,
    te.overall_score,
    te.production_ready,
    te.created_at
  FROM test_executions te
  WHERE
    (filter_company_id IS NULL OR te.company_id = filter_company_id)
  ORDER BY te.created_at DESC
  LIMIT num_executions;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Estadísticas globales
CREATE OR REPLACE FUNCTION get_execution_stats(
  filter_company_id INTEGER DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_executions BIGINT,
  passed_executions BIGINT,
  failed_executions BIGINT,
  average_score DECIMAL,
  production_ready_count BIGINT,
  average_duration DECIMAL,
  total_tests_run BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_executions,
    COUNT(*) FILTER (WHERE status = 'passed') AS passed_executions,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_executions,
    ROUND(AVG(overall_score), 2) AS average_score,
    COUNT(*) FILTER (WHERE production_ready = TRUE) AS production_ready_count,
    ROUND(AVG(duration)::DECIMAL / 1000, 2) AS average_duration,
    SUM(total_tests) AS total_tests_run
  FROM test_executions
  WHERE
    (filter_company_id IS NULL OR company_id = filter_company_id)
    AND created_at >= CURRENT_TIMESTAMP - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Actualizar completed_at cuando status cambia a terminal
CREATE OR REPLACE FUNCTION update_execution_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('passed', 'failed', 'cancelled') AND OLD.status = 'running' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_execution_completed_at
  BEFORE UPDATE ON test_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_execution_completed_at();

-- Grant permissions (ajustar según tu configuración)
-- GRANT SELECT, INSERT, UPDATE ON test_executions TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE test_executions_id_seq TO your_app_user;
