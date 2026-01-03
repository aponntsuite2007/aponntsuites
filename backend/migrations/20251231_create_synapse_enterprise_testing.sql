-- ============================================================================
-- SYNAPSE ENTERPRISE TESTING - 7 TABLAS PARA TESTING PROFUNDO
-- Fecha: 2025-12-31
-- Descripcion: Tablas para las 7 fases de testing empresarial
-- ============================================================================

-- TABLA PRINCIPAL: Batches de testing enterprise
CREATE TABLE IF NOT EXISTS e2e_enterprise_test_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name VARCHAR(200),
  level INTEGER DEFAULT 3, -- 1=quick, 2=deep, 3=enterprise
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_users_generated INTEGER DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  total_vulnerabilities_found INTEGER DEFAULT 0,
  phases_completed JSONB DEFAULT '[]'::jsonb,
  overall_status VARCHAR(50) DEFAULT 'running', -- 'running', 'passed', 'failed', 'partial'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FASE 1: Multi-tenant stress testing
CREATE TABLE IF NOT EXISTS e2e_stress_test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  company_id INTEGER,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role VARCHAR(50), -- 'employee', 'admin', 'vendor'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stress_users_batch ON e2e_stress_test_users(batch_id);
CREATE INDEX IF NOT EXISTS idx_stress_users_company ON e2e_stress_test_users(company_id);

-- FASE 2: Performance metrics (operaciones concurrentes)
CREATE TABLE IF NOT EXISTS e2e_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  operation_type VARCHAR(50), -- 'create', 'update', 'delete', 'read'
  module_name VARCHAR(100),
  endpoint VARCHAR(255),
  latency_ms INTEGER,
  status VARCHAR(20), -- 'success', 'failed', 'timeout'
  error_message TEXT,
  concurrent_users INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_batch ON e2e_performance_metrics(batch_id);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_module ON e2e_performance_metrics(module_name);

-- FASE 3: Business rules violations
CREATE TABLE IF NOT EXISTS e2e_business_rules_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  module_name VARCHAR(100),
  rule_name VARCHAR(200),
  rule_description TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  test_data JSONB,
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  violated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_rules_batch ON e2e_business_rules_violations(batch_id);
CREATE INDEX IF NOT EXISTS idx_business_rules_severity ON e2e_business_rules_violations(severity) WHERE violated = true;

-- FASE 4: Security vulnerabilities
CREATE TABLE IF NOT EXISTS e2e_security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  attack_type VARCHAR(100), -- 'sql_injection', 'xss', 'csrf', 'auth_bypass', 'authz_bypass'
  module_name VARCHAR(100),
  endpoint VARCHAR(255),
  payload TEXT,
  was_blocked BOOLEAN,
  response_status INTEGER,
  response_body TEXT,
  vulnerability_severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_batch ON e2e_security_vulnerabilities(batch_id);
CREATE INDEX IF NOT EXISTS idx_security_blocked ON e2e_security_vulnerabilities(was_blocked);

-- FASE 5: Data integrity issues
CREATE TABLE IF NOT EXISTS e2e_data_integrity_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  issue_type VARCHAR(100), -- 'orphan', 'duplicate', 'fk_violation', 'checksum_mismatch'
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  details JSONB,
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_batch ON e2e_data_integrity_issues(batch_id);
CREATE INDEX IF NOT EXISTS idx_integrity_type ON e2e_data_integrity_issues(issue_type);

-- FASE 6: Performance degradation metrics
CREATE TABLE IF NOT EXISTS e2e_performance_degradation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  concurrent_users INTEGER,
  latency_p50_ms INTEGER,
  latency_p95_ms INTEGER,
  latency_p99_ms INTEGER,
  throughput_rps DECIMAL(10,2),
  error_rate_percent DECIMAL(5,2),
  db_connections_used INTEGER,
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_degrad_batch ON e2e_performance_degradation(batch_id);

-- FASE 7: Chaos engineering scenarios
CREATE TABLE IF NOT EXISTS e2e_chaos_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES e2e_enterprise_test_batches(id) ON DELETE CASCADE,
  scenario_type VARCHAR(100), -- 'db_failure', 'network_latency', 'memory_pressure', 'disk_full', 'concurrent_deploy'
  scenario_config JSONB,
  duration_seconds INTEGER,
  system_recovered BOOLEAN,
  recovery_time_seconds INTEGER,
  data_loss_occurred BOOLEAN DEFAULT false,
  errors_during_chaos INTEGER DEFAULT 0,
  requests_lost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chaos_batch ON e2e_chaos_scenarios(batch_id);
