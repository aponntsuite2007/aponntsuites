/**
 * AUTONOMOUS QA SYSTEM - Database Tables
 *
 * Tablas para almacenar estadísticas y fallos del sistema autónomo de QA
 *
 * INSTALACIÓN:
 *   psql -U postgres -d attendance_system -f 20251226_create_autonomous_qa_tables.sql
 */

-- ============================================================================
-- AUTONOMOUS QA STATS (estadísticas de testing continuo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autonomous_qa_stats (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modules_tested INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,  -- 0.00-100.00
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(timestamp)  -- Evitar duplicados
);

CREATE INDEX idx_autonomous_qa_stats_timestamp
  ON autonomous_qa_stats(timestamp DESC);

COMMENT ON TABLE autonomous_qa_stats IS 'Estadísticas de cada ronda de Chaos Testing';

-- ============================================================================
-- AUTONOMOUS QA FAILURES (fallos detectados)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autonomous_qa_failures (
  id SERIAL PRIMARY KEY,
  module_key VARCHAR(100) NOT NULL,
  failure_type VARCHAR(50) NOT NULL,  -- FAILED, ERROR, TIMEOUT
  error_message TEXT,
  stdout TEXT,
  stderr TEXT,
  is_known_issue BOOLEAN DEFAULT false,
  auto_fixed BOOLEAN DEFAULT false,
  fix_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autonomous_qa_failures_module
  ON autonomous_qa_failures(module_key, created_at DESC);

CREATE INDEX idx_autonomous_qa_failures_unresolved
  ON autonomous_qa_failures(created_at DESC)
  WHERE auto_fixed = false;

COMMENT ON TABLE autonomous_qa_failures IS 'Registro de todos los fallos detectados por Chaos Testing';

-- ============================================================================
-- AUTONOMOUS QA HEALINGS (auto-reparaciones aplicadas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autonomous_qa_healings (
  id SERIAL PRIMARY KEY,
  failure_id INTEGER REFERENCES autonomous_qa_failures(id),
  healing_type VARCHAR(100) NOT NULL,  -- restart_service, clear_cache, fix_syntax, etc.
  healing_description TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autonomous_qa_healings_failure
  ON autonomous_qa_healings(failure_id);

CREATE INDEX idx_autonomous_qa_healings_success
  ON autonomous_qa_healings(applied_at DESC)
  WHERE success = true;

COMMENT ON TABLE autonomous_qa_healings IS 'Registro de auto-reparaciones aplicadas por el sistema';

-- ============================================================================
-- AUTONOMOUS QA HEALTH (snapshots de salud del sistema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autonomous_qa_health (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Database health
  db_active_connections INTEGER,
  db_total_connections INTEGER,
  db_max_connections INTEGER,
  db_pool_usage_percent DECIMAL(5,2),

  -- Memory health
  memory_total BIGINT,
  memory_used BIGINT,
  memory_free BIGINT,
  memory_usage_percent DECIMAL(5,2),

  -- CPU health
  cpu_cores INTEGER,
  cpu_usage_percent DECIMAL(5,2),

  -- Overall health
  is_healthy BOOLEAN NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autonomous_qa_health_timestamp
  ON autonomous_qa_health(timestamp DESC);

CREATE INDEX idx_autonomous_qa_health_unhealthy
  ON autonomous_qa_health(timestamp DESC)
  WHERE is_healthy = false;

COMMENT ON TABLE autonomous_qa_health IS 'Snapshots de salud del sistema cada 5 minutos';

-- ============================================================================
-- FUNCTIONS: Helper queries
-- ============================================================================

-- Function: Get success rate últimas 24 horas
CREATE OR REPLACE FUNCTION get_autonomous_qa_success_rate_24h()
RETURNS TABLE(
  avg_success_rate DECIMAL,
  total_modules_tested INTEGER,
  total_passed INTEGER,
  total_failed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(success_rate) AS avg_success_rate,
    SUM(modules_tested)::INTEGER AS total_modules_tested,
    SUM(passed)::INTEGER AS total_passed,
    SUM(failed)::INTEGER AS total_failed
  FROM autonomous_qa_stats
  WHERE timestamp >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function: Get módulos con más fallos
CREATE OR REPLACE FUNCTION get_autonomous_qa_failing_modules(days INTEGER DEFAULT 7)
RETURNS TABLE(
  module_key VARCHAR,
  failure_count BIGINT,
  last_failure TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.module_key,
    COUNT(*) AS failure_count,
    MAX(f.created_at) AS last_failure
  FROM autonomous_qa_failures f
  WHERE f.created_at >= NOW() - (days || ' days')::INTERVAL
  GROUP BY f.module_key
  ORDER BY failure_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function: Get stats de auto-healing
CREATE OR REPLACE FUNCTION get_autonomous_qa_healing_stats(days INTEGER DEFAULT 7)
RETURNS TABLE(
  total_healings BIGINT,
  successful_healings BIGINT,
  failed_healings BIGINT,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_healings,
    COUNT(*) FILTER (WHERE success = true) AS successful_healings,
    COUNT(*) FILTER (WHERE success = false) AS failed_healings,
    (COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100 AS success_rate
  FROM autonomous_qa_healings
  WHERE applied_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verificación
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Autonomous QA tables created successfully';
  RAISE NOTICE '   - autonomous_qa_stats';
  RAISE NOTICE '   - autonomous_qa_failures';
  RAISE NOTICE '   - autonomous_qa_healings';
  RAISE NOTICE '   - autonomous_qa_health';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '   - get_autonomous_qa_success_rate_24h()';
  RAISE NOTICE '   - get_autonomous_qa_failing_modules(days)';
  RAISE NOTICE '   - get_autonomous_qa_healing_stats(days)';
END $$;
