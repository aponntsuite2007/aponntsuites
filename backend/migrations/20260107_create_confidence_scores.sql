/**
 * Migración: confidence_scores
 *
 * Tabla que almacena el confidence score calculado para cada ejecución.
 * Este score determina si el sistema está listo para producción (>= 95%).
 *
 * @version 2.0.0
 * @date 2026-01-07
 */

-- Tabla: confidence_scores
CREATE TABLE IF NOT EXISTS confidence_scores (
  id SERIAL PRIMARY KEY,

  -- FK a test_executions (execution_id UUID)
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
  -- Valores: production, high, medium, low

  -- Blockers que impiden deployment
  blockers JSONB DEFAULT '[]',
  -- Ejemplo:
  -- [
  --   {
  --     "type": "overall",
  --     "message": "Overall score 92% < 95% requerido",
  --     "severity": "critical"
  --   },
  --   {
  --     "type": "security",
  --     "message": "Security score 94% < 96% requerido",
  --     "severity": "critical"
  --   }
  -- ]

  -- Breakdown detallado del cálculo
  calculation_breakdown JSONB DEFAULT '{}',
  -- Ejemplo:
  -- {
  --   "formula": "overall = Σ(phase_score * weight)",
  --   "weights": { "e2e": 0.25, "load": 0.15, ... },
  --   "phases": {
  --     "e2e": { "score": 98.5, "weight": 0.25, "weightedScore": 24.63 },
  --     ...
  --   },
  --   "totalWeightedScore": 95.3
  -- }

  -- Timestamp
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key a test_executions
  CONSTRAINT fk_confidence_scores_execution
    FOREIGN KEY (execution_id)
    REFERENCES test_executions(execution_id)
    ON DELETE CASCADE,

  -- Constraints de validación
  CONSTRAINT check_overall_score_range
    CHECK (overall_score >= 0 AND overall_score <= 100),

  CONSTRAINT check_e2e_score_range
    CHECK (e2e_score IS NULL OR (e2e_score >= 0 AND e2e_score <= 100)),

  CONSTRAINT check_load_score_range
    CHECK (load_score IS NULL OR (load_score >= 0 AND load_score <= 100)),

  CONSTRAINT check_security_score_range
    CHECK (security_score IS NULL OR (security_score >= 0 AND security_score <= 100)),

  CONSTRAINT check_multi_tenant_score_range
    CHECK (multi_tenant_score IS NULL OR (multi_tenant_score >= 0 AND multi_tenant_score <= 100)),

  CONSTRAINT check_database_score_range
    CHECK (database_score IS NULL OR (database_score >= 0 AND database_score <= 100)),

  CONSTRAINT check_monitoring_score_range
    CHECK (monitoring_score IS NULL OR (monitoring_score >= 0 AND monitoring_score <= 100)),

  CONSTRAINT check_edge_cases_score_range
    CHECK (edge_cases_score IS NULL OR (edge_cases_score >= 0 AND edge_cases_score <= 100)),

  CONSTRAINT check_confidence_level
    CHECK (confidence_level IN ('production', 'high', 'medium', 'low'))
);

-- Índices para performance
CREATE INDEX idx_confidence_scores_execution_id ON confidence_scores(execution_id);
CREATE INDEX idx_confidence_scores_overall_score ON confidence_scores(overall_score DESC);
CREATE INDEX idx_confidence_scores_production_ready ON confidence_scores(production_ready);
CREATE INDEX idx_confidence_scores_confidence_level ON confidence_scores(confidence_level);
CREATE INDEX idx_confidence_scores_calculated_at ON confidence_scores(calculated_at DESC);

-- Índice para búsqueda de scores por fase
CREATE INDEX idx_confidence_scores_e2e ON confidence_scores(e2e_score DESC) WHERE e2e_score IS NOT NULL;
CREATE INDEX idx_confidence_scores_security ON confidence_scores(security_score DESC) WHERE security_score IS NOT NULL;
CREATE INDEX idx_confidence_scores_multi_tenant ON confidence_scores(multi_tenant_score DESC) WHERE multi_tenant_score IS NOT NULL;

