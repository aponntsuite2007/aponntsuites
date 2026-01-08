/**
 * Migración: test_results_detailed
 *
 * Tabla que almacena resultados detallados de cada fase/módulo ejecutado.
 * Una ejecución puede tener múltiples registros (uno por cada fase-módulo combinación).
 *
 * @version 2.0.0
 * @date 2026-01-07
 */

-- Tabla: test_results_detailed
CREATE TABLE IF NOT EXISTS test_results_detailed (
  id SERIAL PRIMARY KEY,

  -- FK a test_executions (execution_id UUID)
  execution_id VARCHAR(36) NOT NULL,

  -- Fase ejecutada
  phase_name VARCHAR(50) NOT NULL,
  -- Valores: e2e, load, security, multiTenant, database, monitoring, edgeCases

  -- Módulo testeado (NULL si la fase no se ejecuta por módulo)
  module_name VARCHAR(100),
  -- Ejemplo: users, attendance, departments
  -- NULL significa que la fase se ejecutó globalmente (ej: security scan)

  -- Estado del test
  status VARCHAR(20) NOT NULL,
  -- Valores: passed, failed, warning, skipped

  -- Métricas del test
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_failed INTEGER NOT NULL DEFAULT 0,
  tests_skipped INTEGER NOT NULL DEFAULT 0,

  -- Duración en milisegundos
  duration INTEGER DEFAULT 0,

  -- Mensaje de error (si falló)
  error_message TEXT,

  -- Stack trace completo (si falló)
  error_stack TEXT,

  -- Metadata adicional (métricas específicas de la fase)
  metrics JSONB DEFAULT '{}',
  -- Ejemplo para LoadPhase:
  -- {
  --   "p95": 890,
  --   "p99": 1200,
  --   "throughput": 120,
  --   "errorRate": 0.5
  -- }

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key a test_executions
  CONSTRAINT fk_test_results_execution
    FOREIGN KEY (execution_id)
    REFERENCES test_executions(execution_id)
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_test_results_execution_id ON test_results_detailed(execution_id);
CREATE INDEX idx_test_results_phase_name ON test_results_detailed(phase_name);
CREATE INDEX idx_test_results_module_name ON test_results_detailed(module_name);
CREATE INDEX idx_test_results_status ON test_results_detailed(status);
CREATE INDEX idx_test_results_created_at ON test_results_detailed(created_at DESC);

-- Índice compuesto para queries comunes
CREATE INDEX idx_test_results_execution_phase_module
  ON test_results_detailed(execution_id, phase_name, module_name);

-- Índice para queries de health por módulo
CREATE INDEX idx_test_results_module_status
  ON test_results_detailed(module_name, status, created_at DESC);

-- Comentarios de tabla
COMMENT ON TABLE test_results_detailed IS 'Resultados detallados de cada fase/módulo ejecutado';
COMMENT ON COLUMN test_results_detailed.execution_id IS 'UUID de la ejecución padre';
COMMENT ON COLUMN test_results_detailed.phase_name IS 'Nombre de la fase: e2e, load, security, etc.';
COMMENT ON COLUMN test_results_detailed.module_name IS 'Módulo testeado (NULL = global)';
COMMENT ON COLUMN test_results_detailed.status IS 'Estado: passed, failed, warning, skipped';
COMMENT ON COLUMN test_results_detailed.metrics IS 'Métricas específicas de la fase (JSON)';

-- Función helper: Obtener resultados de una ejecución agrupados por fase
CREATE OR REPLACE FUNCTION get_results_by_phase(exec_id VARCHAR)
RETURNS TABLE(
  phase_name VARCHAR,
  total_modules INTEGER,
  modules_passed INTEGER,
  modules_failed INTEGER,
  total_tests INTEGER,
  tests_passed INTEGER,
  tests_failed INTEGER,
  average_duration DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    trd.phase_name,
    COUNT(*)::INTEGER AS total_modules,
    COUNT(*) FILTER (WHERE trd.status = 'passed')::INTEGER AS modules_passed,
    COUNT(*) FILTER (WHERE trd.status = 'failed')::INTEGER AS modules_failed,
    SUM(trd.tests_passed + trd.tests_failed + trd.tests_skipped)::INTEGER AS total_tests,
    SUM(trd.tests_passed)::INTEGER AS tests_passed,
    SUM(trd.tests_failed)::INTEGER AS tests_failed,
    ROUND(AVG(trd.duration)::DECIMAL, 2) AS average_duration
  FROM test_results_detailed trd
  WHERE trd.execution_id = exec_id
  GROUP BY trd.phase_name
  ORDER BY trd.phase_name;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Obtener resultados de una ejecución agrupados por módulo
CREATE OR REPLACE FUNCTION get_results_by_module(exec_id VARCHAR)
RETURNS TABLE(
  module_name VARCHAR,
  total_phases INTEGER,
  phases_passed INTEGER,
  phases_failed INTEGER,
  total_tests INTEGER,
  tests_passed INTEGER,
  tests_failed INTEGER,
  average_duration DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    trd.module_name,
    COUNT(*)::INTEGER AS total_phases,
    COUNT(*) FILTER (WHERE trd.status = 'passed')::INTEGER AS phases_passed,
    COUNT(*) FILTER (WHERE trd.status = 'failed')::INTEGER AS phases_failed,
    SUM(trd.tests_passed + trd.tests_failed + trd.tests_skipped)::INTEGER AS total_tests,
    SUM(trd.tests_passed)::INTEGER AS tests_passed,
    SUM(trd.tests_failed)::INTEGER AS tests_failed,
    ROUND(AVG(trd.duration)::DECIMAL, 2) AS average_duration
  FROM test_results_detailed trd
  WHERE
    trd.execution_id = exec_id
    AND trd.module_name IS NOT NULL
  GROUP BY trd.module_name
  ORDER BY trd.module_name;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Health score de un módulo (últimos 30 días)
CREATE OR REPLACE FUNCTION get_module_health(
  mod_name VARCHAR,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  module_name VARCHAR,
  total_executions BIGINT,
  success_rate DECIMAL,
  average_duration DECIMAL,
  last_failure TIMESTAMP WITH TIME ZONE,
  health_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH module_stats AS (
    SELECT
      trd.module_name,
      COUNT(*) AS total_executions,
      COUNT(*) FILTER (WHERE trd.status = 'passed') AS passed_count,
      AVG(trd.duration) AS avg_duration,
      MAX(trd.created_at) FILTER (WHERE trd.status = 'failed') AS last_failure_date
    FROM test_results_detailed trd
    WHERE
      trd.module_name = mod_name
      AND trd.created_at >= CURRENT_TIMESTAMP - (days_back || ' days')::INTERVAL
    GROUP BY trd.module_name
  )
  SELECT
    ms.module_name,
    ms.total_executions,
    CASE
      WHEN ms.total_executions > 0 THEN
        ROUND((ms.passed_count::DECIMAL / ms.total_executions::DECIMAL) * 100, 2)
      ELSE 0
    END AS success_rate,
    ROUND(ms.avg_duration::DECIMAL, 2) AS average_duration,
    ms.last_failure_date,
    -- Health score: 70% success rate + 20% recency + 10% performance
    CASE
      WHEN ms.total_executions > 0 THEN
        ROUND(
          (ms.passed_count::DECIMAL / ms.total_executions::DECIMAL) * 70 +
          CASE
            WHEN ms.last_failure_date IS NULL THEN 20
            WHEN ms.last_failure_date < CURRENT_TIMESTAMP - '7 days'::INTERVAL THEN 15
            WHEN ms.last_failure_date < CURRENT_TIMESTAMP - '1 day'::INTERVAL THEN 10
            ELSE 5
          END +
          CASE
            WHEN ms.avg_duration < 5000 THEN 10
            WHEN ms.avg_duration < 10000 THEN 7
            WHEN ms.avg_duration < 30000 THEN 5
            ELSE 2
          END,
          2
        )
      ELSE 0
    END AS health_score
  FROM module_stats ms;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Detectar regresiones (comparar con ejecución baseline)
CREATE OR REPLACE FUNCTION detect_regressions(
  current_exec_id VARCHAR,
  baseline_exec_id VARCHAR
)
RETURNS TABLE(
  phase_name VARCHAR,
  module_name VARCHAR,
  baseline_passed INTEGER,
  current_passed INTEGER,
  baseline_failed INTEGER,
  current_failed INTEGER,
  is_regression BOOLEAN,
  regression_severity VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH baseline AS (
    SELECT
      phase_name,
      module_name,
      tests_passed,
      tests_failed
    FROM test_results_detailed
    WHERE execution_id = baseline_exec_id
  ),
  current AS (
    SELECT
      phase_name,
      module_name,
      tests_passed,
      tests_failed
    FROM test_results_detailed
    WHERE execution_id = current_exec_id
  )
  SELECT
    COALESCE(c.phase_name, b.phase_name) AS phase_name,
    COALESCE(c.module_name, b.module_name) AS module_name,
    COALESCE(b.tests_passed, 0) AS baseline_passed,
    COALESCE(c.tests_passed, 0) AS current_passed,
    COALESCE(b.tests_failed, 0) AS baseline_failed,
    COALESCE(c.tests_failed, 0) AS current_failed,
    (c.tests_failed > b.tests_failed OR c.tests_passed < b.tests_passed) AS is_regression,
    CASE
      WHEN c.tests_failed - b.tests_failed >= 10 THEN 'CRITICAL'
      WHEN c.tests_failed - b.tests_failed >= 5 THEN 'HIGH'
      WHEN c.tests_failed > b.tests_failed THEN 'MEDIUM'
      WHEN c.tests_passed < b.tests_passed THEN 'LOW'
      ELSE 'NONE'
    END AS regression_severity
  FROM current c
  FULL OUTER JOIN baseline b
    ON c.phase_name = b.phase_name
    AND (c.module_name = b.module_name OR (c.module_name IS NULL AND b.module_name IS NULL))
  WHERE
    c.tests_failed > b.tests_failed
    OR c.tests_passed < b.tests_passed
  ORDER BY
    CASE
      WHEN c.tests_failed - b.tests_failed >= 10 THEN 1
      WHEN c.tests_failed - b.tests_failed >= 5 THEN 2
      WHEN c.tests_failed > b.tests_failed THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Top N módulos más problemáticos
CREATE OR REPLACE FUNCTION get_top_failing_modules(
  num_modules INTEGER DEFAULT 10,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  module_name VARCHAR,
  total_failures BIGINT,
  failure_rate DECIMAL,
  last_failure TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    trd.module_name,
    COUNT(*) FILTER (WHERE trd.status = 'failed') AS total_failures,
    ROUND(
      (COUNT(*) FILTER (WHERE trd.status = 'failed')::DECIMAL / COUNT(*)::DECIMAL) * 100,
      2
    ) AS failure_rate,
    MAX(trd.created_at) FILTER (WHERE trd.status = 'failed') AS last_failure
  FROM test_results_detailed trd
  WHERE
    trd.module_name IS NOT NULL
    AND trd.created_at >= CURRENT_TIMESTAMP - (days_back || ' days')::INTERVAL
  GROUP BY trd.module_name
  HAVING COUNT(*) FILTER (WHERE trd.status = 'failed') > 0
  ORDER BY total_failures DESC, failure_rate DESC
  LIMIT num_modules;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (ajustar según tu configuración)
-- GRANT SELECT, INSERT, UPDATE ON test_results_detailed TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE test_results_detailed_id_seq TO your_app_user;
