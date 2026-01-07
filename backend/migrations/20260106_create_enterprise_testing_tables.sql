-- ============================================================================
-- ENTERPRISE TESTING TABLES - 7 Fases de Testing Profundo
-- ============================================================================
-- Fecha: 2026-01-06
-- Propósito: Tablas para almacenar resultados de testing empresarial avanzado
-- ============================================================================

-- Tabla consolidada de batches de testing
CREATE TABLE IF NOT EXISTS e2e_enterprise_test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name VARCHAR(200) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_users_generated INTEGER DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  total_vulnerabilities_found INTEGER DEFAULT 0,
  overall_status VARCHAR(50) DEFAULT 'running', -- 'running', 'passed', 'failed', 'partial'
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_e2e_batches_status ON e2e_enterprise_test_batches(overall_status);
CREATE INDEX IF NOT EXISTS idx_e2e_batches_start_time ON e2e_enterprise_test_batches(start_time DESC);

-- ============================================================================
-- FASE 1: MULTI-TENANT STRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_stress_test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stress_users_batch ON e2e_stress_test_users(batch_id);
CREATE INDEX IF NOT EXISTS idx_stress_users_company ON e2e_stress_test_users(company_id);

-- Tabla de métricas de stress testing
CREATE TABLE IF NOT EXISTS e2e_stress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2),
  unit VARCHAR(50),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stress_metrics_batch ON e2e_stress_metrics(batch_id);