-- Comentarios de tabla
COMMENT ON TABLE confidence_scores IS 'Confidence scores calculados para cada ejecución';
COMMENT ON COLUMN confidence_scores.execution_id IS 'UUID de la ejecución';
COMMENT ON COLUMN confidence_scores.overall_score IS 'Score global (0-100) - >= 95% = production ready';
COMMENT ON COLUMN confidence_scores.e2e_score IS 'Score de E2E Phase (NULL si no se ejecutó)';
COMMENT ON COLUMN confidence_scores.production_ready IS 'True si overall_score >= 95% y no hay blockers críticos';
COMMENT ON COLUMN confidence_scores.confidence_level IS 'production (>= 95%), high (>= 85%), medium (>= 70%), low (< 70%)';
COMMENT ON COLUMN confidence_scores.blockers IS 'Array JSON de blockers que impiden deployment';
COMMENT ON COLUMN confidence_scores.calculation_breakdown IS 'JSON con breakdown detallado del cálculo';

-- Función helper: Calcular confidence score para ejecución
CREATE OR REPLACE FUNCTION calculate_confidence_score(exec_id VARCHAR)
RETURNS TABLE(
  overall_score DECIMAL,
  e2e_score DECIMAL,
  load_score DECIMAL,
  security_score DECIMAL,
  multi_tenant_score DECIMAL,
  database_score DECIMAL,
  monitoring_score DECIMAL,
  edge_cases_score DECIMAL,
  production_ready BOOLEAN,
  confidence_level VARCHAR
) AS $$
DECLARE
  -- Weights (deben sumar 1.0)
  w_e2e CONSTANT DECIMAL := 0.25;
  w_load CONSTANT DECIMAL := 0.15;
  w_security CONSTANT DECIMAL := 0.20;
  w_multi_tenant CONSTANT DECIMAL := 0.15;
  w_database CONSTANT DECIMAL := 0.10;
  w_monitoring CONSTANT DECIMAL := 0.05;
  w_edge_cases CONSTANT DECIMAL := 0.10;

  v_e2e_score DECIMAL;
  v_load_score DECIMAL;
  v_security_score DECIMAL;
  v_multi_tenant_score DECIMAL;
  v_database_score DECIMAL;
  v_monitoring_score DECIMAL;
  v_edge_cases_score DECIMAL;
  v_overall_score DECIMAL := 0;
  v_total_weight DECIMAL := 0;
  v_production_ready BOOLEAN;
  v_level VARCHAR;
BEGIN
  -- Obtener scores de cada fase (calculados como passed / total * 100)
  SELECT
    MAX(CASE WHEN phase_name = 'e2e' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'load' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'security' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'multiTenant' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'database' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'monitoring' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END),
    MAX(CASE WHEN phase_name = 'edgeCases' THEN
      CASE WHEN (tests_passed + tests_failed) > 0
        THEN (tests_passed::DECIMAL / (tests_passed + tests_failed)::DECIMAL) * 100
        ELSE 0
      END
    END)
  INTO
    v_e2e_score,
    v_load_score,
    v_security_score,
    v_multi_tenant_score,
    v_database_score,
    v_monitoring_score,
    v_edge_cases_score
  FROM test_results_detailed
  WHERE execution_id = exec_id;

  -- Calcular overall score (weighted average)
  IF v_e2e_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_e2e_score * w_e2e);
    v_total_weight := v_total_weight + w_e2e;
  END IF;

  IF v_load_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_load_score * w_load);
    v_total_weight := v_total_weight + w_load;
  END IF;

  IF v_security_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_security_score * w_security);
    v_total_weight := v_total_weight + w_security;
  END IF;

  IF v_multi_tenant_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_multi_tenant_score * w_multi_tenant);
    v_total_weight := v_total_weight + w_multi_tenant;
  END IF;

  IF v_database_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_database_score * w_database);
    v_total_weight := v_total_weight + w_database;
  END IF;

  IF v_monitoring_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_monitoring_score * w_monitoring);
    v_total_weight := v_total_weight + w_monitoring;
  END IF;

  IF v_edge_cases_score IS NOT NULL THEN
    v_overall_score := v_overall_score + (v_edge_cases_score * w_edge_cases);
    v_total_weight := v_total_weight + w_edge_cases;
  END IF;

  -- Normalizar por weight usado
  IF v_total_weight > 0 THEN
    v_overall_score := (v_overall_score / v_total_weight) * v_total_weight;
  END IF;

  -- Determinar production readiness
  v_production_ready := v_overall_score >= 95;

  -- Determinar confidence level
  IF v_overall_score >= 95 THEN
    v_level := 'production';
  ELSIF v_overall_score >= 85 THEN
    v_level := 'high';
  ELSIF v_overall_score >= 70 THEN
    v_level := 'medium';
  ELSE
    v_level := 'low';
  END IF;

  RETURN QUERY
  SELECT
    ROUND(v_overall_score, 2),
    ROUND(v_e2e_score, 2),
    ROUND(v_load_score, 2),
    ROUND(v_security_score, 2),
    ROUND(v_multi_tenant_score, 2),
    ROUND(v_database_score, 2),
    ROUND(v_monitoring_score, 2),
    ROUND(v_edge_cases_score, 2),
    v_production_ready,
    v_level;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Trend de confidence score (últimos 30 días)