CREATE INDEX IF NOT EXISTS idx_chaos_recovered ON e2e_chaos_scenarios(system_recovered);

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Funcion para obtener resumen de un batch
CREATE OR REPLACE FUNCTION get_enterprise_batch_summary(p_batch_id UUID)
RETURNS TABLE (
  phase_name VARCHAR,
  total_tests INTEGER,
  passed INTEGER,
  failed INTEGER,
  pass_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Phase 1: Stress Users'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_stress_test_users WHERE batch_id = p_batch_id),
         (SELECT COUNT(*)::INTEGER FROM e2e_stress_test_users WHERE batch_id = p_batch_id),
         0::INTEGER,
         100.0::DECIMAL
  UNION ALL
  SELECT 'Phase 2: Performance'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_performance_metrics WHERE batch_id = p_batch_id),
         (SELECT COUNT(*)::INTEGER FROM e2e_performance_metrics WHERE batch_id = p_batch_id AND status = 'success'),
         (SELECT COUNT(*)::INTEGER FROM e2e_performance_metrics WHERE batch_id = p_batch_id AND status = 'failed'),
         COALESCE((SELECT COUNT(*)::DECIMAL * 100 / NULLIF(COUNT(*), 0) FROM e2e_performance_metrics WHERE batch_id = p_batch_id AND status = 'success'), 0)
  UNION ALL
  SELECT 'Phase 3: Business Rules'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_business_rules_violations WHERE batch_id = p_batch_id),
         (SELECT COUNT(*)::INTEGER FROM e2e_business_rules_violations WHERE batch_id = p_batch_id AND violated = false),
         (SELECT COUNT(*)::INTEGER FROM e2e_business_rules_violations WHERE batch_id = p_batch_id AND violated = true),
         COALESCE((SELECT COUNT(*)::DECIMAL * 100 / NULLIF(COUNT(*), 0) FROM e2e_business_rules_violations WHERE batch_id = p_batch_id AND violated = false), 0)
  UNION ALL
  SELECT 'Phase 4: Security'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_security_vulnerabilities WHERE batch_id = p_batch_id),
         (SELECT COUNT(*)::INTEGER FROM e2e_security_vulnerabilities WHERE batch_id = p_batch_id AND was_blocked = true),
         (SELECT COUNT(*)::INTEGER FROM e2e_security_vulnerabilities WHERE batch_id = p_batch_id AND was_blocked = false),
         COALESCE((SELECT COUNT(*)::DECIMAL * 100 / NULLIF(COUNT(*), 0) FROM e2e_security_vulnerabilities WHERE batch_id = p_batch_id AND was_blocked = true), 0)
  UNION ALL
  SELECT 'Phase 5: Data Integrity'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_data_integrity_issues WHERE batch_id = p_batch_id),
         0::INTEGER,
         (SELECT COUNT(*)::INTEGER FROM e2e_data_integrity_issues WHERE batch_id = p_batch_id),
         CASE WHEN (SELECT COUNT(*) FROM e2e_data_integrity_issues WHERE batch_id = p_batch_id) = 0 THEN 100.0 ELSE 0.0 END
  UNION ALL
  SELECT 'Phase 7: Chaos'::VARCHAR,
         (SELECT COUNT(*)::INTEGER FROM e2e_chaos_scenarios WHERE batch_id = p_batch_id),
         (SELECT COUNT(*)::INTEGER FROM e2e_chaos_scenarios WHERE batch_id = p_batch_id AND system_recovered = true),
         (SELECT COUNT(*)::INTEGER FROM e2e_chaos_scenarios WHERE batch_id = p_batch_id AND system_recovered = false),
         COALESCE((SELECT COUNT(*)::DECIMAL * 100 / NULLIF(COUNT(*), 0) FROM e2e_chaos_scenarios WHERE batch_id = p_batch_id AND system_recovered = true), 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE e2e_enterprise_test_batches IS 'Batches principales de testing enterprise SYNAPSE Level 3';
COMMENT ON TABLE e2e_stress_test_users IS 'FASE 1: Usuarios generados para stress testing multi-tenant';
COMMENT ON TABLE e2e_performance_metrics IS 'FASE 2: Metricas de operaciones concurrentes';
COMMENT ON TABLE e2e_business_rules_violations IS 'FASE 3: Violaciones de reglas de negocio detectadas';
COMMENT ON TABLE e2e_security_vulnerabilities IS 'FASE 4: Vulnerabilidades de seguridad encontradas';
COMMENT ON TABLE e2e_data_integrity_issues IS 'FASE 5: Problemas de integridad de datos';
COMMENT ON TABLE e2e_performance_degradation IS 'FASE 6: Metricas de degradacion bajo carga';
COMMENT ON TABLE e2e_chaos_scenarios IS 'FASE 7: Resultados de escenarios de chaos engineering';