-- ============================================================================
-- FASE 2: CONCURRENT OPERATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'read'
  module_name VARCHAR(100) NOT NULL,
  latency_ms INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'timeout'
  error_message TEXT,
  concurrent_users INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_batch ON e2e_performance_metrics(batch_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_module ON e2e_performance_metrics(module_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_latency ON e2e_performance_metrics(latency_ms);

-- ============================================================================
-- FASE 3: BUSINESS LOGIC VALIDATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_business_rules_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  rule_description TEXT,
  expected_behavior TEXT NOT NULL,
  actual_behavior TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  violated BOOLEAN NOT NULL,
  test_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_rules_batch ON e2e_business_rules_violations(batch_id);
CREATE INDEX IF NOT EXISTS idx_business_rules_severity ON e2e_business_rules_violations(severity);
CREATE INDEX IF NOT EXISTS idx_business_rules_violated ON e2e_business_rules_violations(violated);

-- ============================================================================
-- FASE 4: SECURITY ATTACKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  attack_type VARCHAR(100) NOT NULL, -- 'sql_injection', 'xss', 'auth_bypass', 'csrf', etc.
  module_name VARCHAR(100) NOT NULL,
  endpoint VARCHAR(200),
  payload TEXT NOT NULL,
  was_blocked BOOLEAN NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  vulnerability_severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low', NULL si bloqueado
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_vulns_batch ON e2e_security_vulnerabilities(batch_id);
CREATE INDEX IF NOT EXISTS idx_security_vulns_type ON e2e_security_vulnerabilities(attack_type);
CREATE INDEX IF NOT EXISTS idx_security_vulns_blocked ON e2e_security_vulnerabilities(was_blocked);
CREATE INDEX IF NOT EXISTS idx_security_vulns_severity ON e2e_security_vulnerabilities(vulnerability_severity);

-- ============================================================================
-- FASE 5: DATA INTEGRITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_data_integrity_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  issue_type VARCHAR(100) NOT NULL, -- 'orphan', 'duplicate', 'fk_violation', 'checksum_mismatch'
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  record_data JSONB,
  details JSONB,
  severity VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_integrity_batch ON e2e_data_integrity_issues(batch_id);
CREATE INDEX IF NOT EXISTS idx_data_integrity_type ON e2e_data_integrity_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_data_integrity_table ON e2e_data_integrity_issues(table_name);

-- ============================================================================
-- FASE 6: PERFORMANCE DEGRADATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_performance_degradation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  concurrent_users INTEGER NOT NULL,
  latency_p50_ms INTEGER,
  latency_p95_ms INTEGER,
  latency_p99_ms INTEGER,
  throughput_rps DECIMAL(10,2),
  error_rate_percent DECIMAL(5,2),
  db_connections_used INTEGER,
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_degradation_batch ON e2e_performance_degradation(batch_id);
CREATE INDEX IF NOT EXISTS idx_perf_degradation_users ON e2e_performance_degradation(concurrent_users);

-- ============================================================================
-- FASE 7: CHAOS ENGINEERING
-- ============================================================================
CREATE TABLE IF NOT EXISTS e2e_chaos_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  scenario_type VARCHAR(100) NOT NULL, -- 'db_failure', 'network_latency', 'memory_leak', 'disk_full', 'concurrent_deploy'
  scenario_description TEXT,
  duration_seconds INTEGER NOT NULL,
  system_recovered BOOLEAN NOT NULL,
  recovery_time_seconds INTEGER,
  data_loss_occurred BOOLEAN DEFAULT FALSE,
  errors_during_chaos INTEGER DEFAULT 0,
  error_details JSONB,
  metrics_before JSONB,
  metrics_after JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chaos_batch ON e2e_chaos_scenarios(batch_id);
CREATE INDEX IF NOT EXISTS idx_chaos_type ON e2e_chaos_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_chaos_recovered ON e2e_chaos_scenarios(system_recovered);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Función para obtener resumen de un batch
CREATE OR REPLACE FUNCTION get_enterprise_test_summary(batch_uuid UUID)
RETURNS TABLE (
  phase VARCHAR(50),
  total_tests INTEGER,
  passed INTEGER,
  failed INTEGER,
  critical_issues INTEGER
) AS $$
BEGIN
  -- FASE 1: Stress
  RETURN QUERY
  SELECT
    'FASE 1: Multi-tenant Stress'::VARCHAR(50),
    COUNT(*)::INTEGER as total_tests,
    COUNT(*) FILTER (WHERE metric_value > 0)::INTEGER as passed,
    0::INTEGER as failed,
    0::INTEGER as critical_issues
  FROM e2e_stress_metrics
  WHERE batch_id = batch_uuid;

  -- FASE 2: Performance
  RETURN QUERY
  SELECT
    'FASE 2: Concurrent Operations'::VARCHAR(50),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE status = 'success')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER,
    0::INTEGER
  FROM e2e_performance_metrics
  WHERE batch_id = batch_uuid;

  -- FASE 3: Business Logic
  RETURN QUERY
  SELECT
    'FASE 3: Business Logic'::VARCHAR(50),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE NOT violated)::INTEGER,
    COUNT(*) FILTER (WHERE violated)::INTEGER,
    COUNT(*) FILTER (WHERE violated AND severity = 'critical')::INTEGER
  FROM e2e_business_rules_violations
  WHERE batch_id = batch_uuid;

  -- FASE 4: Security
  RETURN QUERY
  SELECT
    'FASE 4: Security Attacks'::VARCHAR(50),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE was_blocked)::INTEGER,
    COUNT(*) FILTER (WHERE NOT was_blocked)::INTEGER,
    COUNT(*) FILTER (WHERE NOT was_blocked AND vulnerability_severity = 'critical')::INTEGER
  FROM e2e_security_vulnerabilities
  WHERE batch_id = batch_uuid;

  -- FASE 5: Data Integrity
  RETURN QUERY
  SELECT
    'FASE 5: Data Integrity'::VARCHAR(50),
    COUNT(*)::INTEGER,
    0::INTEGER,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER
  FROM e2e_data_integrity_issues
  WHERE batch_id = batch_uuid;

  -- FASE 6: Performance Degradation
  RETURN QUERY
  SELECT
    'FASE 6: Performance Degradation'::VARCHAR(50),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE latency_p95_ms < 2000)::INTEGER,
    COUNT(*) FILTER (WHERE latency_p95_ms >= 2000)::INTEGER,
    COUNT(*) FILTER (WHERE latency_p95_ms >= 5000)::INTEGER
  FROM e2e_performance_degradation
  WHERE batch_id = batch_uuid;

  -- FASE 7: Chaos
  RETURN QUERY
  SELECT
    'FASE 7: Chaos Engineering'::VARCHAR(50),
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE system_recovered)::INTEGER,
    COUNT(*) FILTER (WHERE NOT system_recovered)::INTEGER,
    COUNT(*) FILTER (WHERE NOT system_recovered OR data_loss_occurred)::INTEGER
  FROM e2e_chaos_scenarios
  WHERE batch_id = batch_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (si se usan roles específicos)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_user;
-- GRANT EXECUTE ON FUNCTION get_enterprise_test_summary(UUID) TO backend_user;

-- ============================================================================
-- COMENTARIOS EN TABLAS
-- ============================================================================
COMMENT ON TABLE e2e_enterprise_test_batches IS 'Batches de testing empresarial - agrupa ejecuciones de las 7 fases';
COMMENT ON TABLE e2e_stress_test_users IS 'FASE 1: Usuarios generados para stress testing multi-tenant';
COMMENT ON TABLE e2e_performance_metrics IS 'FASE 2: Métricas de operaciones concurrentes';
COMMENT ON TABLE e2e_business_rules_violations IS 'FASE 3: Violaciones de reglas de negocio detectadas';
COMMENT ON TABLE e2e_security_vulnerabilities IS 'FASE 4: Vulnerabilidades de seguridad encontradas';
COMMENT ON TABLE e2e_data_integrity_issues IS 'FASE 5: Problemas de integridad de datos';
COMMENT ON TABLE e2e_performance_degradation IS 'FASE 6: Degradación de performance bajo carga incremental';
COMMENT ON TABLE e2e_chaos_scenarios IS 'FASE 7: Escenarios de chaos engineering y recuperación';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