CREATE OR REPLACE FUNCTION get_confidence_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date DATE,
  average_score DECIMAL,
  production_ready_count BIGINT,
  total_executions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(cs.calculated_at) AS date,
    ROUND(AVG(cs.overall_score), 2) AS average_score,
    COUNT(*) FILTER (WHERE cs.production_ready = TRUE) AS production_ready_count,
    COUNT(*) AS total_executions
  FROM confidence_scores cs
  WHERE cs.calculated_at >= CURRENT_TIMESTAMP - (days_back || ' days')::INTERVAL
  GROUP BY DATE(cs.calculated_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Función helper: Comparar confidence score con baseline
CREATE OR REPLACE FUNCTION compare_confidence_with_baseline(
  current_exec_id VARCHAR,
  baseline_exec_id VARCHAR
)
RETURNS TABLE(
  phase VARCHAR,
  baseline_score DECIMAL,
  current_score DECIMAL,
  diff DECIMAL,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH baseline AS (
    SELECT
      'overall' AS phase, overall_score AS score
    FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'e2e', e2e_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'load', load_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'security', security_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'multiTenant', multi_tenant_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'database', database_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'monitoring', monitoring_score FROM confidence_scores WHERE execution_id = baseline_exec_id
    UNION ALL
    SELECT 'edgeCases', edge_cases_score FROM confidence_scores WHERE execution_id = baseline_exec_id
  ),
  current AS (
    SELECT
      'overall' AS phase, overall_score AS score
    FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'e2e', e2e_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'load', load_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'security', security_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'multiTenant', multi_tenant_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'database', database_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'monitoring', monitoring_score FROM confidence_scores WHERE execution_id = current_exec_id
    UNION ALL
    SELECT 'edgeCases', edge_cases_score FROM confidence_scores WHERE execution_id = current_exec_id
  )
  SELECT
    c.phase,
    b.score AS baseline_score,
    c.score AS current_score,
    ROUND(c.score - b.score, 2) AS diff,
    CASE
      WHEN c.score - b.score >= 5 THEN 'improved'
      WHEN c.score - b.score <= -5 THEN 'regression'
      ELSE 'stable'
    END AS status
  FROM current c
  LEFT JOIN baseline b ON c.phase = b.phase
  WHERE c.score IS NOT NULL
  ORDER BY ABS(c.score - b.score) DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-calcular confidence score al crear test_execution
-- (Opcional - o calcularlo desde JS)

-- Grant permissions (ajustar según tu configuración)
-- GRANT SELECT, INSERT, UPDATE ON confidence_scores TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE confidence_scores_id_seq TO your_app_user;
