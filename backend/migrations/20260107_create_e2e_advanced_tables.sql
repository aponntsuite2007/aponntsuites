/**
 * Migración: E2E Advanced Testing Tables
 *
 * Crea las 3 tablas del sistema E2E Advanced Testing con nombres específicos
 * para evitar conflictos con tablas existentes.
 *
 * @version 2.0.0
 * @date 2026-01-07
 */

-- =============================================================================
-- TABLA 1: e2e_advanced_executions
-- =============================================================================

CREATE TABLE IF NOT EXISTS e2e_advanced_executions (
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

  -- Módulos testeados (array JSON)
  modules_tested JSONB DEFAULT '[]',

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
  user_id UUID,

  -- Empresa que ejecutó (FK a companies)
  company_id INTEGER,

  -- Metadata adicional
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Foreign keys
  CONSTRAINT fk_e2e_executions_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_e2e_executions_company
    FOREIGN KEY (company_id)
    REFERENCES companies(company_id)
    ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_e2e_exec_execution_id ON e2e_advanced_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_e2e_exec_status ON e2e_advanced_executions(status);
CREATE INDEX IF NOT EXISTS idx_e2e_exec_company_id ON e2e_advanced_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_e2e_exec_created_at ON e2e_advanced_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_exec_overall_score ON e2e_advanced_executions(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_exec_production_ready ON e2e_advanced_executions(production_ready);

COMMENT ON TABLE e2e_advanced_executions IS 'Ejecuciones de E2E Advanced Testing System (7 phases)';

-- =============================================================================
-- TABLA 2: e2e_test_results_detailed
-- =============================================================================

CREATE TABLE IF NOT EXISTS e2e_test_results_detailed (
  id SERIAL PRIMARY KEY,

  -- FK a e2e_advanced_executions (execution_id UUID)
  execution_id VARCHAR(36) NOT NULL,

  -- Fase ejecutada
  phase_name VARCHAR(50) NOT NULL,

  -- Módulo testeado (NULL si la fase no se ejecuta por módulo)
  module_name VARCHAR(100),

  -- Estado del test
  status VARCHAR(20) NOT NULL,

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

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_e2e_results_execution
    FOREIGN KEY (execution_id)
    REFERENCES e2e_advanced_executions(execution_id)
    ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_e2e_results_execution_id ON e2e_test_results_detailed(execution_id);
CREATE INDEX IF NOT EXISTS idx_e2e_results_phase_name ON e2e_test_results_detailed(phase_name);
CREATE INDEX IF NOT EXISTS idx_e2e_results_module_name ON e2e_test_results_detailed(module_name);
CREATE INDEX IF NOT EXISTS idx_e2e_results_status ON e2e_test_results_detailed(status);

COMMENT ON TABLE e2e_test_results_detailed IS 'Resultados detallados por fase/módulo de E2E Advanced';

-- =============================================================================
-- TABLA 3: e2e_confidence_scores
-- =============================================================================

CREATE TABLE IF NOT EXISTS e2e_confidence_scores (
  id SERIAL PRIMARY KEY,

  -- FK a e2e_advanced_executions (execution_id UUID)
  execution_id VARCHAR(36) NOT NULL UNIQUE,

  -- Overall confidence score (0-100)
  overall_score DECIMAL(5, 2) NOT NULL,

  -- Scores por fase (0-100, NULL si no se ejecutó)
  e2e_score DECIMAL(5, 2),
  load_score DECIMAL(5, 2),
  security_score DECIMAL(5, 2),
  multi_tenant_score DECIMAL(5, 2),
  database_score DECIMAL(5, 2),
  monitoring_score DECIMAL(5, 2),
  edge_cases_score DECIMAL(5, 2),

  -- Production readiness flag
  production_ready BOOLEAN NOT NULL DEFAULT FALSE,

  -- Confidence level
  confidence_level VARCHAR(20) NOT NULL,

  -- Blockers que impiden deployment
  blockers JSONB DEFAULT '[]',

  -- Breakdown detallado del cálculo
  calculation_breakdown JSONB DEFAULT '{}',

  -- Timestamp
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_e2e_confidence_execution
    FOREIGN KEY (execution_id)
    REFERENCES e2e_advanced_executions(execution_id)
    ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT check_overall_score_range
    CHECK (overall_score >= 0 AND overall_score <= 100),

  CONSTRAINT check_confidence_level
    CHECK (confidence_level IN ('production', 'high', 'medium', 'low'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_e2e_confidence_execution_id ON e2e_confidence_scores(execution_id);
CREATE INDEX IF NOT EXISTS idx_e2e_confidence_overall_score ON e2e_confidence_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_confidence_production_ready ON e2e_confidence_scores(production_ready);

COMMENT ON TABLE e2e_confidence_scores IS 'Confidence scores de E2E Advanced (0-100%, >= 95% = production ready)';

-- =============================================================================
-- FUNCIONES HELPER
-- =============================================================================

-- Función: Obtener resumen de ejecución
CREATE OR REPLACE FUNCTION get_e2e_execution_summary(exec_id VARCHAR)
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
  FROM e2e_advanced_executions te
  WHERE te.execution_id = exec_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener últimas N ejecuciones
CREATE OR REPLACE FUNCTION get_e2e_recent_executions(
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
  FROM e2e_advanced_executions te
  WHERE
    (filter_company_id IS NULL OR te.company_id = filter_company_id)
  ORDER BY te.created_at DESC
  LIMIT num_executions;
END;
$$ LANGUAGE plpgsql;

-- Función: Health score de un módulo (últimos 30 días)
CREATE OR REPLACE FUNCTION get_e2e_module_health(
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
    FROM e2e_test_results_detailed trd
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

-- Trigger: Actualizar completed_at cuando status cambia a terminal
CREATE OR REPLACE FUNCTION update_e2e_execution_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('passed', 'failed', 'cancelled') AND OLD.status = 'running' THEN
    NEW.completed_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_e2e_execution_completed_at ON e2e_advanced_executions;
CREATE TRIGGER trigger_update_e2e_execution_completed_at
  BEFORE UPDATE ON e2e_advanced_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_e2e_execution_completed_at();

-- =============================================================================
-- FIN DE MIGRACIONES
-- =============================================================================

SELECT 'E2E Advanced Testing tables created successfully' AS message;
